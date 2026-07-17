// zoneOf: which of the six zones a value on the driving axis falls into. The
// axis is pace today (rate ÷ sustainable rate); the function is axis-agnostic,
// it only walks bounds.
//
// Walk the bounds in order; the value belongs to the first zone whose high it is
// strictly below. Boundary values therefore fall into the UPPER zone (e.g.
// exactly at the redlining threshold → "redlining"). Empty zones (low === high)
// are skipped naturally because `value < high` can never hold for them. Anything
// at/above the far bound is "nitro".

import type { ZoneBound, ZoneId } from "../types";

export const zoneOf = (pct: number, bounds: ZoneBound[]): ZoneId => {
  for (const b of bounds) {
    if (pct < b.high) return b.id;
  }
  return "nitro";
};
