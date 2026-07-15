// noReturnPct — the point-of-no-return ON THE PERCENT TRACK: the usage level
// beyond which, even at your CALMEST observed pace, you would still hit 100%
// before the window resets. Below it, slowing down saves you; above it, it's
// mathematically decided.
//
// Formula:  noReturnPct = 100 − calmRate × hoursUntilReset   (clamped [0,100])
// Interpretation: "if from now on you worked at your calmest observed pace until
// the reset, you'd finish at 100% exactly." Crossed when currentPct ≥ noReturnPct.
//
// Dynamic by design: as the reset approaches, hoursUntilReset shrinks, so the
// point slides UP toward 100 (less time left ⇒ less unavoidable consumption).
// That drift is correct — do not freeze it.

export const noReturnPct = (calmRate: number, hoursUntilReset: number): number => {
  const pct = 100 - calmRate * Math.max(0, hoursUntilReset);
  return Math.min(100, Math.max(0, pct));
};
