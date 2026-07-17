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
    thresholds: { coasting: 0.5, maxxing: 0.85, redlining: 1.15, turbo: 1.5, nitro: 2 },
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
  crossWindows: [], // no other cap in play by default
  workHoursPerDay: 24, // round-the-clock: the neutral, wall-clock baseline
  readoutWindowHours: 1, // live window; matches smoothWindowHours so the two agree
  smoothWindowHours: 1, // smooth window; equal to readout so live and smooth land identically
  calibration: {
    samples: [{ apiValue: 2709.47, pctConsumed: 39 }],
    instant: { apiValue: 75, pctConsumed: 39 },
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
    // $75 in the last hour ÷ $69.47/pct = 1.0795%/h smoothed burn
    expect(r.smoothRatePct).toBeCloseTo(75 / (2709.47 / 39), 4);
  });

  it("turns those rates into a needle pace", () => {
    expect(r.pace).toBeCloseTo(1.07954 / 1.525, 4); // ≈ 0.708, coasting
    expect(r.zone).toBe("coasting"); // needle sits in the coasting band
  });

  it("gives live and smooth pace the same value when the windows match", () => {
    // Fixture keeps readoutWindowHours === smoothWindowHours, so the two
    // smoothings see the same burn and land identically.
    expect(r.smoothPace).toBeCloseTo(r.pace, 6);
    expect(r.smoothZone).toBe(r.zone);
  });

  it("drops the LIVE pace to 0 when idle while SMOOTH still remembers the burn", () => {
    // The only event is 30 min old; a 36-second readout window sees nothing, so
    // the live pace (and its zone) ease to 0, while the smooth pace — on the 1h
    // window — still holds. This is exactly the live-vs-smooth split, made explicit.
    const idle = buildGauge({ ...input, readoutWindowHours: 0.01 });
    expect(idle.pace).toBe(0); // live needle/zone/center drop together
    expect(idle.zone).toBe("underfarming");
    expect(idle.smoothPace).toBeCloseTo(r.pace, 6); // smooth window unchanged → holds
    expect(idle.smoothZone).toBe("coasting");
  });

  it("projects where the live pace lands you at reset", () => {
    expect(r.currentPct).toBe(39);
    expect(r.landingPct).toBeCloseTo(39 + (75 / (2709.47 / 39)) * 40, 2); // ≈ 82
    expect(r.hoursUntilReset).toBeCloseTo(40, 6);
    expect(r.signalAvailable).toBe(true);
  });

  it("projects the landing over ACTIVE hours, the same horizon pace normalizes by", () => {
    // With an 8h workday the weekly headroom spreads over 8/24 of the wall
    // clock. The landing MUST compress the same way, or the dial reads
    // "underfarming" while the bar predicts capping — the bug this guards.
    const compressed = buildGauge({ ...input, workHoursPerDay: 8 });
    const readoutPct = 75 / (2709.47 / 39); // ≈ 1.0795 %/h
    const activeHoursLeft = 40 * (8 / 24); // ≈ 13.33h
    expect(compressed.landingPct).toBeCloseTo(39 + readoutPct * activeHoursLeft, 2); // ≈ 53
    expect(compressed.landingPct).toBeLessThan(r.landingPct); // shorter horizon ⇒ lands lower
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

  it("anchors the maxxing rate on active hours for a MULTI-DAY window", () => {
    // Weekly window: 8h/day spreads the same 61% headroom over a third of the
    // hours, so the sustainable rate triples and the pace drops to a third.
    const worked = buildGauge({ ...input, workHoursPerDay: 8 });
    expect(worked.sustainableRatePct).toBeCloseTo(r.sustainableRatePct * 3, 4);
    expect(worked.pace).toBeCloseTo(r.pace / 3, 4);
    // The smooth pace rides the same sustainable rate, so it scales in lockstep.
    expect(worked.smoothPace).toBeCloseTo(r.smoothPace / 3, 4);
  });

  it("keeps a SUB-DAY window on the wall clock (5h ignores work hours)", () => {
    // The rolling 5h cap resets before you'd sleep, so work hours must not shrink
    // its hours-left — else its pace reads "slow" while the projection says capped.
    const fiveHour = {
      ...input,
      windowSeconds: 5 * 3_600,
      constraints: [
        { ...input.constraints[0], windowSeconds: 5 * 3_600, resetsAt: NOW + 2 * 3_600_000 },
      ],
    };
    const at24 = buildGauge({ ...fiveHour, workHoursPerDay: 24 });
    const at8 = buildGauge({ ...fiveHour, workHoursPerDay: 8 });
    expect(at8.sustainableRatePct).toBeCloseTo(at24.sustainableRatePct, 6);
    expect(at8.pace).toBeCloseTo(at24.pace, 6);
  });

  it("binds the maxxing rate on a tighter cross-window cap (the 5h wall)", () => {
    // A near-full 5h cap ($20 spent to reach 80%, 1h left) is much tighter than
    // the weekly window, so it lowers the sustainable rate and lifts the pace.
    const bound = buildGauge({
      ...input,
      crossWindows: [
        { usedPct: 80, resetsAt: NOW + 3_600_000, apiValue: 20, windowSeconds: 5 * 3_600 },
      ],
    });
    expect(bound.sustainableRatePct).toBeLessThan(r.sustainableRatePct);
    expect(bound.pace).toBeGreaterThan(r.pace);
  });

  it("ignores a slacker cross-window cap (weekly stays binding)", () => {
    // $100 at 10% → $900 remaining over 1h = $900/h, far slacker than the weekly.
    const loose = buildGauge({
      ...input,
      crossWindows: [
        { usedPct: 10, resetsAt: NOW + 3_600_000, apiValue: 100, windowSeconds: 5 * 3_600 },
      ],
    });
    expect(loose.sustainableRatePct).toBeCloseTo(r.sustainableRatePct, 6);
    expect(loose.pace).toBeCloseTo(r.pace, 6);
  });

  it("forces the capped zone once usage hits 100%, whatever the pace", () => {
    const capped = buildGauge({
      ...input,
      constraints: [{ ...input.constraints[0], usedPercent: 100 }],
    });
    expect(capped.zone).toBe("nitro");
    expect(capped.sustainableRatePct).toBe(0);
  });

  it("degrades cleanly when the usage signal is absent", () => {
    const blind = buildGauge({ ...input, constraints: [] });
    expect(blind.signalAvailable).toBe(false);
    expect(blind.currentPct).toBe(0);
    expect(blind.pace).toBe(0); // no time left to reset ⇒ sustainable ∞ ⇒ pace 0
    expect(blind.zone).toBe("underfarming");
    expect(Number.isNaN(blind.landingPct)).toBe(false);
  });
});
