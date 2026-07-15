// segments — the static definition of the six zones as they are DRAWN.
//
// Each zone gets a FIXED display width (they sum to 100). The real percent
// intervals behind them are wildly unequal — with breakEvenAt ≈ 0.73% the first
// two zones would be 3 px and "maxxing" would eat 95% of the bar — so the
// track uses a broken axis: fixed display widths here, piecewise-linear mapping
// in toTrack. This file holds only presentation data (width, colour, label,
// description); the real bounds are derived separately in realBounds.
//
// Colours are plain hex so both the CLI and the web UI can consume them; the
// front-end may re-map them onto its own theme tokens.

import type { ZoneId } from "../types";

export interface Segment {
  id: ZoneId;
  width: number; // display width, arbitrary units summing to 100
  color: string;
  label: string;
  description: string;
}

export const SEGMENTS: readonly Segment[] = [
  {
    id: "underuse",
    width: 13,
    color: "#64748b",
    label: "Underfarming",
    description:
      "API value is under half the window's cost. You're leaving gains on the table. The sub is farming you.",
  },
  {
    id: "profitable",
    width: 13,
    color: "#14b8a6",
    label: "Break-even",
    description:
      "Value ≈ cost. The sub has paid for itself, but you're not cooking yet.",
  },
  {
    id: "clear",
    width: 44,
    color: "#22c55e",
    label: "Maxxing",
    description:
      "You're farming way more value than the sub costs, and the cap is still miles away.",
  },
  {
    id: "warn",
    width: 10,
    color: "#f59e0b",
    label: "Redlining",
    description:
      "You're closing in on the cap. Still salvageable if you ease off, but it's decided right here.",
  },
  {
    id: "noreturn",
    width: 8,
    color: "#f97316",
    label: "No Return",
    description:
      "Even at your calmest rate, you'll hit the cap before reset. Easing off no longer saves you.",
  },
  {
    id: "over",
    width: 12,
    color: "#ef4444",
    label: "Capped",
    description: "Cap hit. Nothing gets through until reset.",
  },
] as const;

/** Cumulative display offset (0..100) at the START of each segment, by index. */
export const SEGMENT_OFFSETS: readonly number[] = SEGMENTS.reduce<number[]>(
  (acc, _seg, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + SEGMENTS[i - 1].width);
    return acc;
  },
  [],
);
