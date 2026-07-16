import { describe, expect, it } from "vitest";
import { habitualRate } from "./habitual-rate";

describe("habitualRate", () => {
  it("is the median of active-hour rates", () => {
    expect(habitualRate([2, 4, 6, 8])).toBe(5);
    expect(habitualRate([3, 5, 9])).toBe(5);
  });

  it("returns 0 when there is no observed activity", () => {
    expect(habitualRate([])).toBe(0);
  });
});
