// hoursLeft: how many hours of headroom remain before the cap, at the current
// burn rate.
//
// Formula:  hoursLeft = max(0, 100 − currentPct) / rate
// where `rate` is the live (readout) %/h the needle rides.
//
// Guard: a zero rate (idle, no observed pace) means we cannot bound it, so we
// return Infinity: the report/UI reads a non-finite value as "no limit". Never
// negative: once at/over the cap, hoursLeft is 0.

export const hoursLeft = (currentPct: number, rate: number): number => {
  if (rate <= 0) return Infinity;
  return Math.max(0, 100 - currentPct) / rate;
};
