import { describe, expect, it } from "vitest";
import { bindingSustainableRate } from "./binding-rate";

describe("bindingSustainableRate", () => {
  // Selected window: 1.5%/h maxxing, calibrated at $70/pct → $105/h sustainable.
  const selectedRatePct = 1.5;
  const dpp = 70;

  it("passes the selected rate through when no other cap is in play", () => {
    expect(bindingSustainableRate(selectedRatePct, dpp, [])).toBe(selectedRatePct);
  });

  it("passes through when there is no calibration", () => {
    expect(
      bindingSustainableRate(selectedRatePct, 0, [{ usedPct: 90, hoursLeft: 1, apiValue: 500 }]),
    ).toBe(selectedRatePct);
  });

  it("keeps the selected rate when the other cap is slacker", () => {
    // Other cap: $100 at 10% → $900 remaining over 1h = $900/h ≫ $105/h. Not binding.
    const r = bindingSustainableRate(selectedRatePct, dpp, [
      { usedPct: 10, hoursLeft: 1, apiValue: 100 },
    ]);
    expect(r).toBeCloseTo(selectedRatePct, 6);
  });

  it("tightens to the other cap when it is the binding wall", () => {
    // Other cap: $80 at 80% → $20 remaining over 1h = $20/h < $105/h. Binds.
    // $20/h ÷ $70/pct = 0.2857%/h.
    const r = bindingSustainableRate(selectedRatePct, dpp, [
      { usedPct: 80, hoursLeft: 1, apiValue: 80 },
    ]);
    expect(r).toBeCloseTo(20 / 70, 6);
  });

  it("ignores a fresh (0%) or reset (0h) cap as no pressure", () => {
    const r = bindingSustainableRate(selectedRatePct, dpp, [
      { usedPct: 0, hoursLeft: 4, apiValue: 0 },
      { usedPct: 50, hoursLeft: 0, apiValue: 50 },
    ]);
    expect(r).toBeCloseTo(selectedRatePct, 6);
  });
});
