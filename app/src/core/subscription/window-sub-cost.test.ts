import { describe, expect, it } from "vitest";
import { windowSubCost } from "./window-sub-cost";

const DAY = 86_400;

describe("windowSubCost", () => {
  it("max20x over a 7-day window ≈ $46.00", () => {
    expect(windowSubCost(200, 7 * DAY)).toBeCloseTo(46.0, 1);
    // exact formula value, guarding the rounding claim in the spec
    expect(windowSubCost(200, 7 * DAY)).toBeCloseTo(45.9921, 3);
  });

  it("max20x over a 5-hour window ≈ $1.37", () => {
    expect(windowSubCost(200, 5 * 3600)).toBeCloseTo(1.37, 2);
  });

  it("scales linearly with the monthly price", () => {
    expect(windowSubCost(100, 7 * DAY)).toBeCloseTo(windowSubCost(200, 7 * DAY) / 2, 10);
  });
});
