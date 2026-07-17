import { describe, expect, it } from "vitest";
import { activeFactor } from "./active-hours";

describe("activeFactor", () => {
  it("compresses a multi-day window by the work day", () => {
    expect(activeFactor(7 * 86_400, 8)).toBeCloseTo(8 / 24, 6);
    expect(activeFactor(86_400, 12)).toBeCloseTo(0.5, 6);
  });

  it("leaves a sub-day window on the wall clock (factor 1)", () => {
    expect(activeFactor(5 * 3_600, 8)).toBe(1); // the rolling 5h cap
    expect(activeFactor(23 * 3_600, 8)).toBe(1);
  });

  it("is neutral at 24h/day whatever the window", () => {
    expect(activeFactor(7 * 86_400, 24)).toBe(1);
    expect(activeFactor(5 * 3_600, 24)).toBe(1);
  });
});
