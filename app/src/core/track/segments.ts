/*
 * segments: the static definition of the six zones as they are DRAWN.
 *
 * Each zone gets a FIXED display width (they sum to 100). The pace intervals
 * behind them are unequal. Maxxing spans a narrow ~0.85-1.15x but must LOOK
 * like a big central target, so the track uses a broken axis: fixed display
 * widths here, piecewise-linear mapping in toTrack. This file holds only
 * presentation data (width, color token, label, description); the pace
 * bounds are derived separately in paceBounds.
 *
 * `colorToken` is a name, not a value: this module is a color-naming
 * authority, not a color-value authority. It resolves to an actual color
 * only in the UI layer (see components/ui/pace-zone-colors.ts), which maps
 * each token onto a `--pace-*` CSS custom property defined in index.css.
 */

import type { ZoneId } from "../types";

export interface Segment {
  id: ZoneId;
  width: number; // display width, arbitrary units summing to 100
  colorToken: string;
  label: string;
  description: string;
}

// Widths are DISPLAY widths on the broken pace track (they sum to 100): maxxing
// is drawn wide so the sweet spot is a big central target you can steer into,
// even though its real pace range (~0.85-1.15x) is narrow. Labels/descriptions
// speak SPEED: pace = your rate ÷ the rate that kisses the cap exactly at reset.
export const SEGMENTS: readonly Segment[] = [
  {
    id: "underuse",
    width: 13,
    colorToken: "pace-underfarming",
    label: "Underfarming",
    description:
      "Way too slow. At this speed you'll leave a big chunk of capacity (and value) unused when the window resets.",
  },
  {
    id: "profitable",
    width: 13,
    colorToken: "pace-coasting",
    label: "Coasting",
    description:
      "A little slow. You're rentable, but you'll finish the window under the cap with headroom to spare.",
  },
  {
    id: "clear",
    width: 44,
    colorToken: "pace-maxxing",
    label: "Maxxing",
    description:
      "Sweet spot. Hold this pace and you kiss the cap right as the window resets: maximum value, no wall.",
  },
  {
    id: "warn",
    width: 10,
    colorToken: "pace-redlining",
    label: "Redlining",
    description:
      "Too fast. Keep this up and you'll hit the cap before the reset. Ease off now and you glide back into the green.",
  },
  {
    id: "noreturn",
    width: 8,
    colorToken: "pace-waytoofast",
    label: "Way Too Fast",
    description:
      "Well over the sustainable rate. You'll slam the cap with hours still on the clock. Slow down hard.",
  },
  {
    id: "over",
    width: 12,
    colorToken: "pace-capped",
    label: "Capped",
    description:
      "Cap hit (or blowing straight past its trajectory). Nothing more gets through until the window resets.",
  },
] as const;

/** Cumulative display offset (0..100) at the START of each segment, by index. */
export const SEGMENT_OFFSETS: readonly number[] = SEGMENTS.reduce<number[]>((acc, _seg, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + SEGMENTS[i - 1].width);
  return acc;
}, []);
