// paceBounds: the six zones expressed on the PACE axis (a speed, not a level).
//
// Unlike the old percent bounds, these thresholds are FIXED, not per-user: the
// sweet spot has to be a stable visual target so you can learn where "maxxing"
// sits and steer toward it. The clear (maxxing) zone straddles pace 1, the
// exact-cap-at-reset speed. Cut points, in order:
//
//   0 · underfarm · slow · fast · redline · blown · MAX
//   └underuse┘└profitab.┘└─clear─┘└─warn─┘└noreturn┘└over┘
//
// `over` (pace ≥ blown) means "burning far past the cap trajectory"; the caller
// also forces `over` when the cap is literally hit (currentPct ≥ 100). Beyond
// MAX the track just clamps to its far edge (see toTrack).

import { SEGMENTS } from "../track/segments";
import type { PaceThresholds, SegmentBound } from "../types";

/** Right edge of the drawn pace track, a bit past "blown" so the needle has room. */
export const PACE_DISPLAY_MAX = 2.5;

export const paceBounds = (t: PaceThresholds): SegmentBound[] => {
  const cuts = [0, t.underfarm, t.slow, t.fast, t.redline, t.blown, PACE_DISPLAY_MAX];
  return SEGMENTS.map((seg, i) => ({ id: seg.id, low: cuts[i], high: cuts[i + 1] }));
};
