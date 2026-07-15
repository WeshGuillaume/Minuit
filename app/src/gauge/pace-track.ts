// Placing the pace needle/ghost on the broken display track, and reading a zone
// back from a track position. The pace axis is narrow (0..~2.5×) but the maxxing
// sweet spot has to LOOK big and central, so the dial borrows the segments'
// fixed display widths (toTrack) instead of a linear axis. displayBandAt is the
// inverse map the dial needs to colour, label, and hover each zone.

import { toTrack } from '@core/track/to-track'
import { SEGMENTS, SEGMENT_OFFSETS, type Segment } from '@core/track/segments'
import type { SegmentBound } from '@core/types'

/** Track position [0..100] for a pace value, via the broken axis. */
export const paceToDisplay = (pace: number, bounds: SegmentBound[]): number =>
  toTrack(pace, bounds)

export interface DisplayBand {
  seg: Segment
  start: number // track position where the band starts [0..100]
  end: number // …and where it ends
}

/** The zone band owning a track position [0..100]. */
export const displayBandAt = (pos: number): DisplayBand => {
  for (let i = SEGMENTS.length - 1; i >= 0; i--) {
    const start = SEGMENT_OFFSETS[i]
    if (pos >= start) return { seg: SEGMENTS[i], start, end: start + SEGMENTS[i].width }
  }
  const seg = SEGMENTS[0]
  return { seg, start: 0, end: seg.width }
}
