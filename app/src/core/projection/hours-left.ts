// hoursLeft — how many WORKING hours of headroom remain before the cap, at your
// typical pace.
//
// Formula:  hoursLeft = max(0, 100 − currentPct) / habitualRate
// using habitualRate (the median active-hour pace), not the calm P10 nor the
// cautious P75 profile — here we want the ordinary rhythm.
//
// Guard: a zero habitualRate (no observed pace) means we cannot bound it, so we
// return Infinity — the report/UI reads a non-finite value as "no limit". Never
// negative: once at/over the cap, hoursLeft is 0.

export const hoursLeft = (currentPct: number, habitualRate: number): number => {
  if (habitualRate <= 0) return Infinity;
  return Math.max(0, 100 - currentPct) / habitualRate;
};
