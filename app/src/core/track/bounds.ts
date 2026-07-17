// paceBounds: the six zones expressed on the PACE axis (a speed, not a level).
//
// The thresholds are FIXED, not per-user: the sweet spot has to be a stable
// visual target so you can learn where "maxxing" sits and steer toward it. The
// maxxing zone straddles pace 1, the exact-cap-at-reset speed. Each threshold is
// named after the zone it OPENS, so the cut points read straight down the enum:
//
//   0 · coasting · maxxing · redlining · turbo · nitro · MAX
//   └underfarming┘└coasting┘└─maxxing─┘└redlining┘└turbo┘└nitro┘
//
// `nitro` (pace ≥ thresholds.nitro) means "burning far past the cap trajectory";
// the caller also forces `nitro` when the cap is literally hit (currentPct ≥
// 100). Beyond MAX the track just clamps to its far edge (see toTrack).

import type { PaceThresholds, ZoneBound } from "../types";
import { ZONES } from "./zones";

/** Right edge of the drawn pace track, a bit past `nitro` so the needle has room. */
export const PACE_DISPLAY_MAX = 2.4;

export const paceBounds = (t: PaceThresholds): ZoneBound[] => {
  const cuts = [0, t.coasting, t.maxxing, t.redlining, t.turbo, t.nitro, PACE_DISPLAY_MAX];
  return ZONES.map((zone, i) => ({
    id: zone.id,
    low: cuts[i],
    high: cuts[i + 1],
  }));
};
