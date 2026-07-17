import { describe, expect, it } from "vitest";
import { paceBounds } from "../../track/bounds";
import type { PaceThresholds } from "../../types";
import { multiplierFields } from "./index";
import { paceValue } from "./pace-value";

const THRESHOLDS: PaceThresholds = {
  coasting: 0.5,
  maxxing: 0.85,
  redlining: 1.15,
  turbo: 1.5,
  nitro: 2,
};
const bounds = paceBounds(THRESHOLDS);

describe("paceValue", () => {
  it("is 1 when you burn exactly the sustainable rate (maxxing)", () => {
    expect(paceValue(1, 1)).toBe(1);
  });

  it("reads the ratio for slow and fast burns", () => {
    expect(paceValue(0.5, 1)).toBeCloseTo(0.5, 6); // half speed
    expect(paceValue(2, 1)).toBeCloseTo(2, 6); // double speed
  });

  it("collapses to 0 when the cap is hit or the reset is reached", () => {
    expect(paceValue(3, 0)).toBe(0); // sustainable 0 (capped)
    expect(paceValue(3, Infinity)).toBe(0); // sustainable ∞ (reset now)
  });
});

describe("multiplierFields", () => {
  it("derives live + smooth pace and each zone from the rates", () => {
    const f = multiplierFields({
      liveRatePct: 0, // idle right now → live pace drops
      smoothRatePct: 1, // but the last while averaged maxxing
      sustainableRatePct: 1,
      livePct: 50,
      bounds,
    });
    expect(f.pace).toBe(0); // live: idle → needle at 0
    expect(f.zone).toBe("underfarming"); // live zone drops with it, no contradiction
    expect(f.smoothPace).toBeCloseTo(1, 6); // smooth: 1 / 1 = maxxing
    expect(f.smoothZone).toBe("maxxing"); // smooth zone follows the smoothed pace
  });

  it("forces BOTH zones to capped once live usage hits 100%, whatever the pace", () => {
    const f = multiplierFields({
      liveRatePct: 0.1,
      smoothRatePct: 0.1,
      sustainableRatePct: 1,
      livePct: 100,
      bounds,
    });
    expect(f.zone).toBe("nitro"); // capped, despite a slow pace
    expect(f.smoothZone).toBe("nitro"); // capped applies to both smoothings
  });
});
