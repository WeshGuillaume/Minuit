// habitualRate — your TYPICAL working pace, in percent-of-cap per hour.
//
// Formula:  habitualRate = median of the hourly consumption rates observed on
//           ACTIVE hours only, over the last ~4 weeks.
//
// This is deliberately the median (p50), not the calm P10 nor the cautious P75
// of the day×hour profile: hoursLeft ("how many working hours until the cap")
// wants your ordinary pace, neither optimistic nor pessimistic. Empty input →
// 0, which the caller reads as "unknown pace" (hoursLeft → Infinity).

import { percentile } from '../stats/percentile';

export const habitualRate = (activeHourRates: number[]): number => {
  if (activeHourRates.length === 0) return 0;
  return percentile(activeHourRates, 50);
};
