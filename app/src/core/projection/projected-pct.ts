// projectedPct — where you'll be at the reset if you follow your usual rhythm.
// NOT a linear extrapolation of the current burst.
//
// Formula:  projectedPct = currentPct + Σ over remaining hours h of
//           profile[weekday(h)][hour(h)] × weight(h)
// The profile is the weekday×hour P75 grid (see calibration/rateProfile); the
// last, partial hour carries weight < 1.
//
// Rationale: if you code hard on a Monday morning but historically ease off in
// the afternoon, the projection should reflect that, not extrapolate the peak.
// Not clamped at 100 — a projection above 100 is meaningful (the cap will be
// exceeded before the reset).

import type { HourSlot, RateProfile } from '../types';

export const projectedPct = (
  currentPct: number,
  remainingHours: HourSlot[],
  profile: RateProfile,
): number =>
  remainingHours.reduce(
    (acc, slot) => acc + (profile[slot.weekday]?.[slot.hour] ?? 0) * slot.weight,
    currentPct,
  );
