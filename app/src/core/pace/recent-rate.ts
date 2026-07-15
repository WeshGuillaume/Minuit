// recentRate: your LIVE burn over the last stretch, in percent-of-cap per hour.
//
//   recentRate = (recentUsd / hours) / dollarsPerPct
//
// This is the reactive needle of the speedometer: it climbs the moment you
// sprint and decays as soon as you idle, because it reads only the most recent
// LOCAL token burn (jsonl, no network). dollarsPerPct (the $↔% calibration)
// converts dollars to cap-percent so recentRate shares units with
// sustainableRate and the two divide into a clean pace. Guards: no elapsed
// hours or no calibration ⇒ 0 (unknown ⇒ treated as idle), never a blow-up.

export const recentRate = (recentUsd: number, hours: number, dollarsPerPct: number): number =>
  hours > 0 && dollarsPerPct > 0 ? recentUsd / hours / dollarsPerPct : 0;
