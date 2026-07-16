import { describe, expect, it } from "vitest";
import type { GaugeInput, Pricing, UsageEvent } from "../types";
import { buildGauge } from "./build-gauge";

const pricing: Pricing = {
  updated: "2026-07-15",
  models: {
    opus: { input: 15, output: 75, cacheRead: 1.5, cacheWrite5m: 18.75, cacheWrite1h: 30 },
  },
  match: [{ pattern: "opus", family: "opus" }],
  subscriptions: { max20x: 200 },
  activePlan: "max20x",
  subscriptionPeriodDays: 30.44,
  ratioThresholds: { underuse: 0.5, breakEven: 1.1 },
  projection: { lookbackWeeks: 4 },
  pace: {
    recentWindowHours: 1,
    thresholds: { underfarm: 0.5, slow: 0.85, fast: 1.15, redline: 1.5, blown: 2 },
  },
};

const NOW = 1_700_000_000_000;
const event = (over: Partial<UsageEvent>): UsageEvent => ({
  uuid: "u",
  timestamp: NOW,
  model: "claude-opus-4-8",
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite5m: 0,
  cacheWrite1h: 0,
  ...over,
});

// One opus turn worth exactly $75 of API value, sent 30 min ago (inside the 1h
// recent window, but BEFORE the signal was captured so it doesn't advance the %);
// a live 7-day constraint at 39%, resetting in 40h; calibrated from a single real
// window ($2709.47 @ 39% → $69.47/pct).
const input: GaugeInput = {
  tool: "claude",
  window: "seven_day",
  now: NOW,
  capturedAt: NOW,
  pricing,
  planLabel: "Max 20×",
  events: [event({ output: 1_000_000, timestamp: NOW - 1_800_000 })],
  constraints: [
    {
      key: "seven_day",
      label: "Weekly",
      usedPercent: 39,
      resetsAt: NOW + 40 * 3_600_000,
      windowSeconds: 7 * 86_400,
    },
  ],
  windowSeconds: 7 * 86_400,
  calibration: {
    samples: [{ apiValue: 2709.47, pctConsumed: 39 }],
    instant: { apiValue: 75, pctConsumed: 39 },
    activeHourRates: [1, 2, 3], // median → habitual 2%/h
  },
};

describe("buildGauge (speedometer orchestration)", () => {
  const r = buildGauge(input);

  it("carries the profitability flex figures", () => {
    expect(r.apiValue).toBeCloseTo(75, 6);
    expect(r.ratio).toBeCloseTo(75 / 45.9921, 4); // vs the whole-window sub cost
    expect(r.breakEvenRatio).toBe(1.1);
    expect(r.calibrated).toBe(true);
  });

  it("derives the three rates in percent-of-cap per hour", () => {
    // headroom 61% over 40h left = 1.525%/h is the maxxing rate
    expect(r.sustainableRatePct).toBeCloseTo(1.525, 6);
    // $75 in the last hour ÷ $69.47/pct = 1.0795%/h live burn
    expect(r.recentRatePct).toBeCloseTo(75 / (2709.47 / 39), 4);
    expect(r.habitualRatePct).toBeCloseTo(2, 6); // p50 of [1,2,3]
  });

  it("turns those rates into a needle and a ghost pace", () => {
    expect(r.pace).toBeCloseTo(1.07954 / 1.525, 4); // ≈ 0.708, coasting
    expect(r.habitualPace).toBeCloseTo(2 / 1.525, 4); // ≈ 1.31, habitually redlining
    expect(r.zone).toBe("profitable"); // needle sits in the coasting band
  });

  it("projects where the live pace lands you at reset", () => {
    expect(r.currentPct).toBe(39);
    expect(r.landingPct).toBeCloseTo(39 + (75 / (2709.47 / 39)) * 40, 2); // ≈ 82
    expect(r.hoursUntilReset).toBeCloseTo(40, 6);
    expect(r.signalAvailable).toBe(true);
  });

  it("advances the % locally with burn since the signal was captured", () => {
    const withBurn = buildGauge({
      ...input,
      capturedAt: NOW - 120_000, // the API reading is 2 min old
      events: [
        ...input.events,
        event({ output: 1_000_000, timestamp: NOW - 60_000 }), // $75 burned since capture
      ],
    });
    // livePct = 39 + 75 / 69.47 ≈ 40.08, so the maxxing (sustainable) rate drops
    expect(withBurn.sustainableRatePct).toBeLessThan(r.sustainableRatePct);
    expect(withBurn.sustainableRatePct).toBeCloseTo((100 - (39 + 75 / (2709.47 / 39))) / 40, 4);
    expect(withBurn.currentPct).toBe(39); // the raw bar still shows the exact API anchor
  });

  it("forces the capped zone once usage hits 100%, whatever the pace", () => {
    const capped = buildGauge({
      ...input,
      constraints: [{ ...input.constraints[0], usedPercent: 100 }],
    });
    expect(capped.zone).toBe("over");
    expect(capped.sustainableRatePct).toBe(0);
  });

  it("degrades cleanly when the usage signal is absent", () => {
    const blind = buildGauge({ ...input, constraints: [] });
    expect(blind.signalAvailable).toBe(false);
    expect(blind.currentPct).toBe(0);
    expect(blind.pace).toBe(0); // no time left to reset ⇒ sustainable ∞ ⇒ pace 0
    expect(blind.zone).toBe("underuse");
    expect(Number.isNaN(blind.landingPct)).toBe(false);
  });
});
