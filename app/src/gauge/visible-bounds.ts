// visibleBounds — the DRAWN view of realBounds: hide Axis-1 zones too thin to
// mean anything on the track.
//
// A heavy user's underfarming / break-even zones are a sliver (≈0.07% of cap);
// realBounds keeps them (they are real), but painting them or letting a tick
// hover them just reads "Underfarming 0–0%" — a phantom. Here we snap any such
// sliver shut (high ← low) and hand its low edge to the next zone so the track
// stays contiguous. zoneOf then skips the empty zone naturally.
//
// Scoped to the two Axis-1 zones on purpose: the fixed plafond zones
// (redlining/no-return/capped) are never thin and must never be merged away.

import type { SegmentBound, ZoneId } from '@core/types'

const COLLAPSIBLE: ReadonlySet<ZoneId> = new Set(['underuse', 'profitable'])
const MIN_WIDTH = 1 // % of cap

export const visibleBounds = (bounds: SegmentBound[], minWidth = MIN_WIDTH): SegmentBound[] => {
  const out = bounds.map((b) => ({ ...b }))
  for (let i = 0; i < out.length - 1; i++) {
    if (COLLAPSIBLE.has(out[i].id) && out[i].high - out[i].low < minWidth) {
      out[i + 1].low = out[i].low
      out[i].high = out[i].low // empty → skipped by zoneOf, dropped by colour anchors
    }
  }
  return out
}
