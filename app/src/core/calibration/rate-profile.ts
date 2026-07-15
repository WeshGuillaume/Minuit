// rateProfile — a weekday × hour-of-day grid of your expected consumption pace,
// in percent-of-cap per hour. It is what makes projectedPct follow your real
// rhythm instead of extrapolating the current burst.
//
// Formula: bucket every observation by (weekday, hour); each cell is the P75 of
// its bucket over the last ~4 weeks. P75 (rather than the median) makes the
// projection slightly pessimistic — the right bias for an alert tool.
//
// Compromise: empty cells (a slot you've never worked) are 0, so the projection
// simply adds nothing for hours you historically don't use. Returns a dense
// 7×24 grid so callers can index [weekday][hour] without bounds checks.

import type { HourObservation, RateProfile } from '../types';
import { percentile } from '../stats/percentile';

export const rateProfile = (
  observations: HourObservation[],
  percentileP = 75,
): RateProfile => {
  const buckets: number[][][] = Array.from({ length: 7 }, () =>
    Array.from({ length: 24 }, () => [] as number[]),
  );
  for (const o of observations) buckets[o.weekday][o.hour].push(o.ratePctPerHour);

  return buckets.map((day) =>
    day.map((cell) => (cell.length === 0 ? 0 : percentile(cell, percentileP))),
  );
};
