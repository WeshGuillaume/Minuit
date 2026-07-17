// bindingSustainableRate: tighten the selected window's maxxing rate by the OTHER
// caps in play. On a Max plan the usage response is a LIST of independent walls
// (a rolling 5-hour cap AND a weekly one); the pace for one window silently
// ignores the other, so "maxxing weekly" can tell you to sprint straight into the
// 5-hour wall. This folds every cap in.
//
// Common unit is $/hour (cap-independent, unlike each cap's own %). A cap's
// sustainable burn = its remaining_$ ÷ the hours left before it resets, where
// remaining_$ is implied by what's already spent: `apiValue` is `usedPct` of
// that cap, so remaining_$ = apiValue × (100 − usedPct) ÷ usedPct. The MINIMUM
// across caps is what you can actually hold without hitting any wall; it's handed
// back in the selected window's %/h (÷ its $/pct) so the rest of the pace maths
// is unchanged. No other caps, or no calibration ⇒ the selected rate passes
// through untouched.

/** One non-selected cap's pressure: how full it is, active hours until it
 *  resets, and the API value burned in its window so far. */
export interface CapPressure {
  usedPct: number;
  hoursLeft: number;
  apiValue: number;
}

export const bindingSustainableRate = (
  selectedRatePct: number,
  dollarsPerPct: number,
  otherCaps: CapPressure[],
): number => {
  if (dollarsPerPct <= 0 || otherCaps.length === 0) return selectedRatePct;
  const selectedUsdPerHour = selectedRatePct * dollarsPerPct;
  const otherUsdPerHour = otherCaps.map((c) =>
    c.usedPct > 0 && c.hoursLeft > 0
      ? (c.apiValue * (100 - c.usedPct)) / (c.usedPct * c.hoursLeft)
      : Number.POSITIVE_INFINITY,
  );
  return Math.min(selectedUsdPerHour, ...otherUsdPerHour) / dollarsPerPct;
};
