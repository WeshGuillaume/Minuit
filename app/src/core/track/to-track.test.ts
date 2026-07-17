import { describe, expect, it } from "vitest";
import type { ZoneBound } from "../types";
import { toTrack } from "./to-track";
import { ZONES } from "./zones";

// toTrack is axis-agnostic; we feed it synthetic monotonic cut points to test the
// broken-axis mapping in isolation. These mimic the old heavy-user percent bounds:
// underfarming [0,0.33], coasting [0.33,0.73], maxxing [0.73,85], redlining [85,100],
// turbo [100,115], nitro [115,130]. Display offsets 0,13,26,70,80,88.
const boundsFrom = (cuts: number[]): ZoneBound[] =>
  ZONES.map((z, i) => ({ id: z.id, low: cuts[i], high: cuts[i + 1] }));
const bounds = boundsFrom([0, 0.33, 0.73, 85, 100, 115, 130]);

describe("toTrack", () => {
  it("maps segment boundaries to their exact display offsets", () => {
    expect(toTrack(0, bounds)).toBe(0);
    expect(toTrack(0.33, bounds)).toBeCloseTo(13, 6); // end of underfarming / start of coasting
    expect(toTrack(0.73, bounds)).toBeCloseTo(26, 6); // start of maxxing
    expect(toTrack(85, bounds)).toBeCloseTo(70, 6); // start of redlining
    expect(toTrack(100, bounds)).toBeCloseTo(80, 6); // start of turbo
    expect(toTrack(115, bounds)).toBeCloseTo(88, 6); // start of nitro
    expect(toTrack(130, bounds)).toBeCloseTo(100, 6);
  });

  it("places a mid-zone value proportionally WITHIN its display band", () => {
    // 92.5 is halfway through redlining [85,100] -> offset 70 + 0.5*10 = 75
    expect(toTrack(92.5, bounds)).toBeCloseTo(75, 6);
  });

  it("is monotonic non-decreasing and never NaN across the range", () => {
    let prev = -1;
    for (let p = 0; p <= 130; p += 0.5) {
      const t = toTrack(p, bounds);
      expect(Number.isNaN(t)).toBe(false);
      expect(t).toBeGreaterThanOrEqual(prev);
      prev = t;
    }
  });

  it("clamps out-of-range inputs", () => {
    expect(toTrack(-10, bounds)).toBe(0);
    expect(toTrack(999, bounds)).toBe(100);
  });

  it("steps across a collapsed (empty) zone without NaN", () => {
    const light = boundsFrom([0, 40, 92, 92, 100, 115, 130]); // maxxing is empty
    expect(Number.isNaN(toTrack(92, light))).toBe(false);
    expect(toTrack(91, light)).toBeLessThanOrEqual(toTrack(93, light));
  });
});
