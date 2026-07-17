// A gauge "mode": one coherent view the whole speedometer speaks at once — the
// center readout, its caption, the labelled scale ticks, the zone, and the axis
// GEOMETRY they sit on. Today the two modes are the same pace metric at two
// smoothings (live, smooth); adding another view (a future $/h, raw %) is just
// one more entry in the registry; nothing in the dial or the center branches on
// the mode id.
//
// Geometry lives on the descriptor (not hardcoded in the dial) so a mode is
// fully self-describing, per the "data over control flow" rule, including its
// own zone-band layout, so a mode can leave the broken pace track for a straight
// axis and still colour/hover correctly.

import type { GaugeReport, ZoneBound, ZoneId } from "@core/types";
import type { DisplayBand } from "../pace-track";

export type ModeId = "live" | "smooth";

/** A labelled tick, its position in the mode's own [min..max] value units. */
export interface GaugeMark {
  pos: number;
  text: string;
}

/** What a mode needs from the pace axis to place/colour things on the sweep. */
export interface MarkContext {
  bounds: ZoneBound[];
  /** Map a pace multiple → its broken-track position [0..100]. */
  toDisplay: (pace: number) => number;
}

/** The dial geometry, split out so modes can share a whole axis by spreading it. */
export interface GaugeGeometry {
  min: (r: GaugeReport) => number;
  max: (r: GaugeReport) => number;
  needle: (r: GaugeReport, ctx: MarkContext) => number; // gauge-value on [min..max]
  // The zone bands in sweep units [0..100]: how the dial colours/hovers ticks.
  bands: (r: GaugeReport, ctx: MarkContext) => DisplayBand[];
}

export interface GaugeMode extends GaugeGeometry {
  id: ModeId;
  /** Human label for the cycle button / a11y. */
  label: string;
  /** The zone this mode's pace sits in — so the dial colours/labels the ACTIVE
   *  smoothing's band, not a fixed report field. */
  zone: (r: GaugeReport) => ZoneId;
  marks: (r: GaugeReport, ctx: MarkContext) => GaugeMark[]; // ticks, pos in [min..max] units
  centerNumber: (r: GaugeReport) => number; // big number (rolled by NumberFlow)
  centerSuffix: string; // unit shown after the number ("×")
  centerCaption: (r: GaugeReport) => string; // small caption under it
}

/** A full dial axis: geometry + its labelled ticks. A mode = an axis + a center
 *  readout; the two mode folders (multiplier/, token-h/) each build one. */
export type Axis = GaugeGeometry & { marks: GaugeMode["marks"] };
