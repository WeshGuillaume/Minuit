// sustainableRate: the %/hour you can still burn to land EXACTLY at the cap at
// the reset. It spreads the headroom that's left evenly over the time that's
// left:
//
//   sustainableRate = (100 − currentPct) / hoursUntilReset
//
// This is the DENOMINATOR of pace: burning at exactly this rate ⇒ pace 1 ⇒
// maxxing (full value extracted, cap kissed right at reset). Guards: no time
// left ⇒ Infinity (nothing you do now lands before the reset) and at/over the
// cap ⇒ 0 headroom ⇒ 0. Both are read by `pace` as a non-actionable state,
// never a crash.

export const sustainableRate = (currentPct: number, hoursUntilReset: number): number =>
  hoursUntilReset > 0 ? Math.max(0, 100 - currentPct) / hoursUntilReset : Infinity;
