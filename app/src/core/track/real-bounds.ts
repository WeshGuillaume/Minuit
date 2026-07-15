// realBounds — the REAL percent-of-cap interval behind each of the six zones,
// derived from the two dynamic thresholds plus the fixed 85 / 100 / 115 / 130
// lines.
//
// Cut points, in order:  0 · underuseEndsAt · breakEvenAt · 85 · 100 · 115 · 130
// The two dynamic thresholds live below the cap; the run-up to the cap and
// everything past it are fixed lines: "redlining" 85→100, "no return"
// 100→115, "capped" 115→130. Nothing guarantees
// underuseEndsAt < breakEvenAt < 85 (a heavy user has breakEvenAt ≈ 0.7%, a very
// light one can push it past 85), so we clamp both to [0,100] and walk the cut
// points enforcing a running maximum: each point is at least the previous one.
// That produces monotonic, contiguous bounds where a squeezed zone simply
// becomes EMPTY (low === high) — never inverted, never NaN. toTrack/zoneOf rely
// on exactly this shape.

import type { SegmentBound } from '../types';
import { SEGMENTS } from './segments';

const CLEAR_END = 85; // "maxxing" → "redlining"
const TENSION_END = 100; // real cap → "no return"
const NORETURN_END = 115; // "no return" → "capped"
const CAP = 130; // right edge of the track (end of "capped")

const clampSub = (n: number): number => Math.min(100, Math.max(0, n));

export const realBounds = (thresholds: {
  underuseEndsAt: number;
  breakEvenAt: number;
}): SegmentBound[] => {
  const raw = [
    0,
    clampSub(thresholds.underuseEndsAt),
    clampSub(thresholds.breakEvenAt),
    CLEAR_END,
    TENSION_END,
    NORETURN_END,
    CAP,
  ];
  // Running maximum → monotonic non-decreasing cut points.
  const cuts = raw.reduce<number[]>((acc, p, i) => {
    acc.push(i === 0 ? p : Math.max(p, acc[i - 1]));
    return acc;
  }, []);

  return SEGMENTS.map((seg, i) => ({ id: seg.id, low: cuts[i], high: cuts[i + 1] }));
};
