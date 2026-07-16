import { describe, expect, it } from "vitest";
import { hoursLeft } from "./hours-left";

describe("hoursLeft", () => {
  it("divides remaining headroom by the habitual pace", () => {
    expect(hoursLeft(40, 2)).toBe(30); // (100-40)/2
  });

  it("is 0 at or past the cap", () => {
    expect(hoursLeft(100, 2)).toBe(0);
    expect(hoursLeft(115, 2)).toBe(0);
  });

  it("is Infinity when no pace is known", () => {
    expect(hoursLeft(40, 0)).toBe(Infinity);
  });
});
