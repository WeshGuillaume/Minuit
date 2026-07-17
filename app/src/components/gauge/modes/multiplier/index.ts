// The multiplier (Nx) display mode. One factory builds BOTH smoothing variants
// (live, smooth): they share the pace metric, zones and axis, and differ only in
// which pace/zone the needle reads (the PacePick). Broken axis = the fixed,
// big-and-central maxxing target; linear axis = a straight 0 → 2.5× sweep. The
// caption is the zone name; the center number is that mode's pace.

import { PACE_DISPLAY_MAX } from "@core/track/bounds";
import { ZONES } from "@core/track/zones";
import type { GaugeReport, ZoneId } from "@core/types";
import type { AxisMode } from "@/adapters/config";
import { brokenAxis, linearAxis, type PacePick } from "../axis";
import type { GaugeMode, ModeId } from "../types";

const ZONE_LABEL = Object.fromEntries(ZONES.map((z) => [z.id, z.label])) as Record<ZoneId, string>;

// Capped: the sustainable rate is 0, so the raw pace collapses to a meaningless
// 0×. Never show that (or a placeholder dash — see CLAUDE.md); peg the readout to
// the dial's far edge instead, matching the needle (pinned to max) and the Nitro
// caption — one coherent "you're past the top" reading.
const displayPace = (pick: PacePick, r: GaugeReport): number =>
  pick.zone(r) === "nitro" ? PACE_DISPLAY_MAX : pick.pace(r);

/** Build one smoothing variant of the Nx dial. `pick` selects the pace/zone (live
 *  vs smooth); `axis` is shared by both (per ~/.minuit config). */
export const buildMultiplierMode = (
  id: ModeId,
  label: string,
  pick: PacePick,
  axis: AxisMode,
): GaugeMode => ({
  id,
  label,
  ...(axis === "linear" ? linearAxis(pick) : brokenAxis(pick)),
  zone: pick.zone,
  centerNumber: (r: GaugeReport) => displayPace(pick, r),
  centerSuffix: "×",
  centerCaption: (r: GaugeReport) => ZONE_LABEL[pick.zone(r)],
});
