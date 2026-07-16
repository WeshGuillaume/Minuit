// toTrack: map a value on the driving axis onto the broken-axis display track
// [0..100], piecewise-linearly.
//
// For the segment whose real interval contains `pct`, return the segment's
// cumulative display offset plus (fraction within the segment) × display width.
// An empty real segment (low === high) contributes fraction 0, so the cursor
// steps across the fixed display band of a collapsed zone rather than dividing
// by zero.
//
// THE TRADE-OFF (do not "fix" this thinking it's a bug): position inside a zone
// is NOT proportional to reality; the axis is intentionally broken so each zone
// is legible at a glance. Exact figures live in the stats beside the track. The
// mapping is monotonic non-decreasing and never returns NaN.

import type { SegmentBound } from "../types";
import { SEGMENT_OFFSETS, SEGMENTS } from "./segments";

export const toTrack = (pct: number, bounds: SegmentBound[]): number => {
  if (pct <= bounds[0].low) return 0;
  for (let i = 0; i < bounds.length; i++) {
    const { low, high } = bounds[i];
    if (pct <= high) {
      const fraction = high > low ? (pct - low) / (high - low) : 0;
      return SEGMENT_OFFSETS[i] + fraction * SEGMENTS[i].width;
    }
  }
  return 100; // beyond the last real bound (>120) → far edge
};
