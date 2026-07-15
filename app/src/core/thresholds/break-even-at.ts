// breakEvenAt — the point ON THE PERCENT TRACK where API value crosses the
// "at a loss for Anthropic" line, i.e. where the profitability ratio hits its
// breakEven threshold.
//
// Formula:  breakEvenAt = (breakEvenThreshold × windowSubCost) / dollarsPerPct
// clamped to [0, 100]. It converts a dollar threshold into a percent-of-cap
// position via the dollarsPerPct keystone.
//
// Assumption: for heavy users this is a tiny number (≈0.7%) — you cross into
// "loss for Anthropic" in the first minutes of the window. That is correct, not
// a bug; it is exactly why the track uses a broken axis. Guard: a non-positive
// dollarsPerPct (no data) yields 0 rather than Infinity.

export const breakEvenAt = (
  breakEvenThreshold: number,
  windowSubCost: number,
  dollarsPerPct: number,
): number => {
  if (dollarsPerPct <= 0) return 0;
  const pct = (breakEvenThreshold * windowSubCost) / dollarsPerPct;
  return Math.min(100, Math.max(0, pct));
};
