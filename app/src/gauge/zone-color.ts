// tickColorForPct — the gradient colour for a real percent-of-cap value.
//
// Each zone's colour is pinned to an anchor point on the percent axis; a value
// blends between the two surrounding anchors (color-mix in oklch) so the track
// flows smoothly instead of snapping at zone bounds. Anchors sit at each zone's
// interval centre, so amber → orange → red climbs smoothly toward the plafond.
// Beyond the outer anchors the colour clamps to the first / last zone.

import { realBounds } from '@core/track/real-bounds'
import { SEGMENTS } from '@core/track/segments'
import { visibleBounds } from './visible-bounds'

interface Anchor {
  pct: number
  color: string
}

type Thresholds = { underuseEndsAt: number; breakEvenAt: number; noReturnPct: number }

const anchorsFor = (thresholds: Thresholds): Anchor[] => {
  const bounds = visibleBounds(realBounds(thresholds))
  // Empty (collapsed) zones carry no real span, so they must not pin a colour —
  // otherwise a phantom underfarming/break-even tint bleeds into the low track.
  return SEGMENTS.map((seg, i) => ({ seg, bound: bounds[i] }))
    .filter(({ bound }) => bound.high > bound.low)
    .map(({ seg, bound }) => ({ pct: (bound.low + bound.high) / 2, color: seg.color }))
    .sort((a, b) => a.pct - b.pct)
}

const mix = (from: string, to: string, t: number) =>
  `color-mix(in oklch, ${from}, ${to} ${Math.round(t * 100)}%)`

export const zoneColorForPct = (pct: number, thresholds: Thresholds): string => {
  const anchors = anchorsFor(thresholds)
  if (pct <= anchors[0].pct) return anchors[0].color
  const last = anchors[anchors.length - 1]
  if (pct >= last.pct) return last.color

  const upper = anchors.findIndex((a) => a.pct >= pct)
  const lo = anchors[upper - 1]
  const hi = anchors[upper]
  const span = hi.pct - lo.pct
  return span > 0 ? mix(lo.color, hi.color, (pct - lo.pct) / span) : lo.color
}
