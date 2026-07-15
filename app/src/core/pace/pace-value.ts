// pace: how fast you're going RELATIVE to the pace that lands you exactly at
// the cap at the reset.
//
//   pace = rate / sustainableRate
//
//   pace ≈ 1  maxxing   dead-on, you kiss the cap right at reset
//   pace < 1  slow      you'll leave capacity (and value) on the table
//   pace > 1  fast      you'll hit the cap before the reset
//
// The same function drives both the needle (rate = recentRate) and the ghost
// (rate = habitualRate). Guard: a zero or infinite sustainableRate (reset
// reached / cap already hit) ⇒ 0, so the value axis never returns NaN; the
// capped state is decided by the caller (currentPct ≥ 100), not here.

export const paceValue = (rate: number, sustainableRate: number): number =>
  sustainableRate > 0 && Number.isFinite(sustainableRate) ? rate / sustainableRate : 0;
