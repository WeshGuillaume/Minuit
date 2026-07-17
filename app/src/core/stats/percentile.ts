// percentile: the p-th percentile of a numeric sample, by linear interpolation
// between the two nearest ranks (the NIST / Excel PERCENTILE.INC method).
//
// Formula: sort ascending, rank = (p/100)·(n−1), then interpolate between the
// values at floor(rank) and ceil(rank).
//
// This is the one shared math primitive the calibration files lean on (median =
// p50, calmRate = p10, profile = p75). It is a single generic function in its
// own file, not a "utils" dumping ground, so it obeys the one-function-per-file
// rule while staying DRY. Empty input has no percentile → returns NaN, so every
// caller must decide what "no data" means rather than silently getting 0.

export const percentile = (values: number[], p: number): number => {
  if (values.length === 0) return NaN;
  if (values.length === 1) return values[0];
  const sorted = [...values].sort((a, b) => a - b);
  const rank = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (rank - lo) * (sorted[hi] - sorted[lo]);
};
