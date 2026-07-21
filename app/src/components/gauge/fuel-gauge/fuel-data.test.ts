import { describe, expect, it } from "vitest";
import type { GaugeReport } from "@core/types";
import { fuelData, fuelTickColors } from "./fuel-data";

const report = (over: Partial<GaugeReport>): GaugeReport =>
  ({
    currentPct: 62,
    signalAvailable: true,
    hoursUntilReset: 40,
    ...over,
  }) as GaugeReport;

describe("fuelData", () => {
  it("keeps a partial-drain projection's remaining fuel out of the drain band", () => {
    // 62% used (38% left), landing at 87% (13% left at reset): some fuel
    // genuinely survives to reset, so its own tick should read as safe.
    const d = fuelData(report({ currentPct: 62 }), 87, 60);
    expect(d.projectedActiveTick).toBeGreaterThanOrEqual(0);
    // Readout is fuel-left framed (13% left), the complement of 87% used, so it
    // agrees with the "% left" level rather than flipping to a usage figure.
    expect(d.fuelLeftAtLanding).toBeCloseTo(13, 6);
    const colors = fuelTickColors(d);
    expect(colors.activeColor({ index: 0 } as never)).toBe(d.color); // still safe
    expect(d.willCapBeforeReset).toBe(false);
    // Landing at ≥0 fuel (no overshoot) is maxxing, not danger: drain band and
    // pump read neutral white, never red.
    expect(d.drainColor).toBe("var(--foreground)");
    expect(d.dry).toBe(false);
  });

  it("reddens the drain band and pump only on overshoot (target fuel < 0)", () => {
    // 130% raw landing: runs dry 10h before the 40h reset — you overshoot the
    // cap, the one case that warrants red.
    const d = fuelData(report({ currentPct: 62 }), 130, 10);
    expect(d.willCapBeforeReset).toBe(true);
    expect(d.drainColor).toBe("var(--destructive)");
    expect(d.dry).toBe(true);
  });

  it("pulls EVERY lit tick, including index 0, into the drain band on a total drain", () => {
    // landingPct clamps to 100 (fuelAtLanding = 0): nothing survives to reset,
    // so tick 0 — always lit whenever any fuel is left today — must read as
    // about-to-drain too, not "safe" (the bug this test guards).
    const d = fuelData(report({ currentPct: 62 }), 118, 10);
    expect(d.projectedActiveTick).toBe(-1);
    const colors = fuelTickColors(d);
    expect(colors.activeColor({ index: 0 } as never)).toBe(d.drainColor);
    expect(colors.activeColor({ index: d.lastActiveTick } as never)).toBe(d.drainColor);
  });

  it("bases the dry warning light on the projection, not today's level", () => {
    // Healthy today (38% left) but projected to fully drain by reset.
    const d = fuelData(report({ currentPct: 62 }), 118, 10);
    expect(d.fuelLeft).toBeCloseTo(38, 6);
    expect(d.dry).toBe(true);
  });

  it("flags willCapBeforeReset when the raw landing overshoots 100% before reset", () => {
    // Pace would land at 130% — you run dry 10h before the window actually
    // resets in 40h. "N% by reset" would misleadingly claim you coast to 100%
    // exactly at reset; the caller must show the real hours-to-cap instead.
    const d = fuelData(report({ currentPct: 62 }), 130, 10);
    expect(d.willCapBeforeReset).toBe(true);
    expect(d.hoursToCap).toBe(10);
  });

  it("does not flag willCapBeforeReset when idle (rate 0, hoursToCap Infinity)", () => {
    // Guard against a report edge case: landing clamped to exactly 100 with a
    // non-finite hoursToCap (e.g. already at the cap, rate 0) shouldn't claim
    // a real "hits zero at X" moment that was never actually computed.
    const d = fuelData(report({ currentPct: 100 }), 100, Number.POSITIVE_INFINITY);
    expect(d.willCapBeforeReset).toBe(false);
  });
});
