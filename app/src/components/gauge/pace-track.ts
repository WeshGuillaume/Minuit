// Placing the pace needle on the broken display track, and reading a zone
// back from a track position. The pace axis is narrow (0..~2.5×) but the maxxing
// sweet spot has to LOOK big and central, so the dial borrows the segments'
// fixed display widths (toTrack) instead of a linear axis. displayBandAt is the
// inverse map the dial needs to colour, label, and hover each zone.

import { toTrack } from "@core/track/to-track";
import { ZONE_OFFSETS, ZONES, type Zone } from "@core/track/zones";
import type { ZoneBound } from "@core/types";
import { paceZoneColorVar } from "@/components/ui/pace-zone-colors";

const ZONE_BY_ID = Object.fromEntries(ZONES.map((z) => [z.id, z])) as Record<string, Zone>;

/** Track position [0..100] for a pace value, via the broken axis. */
export const paceToDisplay = (pace: number, bounds: ZoneBound[]): number => toTrack(pace, bounds);

export interface DisplayBand {
  seg: Zone;
  start: number; // sweep position where the band starts [0..100]
  end: number; // …and where it ends
}

/** The BROKEN layout: each zone's fixed display width, so maxxing reads big and
 *  central (see core/track/zones). Positions are the drawn track offsets. */
export const displayBands = (): DisplayBand[] =>
  ZONES.map((zone, i) => ({
    seg: zone,
    start: ZONE_OFFSETS[i],
    end: ZONE_OFFSETS[i] + zone.width,
  }));

/** The LINEAR layout: each zone's pace range mapped straight onto a 0..100 sweep
 *  whose far edge is `axisMaxPace` (in pace multiples): true proportions, so
 *  maxxing reads as the narrow band it actually is. */
export const linearBands = (bounds: ZoneBound[], axisMaxPace: number): DisplayBand[] =>
  bounds.map((b) => ({
    seg: ZONE_BY_ID[b.id],
    start: (b.low / axisMaxPace) * 100,
    end: (b.high / axisMaxPace) * 100,
  }));

/** The band owning a sweep position [0..100] within a layout (highest start wins). */
export const pickBand = (bands: DisplayBand[], pos: number): DisplayBand => {
  for (let i = bands.length - 1; i >= 0; i--) {
    if (pos >= bands[i].start) return bands[i];
  }
  return bands[0];
};

/** The zone band owning a broken-track position [0..100]. */
export const displayBandAt = (pos: number): DisplayBand => pickBand(displayBands(), pos);

/** Each band's color, anchored at its MIDPOINT: the color you'd read if you
 *  hovered dead-center of that zone. Used as gradient stops so the dial reads
 *  the zone's own color at its heart and blends into neighbours at the edges,
 *  instead of a hard cut the instant the pace crosses a boundary. */
const bandColorStops = (bands: DisplayBand[]): { mid: number; color: string }[] =>
  bands.map((b) => ({ mid: (b.start + b.end) / 2, color: paceZoneColorVar(b.seg.id) }));

/** A smooth color for a sweep position [0..100], interpolated between the two
 *  nearest bands' colors via their midpoints (color-mix, not a hard switch). */
export const bandGradientColor = (bands: DisplayBand[], pos: number): string => {
  const stops = bandColorStops(bands);
  const clamped = Math.min(stops[stops.length - 1].mid, Math.max(stops[0].mid, pos));
  const upperIndex = stops.findIndex((s) => s.mid >= clamped);
  if (upperIndex <= 0) return stops[0].color;

  const lower = stops[upperIndex - 1];
  const upper = stops[upperIndex];
  const span = upper.mid - lower.mid;
  const t = span > 0 ? Math.round(((clamped - lower.mid) / span) * 100) : 0;
  return `color-mix(in oklch, ${lower.color}, ${upper.color} ${t}%)`;
};
