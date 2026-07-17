/*
 * zones: the static definition of the six pace zones as they are DRAWN — the
 * single source of truth for each zone's presentation (display width, label,
 * description). The pace bounds behind them are derived separately in
 * track/bounds (they come from the user-editable thresholds); the shimmer tone
 * is a UI concern in components/gauge/zone-tone.
 *
 * Each zone gets a FIXED display width (they sum to 100). The pace intervals
 * behind them are unequal: Maxxing spans a narrow ~0.85-1.15x but must LOOK
 * like a big central target, so the track uses a broken axis — fixed display
 * widths here, piecewise-linear mapping in toTrack.
 *
 * There is NO separate color token: a zone's color is `--pace-${id}` by
 * construction (resolved in the UI layer, see components/ui/pace-zone-colors),
 * so the id IS the color name. Keeping `id` the one canonical string is the
 * whole point — no `clear`/`Maxxing`/`pace-maxxing` triple to reconcile.
 */

import type { ZoneId } from "../types";

export interface Zone {
  id: ZoneId;
  width: number; // display width, arbitrary units summing to 100
  label: string;
  description: string;
}

// Widths are DISPLAY widths on the broken pace track (they sum to 100): maxxing
// is drawn wide so the sweet spot is a big central target you can steer into,
// even though its real pace range (~0.85-1.15x) is narrow. Labels/descriptions
// speak SPEED: pace = your rate ÷ the rate that kisses the cap exactly at reset.
export const ZONES: readonly Zone[] = [
  {
    id: "underfarming",
    width: 13,
    label: "Underfarming",
    description:
      "Way too slow. At this speed you'll leave a big chunk of capacity (and value) unused when the window resets.",
  },
  {
    id: "coasting",
    width: 13,
    label: "Coasting",
    description:
      "A little slow. You're rentable, but you'll finish the window under the cap with headroom to spare.",
  },
  {
    id: "maxxing",
    width: 44,
    label: "Maxxing",
    description:
      "Sweet spot. Hold this pace and you kiss the cap right as the window resets: maximum value, no wall.",
  },
  {
    id: "redlining",
    width: 10,
    label: "Redlining",
    description:
      "Too fast. Keep this up and you'll hit the cap before the reset. Ease off now and you glide back into the green.",
  },
  {
    id: "turbo",
    width: 8,
    label: "Turbo",
    description:
      "Well over the sustainable rate. You'll slam the cap with hours still on the clock. Slow down hard.",
  },
  {
    id: "nitro",
    width: 12,
    label: "Nitro",
    description:
      "Cap hit (or blowing straight past its trajectory). Nothing more gets through until the window resets.",
  },
] as const;

/** Cumulative display offset (0..100) at the START of each zone, by index. */
export const ZONE_OFFSETS: readonly number[] = ZONES.reduce<number[]>((acc, _zone, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + ZONES[i - 1].width);
  return acc;
}, []);
