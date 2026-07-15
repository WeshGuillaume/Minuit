// underuseEndsAt — the point ON THE PERCENT TRACK where you stop
// "underfarming", i.e. where the profitability ratio reaches its underuse
// threshold (API value climbs past half the window's subscription cost).
//
// Formula:  underuseEndsAt = (underuseThreshold × windowSubCost) / dollarsPerPct
// clamped to [0, 100].
//
// Since underuseThreshold < breakEvenThreshold and both share the dollarsPerPct
// denominator, this is mathematically ≤ breakEvenAt — realBounds relies on that
// but does not assume it (it sorts/clamps defensively). Guard: non-positive
// dollarsPerPct → 0.

export const underuseEndsAt = (
  underuseThreshold: number,
  windowSubCost: number,
  dollarsPerPct: number,
): number => {
  if (dollarsPerPct <= 0) return 0;
  const pct = (underuseThreshold * windowSubCost) / dollarsPerPct;
  return Math.min(100, Math.max(0, pct));
};
