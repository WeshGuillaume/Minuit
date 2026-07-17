// Shared dial-axis machinery the pace modes build on: the fixed BROKEN pace
// track, and the straight LINEAR-axis factory. Both smoothing modes (live,
// smooth) share these; each supplies only a PacePick — which pace/zone the needle
// reads — so the same geometry serves both without duplication.

import { PACE_DISPLAY_MAX } from "@core/track/bounds";
import type { GaugeReport, ZoneId } from "@core/types";
import { displayBands, linearBands } from "../pace-track";
import type { Axis, GaugeMark, MarkContext } from "./types";

/** Which pace value (and its zone) a mode's needle reads — the one knob that
 *  differs between the live and smoothed dials. */
export interface PacePick {
  pace: (r: GaugeReport) => number;
  zone: (r: GaugeReport) => ZoneId;
}

/** Reference speeds on the broken track. */
const BROKEN_MARKS = [0.5, 1, 1.5];

/** Pace-multiple labels (`0.5× / 1× / 1.5×`) placed on the broken track. */
const multipleMarks = (_r: GaugeReport, ctx: MarkContext): GaugeMark[] =>
  BROKEN_MARKS.map((p) => ({ pos: ctx.toDisplay(p), text: `${p}×` }));

/** The broken pace track, reading the picked pace/zone; bands are shared. */
export const brokenAxis = (pick: PacePick): Axis => ({
  min: () => 0,
  max: () => 100,
  needle: (r, ctx) => (pick.zone(r) === "nitro" ? 100 : ctx.toDisplay(pick.pace(r))),
  bands: () => displayBands(),
  marks: multipleMarks,
});

// A straight axis drawn 0 → PACE_DISPLAY_MAX (the pace dial's own far edge, so no
// magic number). Ticks are evenly spaced pace multiples up to 2×.
const LINEAR_MARK_MULTIPLES = [0.5, 1, 1.5, 2];
export const linearAxis = (pick: PacePick): Axis => ({
  min: () => 0,
  max: () => PACE_DISPLAY_MAX,
  needle: (r) => (pick.zone(r) === "nitro" ? PACE_DISPLAY_MAX : pick.pace(r)),
  bands: (_r, ctx) => linearBands(ctx.bounds, PACE_DISPLAY_MAX),
  marks: () => LINEAR_MARK_MULTIPLES.map((m) => ({ pos: m, text: `${m}×` })),
});
