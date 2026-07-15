// calmRate — your CALMEST sustained working pace, in percent-of-cap per hour.
//
// Formula:  calmRate = P10 of the hourly consumption rates observed on ACTIVE
//           hours only, over the last ~4 weeks.
//
// Honest-number assumption: "calm" is the 10th percentile of hours you were
// actually working — NOT zero. Hours at zero ("I was asleep") are excluded by
// the caller before this runs, so P10 answers "if you kept going at your
// quietest real pace…" rather than the trivial "if you stopped". This is the
// pace that defines the point-of-no-return: even at THIS rate you'd still hit
// the cap. Empty input → 0 (no calm pace observed ⇒ we can't prove doom).

import { percentile } from '../stats/percentile';

export const calmRate = (activeHourRates: number[]): number => {
  if (activeHourRates.length === 0) return 0;
  return percentile(activeHourRates, 10);
};
