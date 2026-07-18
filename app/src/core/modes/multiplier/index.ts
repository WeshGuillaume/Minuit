// The multiplier (Nx) mode's core calculation, self-contained: turn the burn
// rates into a pace (rate ÷ sustainable, 1 = maxxing) and the zone that pace sits
// in — at TWO smoothings of the same metric (live + smooth), each with its own
// zone, so the dial can toggle between a nervous and a steady needle. buildGauge
// feeds it the rates + zone bounds; the pace derivation is owned here.

import { zoneOf } from "../../track/zone-of";
import type { ZoneBound, ZoneId } from "../../types";
import { paceValue } from "./pace-value";

export interface MultiplierInput {
  liveRatePct: number; // live burn, %/h (readoutWindowHours) → 0 when idle
  smoothRatePct: number; // smoothed burn, %/h (smoothWindowHours)
  sustainableRatePct: number; // maxxing rate, %/h
  livePct: number; // extrapolated usage; ≥ 100 forces the capped zone
  bounds: ZoneBound[]; // the pace zone cut points
}

export interface MultiplierFields {
  pace: number;
  smoothPace: number;
  zone: ZoneId;
  smoothZone: ZoneId;
  measuring: boolean; // live window empty but active → pace borrows the smooth rhythm
}

/** The report fields the Nx dial reads. `pace`/`zone` ride the short live window
 *  (nervous, eases to 0 when idle); `smoothPace`/`smoothZone` ride the longer
 *  window (steady). Capped usage (livePct ≥ 100) forces BOTH zones to `nitro`.
 *
 *  Warming up (`measuring`): the live window has no priced burn yet — right after
 *  a reset, or between two long turns that only land in the jsonl once they finish
 *  — but the smooth window shows you ARE active. A raw 0× would read "underfarming"
 *  mid-sprint (a lie), so the live needle borrows the steady smooth rhythm and the
 *  UI flags it. It only truly drops to 0/underfarming once the smooth window drains
 *  too (genuinely idle ≥ smoothWindow). Excludes the capped case (livePct ≥ 100),
 *  which owns its own peg. */
export const multiplierFields = (i: MultiplierInput): MultiplierFields => {
  const paceOf = (rate: number) => paceValue(rate, i.sustainableRatePct);
  const zoneAt = (p: number): ZoneId => (i.livePct >= 100 ? "nitro" : zoneOf(p, i.bounds));
  const livePace = paceOf(i.liveRatePct);
  const smoothPace = paceOf(i.smoothRatePct);
  const measuring = i.livePct < 100 && livePace === 0 && smoothPace > 0;
  const pace = measuring ? smoothPace : livePace;
  return {
    pace,
    smoothPace,
    zone: zoneAt(pace),
    smoothZone: zoneAt(smoothPace),
    measuring,
  };
};
