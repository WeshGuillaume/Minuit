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
      liveRatePct: 0.5, // live burn present, below maxxing
      smoothRatePct: 1, // the last while averaged maxxing
      sustainableRatePct: 1,
      livePct: 50,
      bounds,
    });
    expect(f.measuring).toBe(false); // live window has its own reading
    expect(f.pace).toBeCloseTo(0.5, 6); // live: reads its own rate
    expect(f.zone).toBe("coasting"); // live zone follows the live pace
    expect(f.smoothPace).toBeCloseTo(1, 6); // smooth: 1 / 1 = maxxing
    expect(f.smoothZone).toBe("maxxing"); // smooth zone follows the smoothed pace
  });

  it("warming up: empty live window but active → live pace borrows the smooth rhythm", () => {
    const f = multiplierFields({
      liveRatePct: 0, // nothing priced in the live window yet (between long turns)
      smoothRatePct: 1, // but the smooth window shows you're maxxing
      sustainableRatePct: 1,
      livePct: 50,
      bounds,
    });
    expect(f.measuring).toBe(true);
    expect(f.pace).toBeCloseTo(1, 6); // borrows the smooth rhythm, NOT a dishonest 0×
    expect(f.zone).toBe("maxxing"); // and its zone, not "underfarming"
  });

  it("genuinely idle: live AND smooth both empty → drops to 0/underfarming", () => {
    const f = multiplierFields({
      liveRatePct: 0,
      smoothRatePct: 0, // smooth window drained too → not warming up, just idle
      sustainableRatePct: 1,
      livePct: 50,
      bounds,
    });
    expect(f.measuring).toBe(false);
    expect(f.pace).toBe(0); // honest: you really have stopped
    expect(f.zone).toBe("underfarming");
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
