import { describe, expect, it } from "vitest";
import { PACE_DISPLAY_MAX, paceBounds } from "../track/bounds";
import { zoneOf } from "../track/zone-of";
import type { PaceThresholds } from "../types";
import { recentRate } from "./recent-rate";
import { sustainableRate } from "./sustainable-rate";

const THRESHOLDS: PaceThresholds = {
  coasting: 0.5,
  maxxing: 0.85,
  redlining: 1.15,
  turbo: 1.5,
  nitro: 2,
};

describe("sustainableRate", () => {
  it("spreads the remaining headroom over the hours left", () => {
    // 40% headroom over 40h ⇒ 1%/h is the exact-cap-at-reset pace
    expect(sustainableRate(60, 40)).toBeCloseTo(1, 6);
  });

  it("is Infinity when no time is left (nothing lands before reset)", () => {
    expect(sustainableRate(60, 0)).toBe(Infinity);
  });

  it("is 0 once the cap is hit (no headroom to spend)", () => {
    expect(sustainableRate(100, 10)).toBe(0);
    expect(sustainableRate(120, 10)).toBe(0);
  });
});

describe("recentRate", () => {
  it("converts recent dollars/hour into percent-of-cap/hour via the calibration", () => {
    // $70 over 2h = $35/h; at $70/pct that is 0.5%/h
    expect(recentRate(70, 2, 70)).toBeCloseTo(0.5, 6);
  });

  it("reads idle (0) when there is no recent burn or no calibration", () => {
    expect(recentRate(0, 1, 70)).toBe(0);
    expect(recentRate(70, 0, 70)).toBe(0);
    expect(recentRate(70, 2, 0)).toBe(0);
  });
});

describe("paceBounds → zoneOf", () => {
  const bounds = paceBounds(THRESHOLDS);
  const zoneAt = (pace: number) => zoneOf(pace, bounds);

  it("maps each speed band to its named zone", () => {
    expect(zoneAt(0.2)).toBe("underfarming"); // way too slow
    expect(zoneAt(0.7)).toBe("coasting"); // a little slow
    expect(zoneAt(1)).toBe("maxxing"); // sweet spot 🎯
    expect(zoneAt(1.3)).toBe("redlining"); // too fast
    expect(zoneAt(1.7)).toBe("turbo"); // well over sustainable
    expect(zoneAt(2.4)).toBe("nitro"); // past the cap trajectory
  });

  it("puts the maxxing sweet spot symmetrically around pace 1", () => {
    expect(zoneAt(0.85)).toBe("maxxing");
    expect(zoneAt(1.14)).toBe("maxxing");
    expect(zoneAt(1.15)).toBe("redlining"); // upper edge belongs to the next zone
  });

  it("covers the whole track from 0 to the display max", () => {
    expect(bounds[0].low).toBe(0);
    expect(bounds[bounds.length - 1].high).toBe(PACE_DISPLAY_MAX);
  });
});
