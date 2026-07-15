// zoneOf — which of the five zones a real percent-of-cap value falls into.
//
// Walk the real bounds in order; the value belongs to the first zone whose high
// it is strictly below. Boundary values therefore fall into the UPPER zone
// (e.g. exactly at breakEvenAt → "clear", exactly 85 → "warn", exactly 100 →
// "over"). Empty zones (low === high) are skipped naturally because `pct < high`
// can never hold for them. Anything at/above the far cap is "over".

import type { SegmentBound, ZoneId } from '../types';

export const zoneOf = (pct: number, bounds: SegmentBound[]): ZoneId => {
  for (const b of bounds) {
    if (pct < b.high) return b.id;
  }
  return 'over';
};
