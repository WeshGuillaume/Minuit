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
    const d = fuelData(report({ currentPct: 62 }), 87);
    expect(d.projectedActiveTick).toBeGreaterThanOrEqual(0);
    const colors = fuelTickColors(d);
    expect(colors.activeColor({ index: 0 } as never)).toBe(d.color); // still safe
  });

  it("pulls EVERY lit tick, including index 0, into the drain band on a total drain", () => {
    // landingPct clamps to 100 (fuelAtLanding = 0): nothing survives to reset,
    // so tick 0 — always lit whenever any fuel is left today — must read as
    // about-to-drain too, not "safe" (the bug this test guards).
    const d = fuelData(report({ currentPct: 62 }), 118);
    expect(d.projectedActiveTick).toBe(-1);
    const colors = fuelTickColors(d);
    expect(colors.activeColor({ index: 0 } as never)).toBe(d.drainColor);
    expect(colors.activeColor({ index: d.lastActiveTick } as never)).toBe(d.drainColor);
  });

  it("bases the dry warning light on the projection, not today's level", () => {
    // Healthy today (38% left) but projected to fully drain by reset.
    const d = fuelData(report({ currentPct: 62 }), 118);
    expect(d.fuelLeft).toBeCloseTo(38, 6);
    expect(d.dry).toBe(true);
  });
});
