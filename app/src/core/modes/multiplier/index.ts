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
}

/** The report fields the Nx dial reads. `pace`/`zone` ride the short live window
 *  (nervous, eases to 0 when idle); `smoothPace`/`smoothZone` ride the longer
 *  window (steady). Capped usage (livePct ≥ 100) forces BOTH zones to `nitro`. */
export const multiplierFields = (i: MultiplierInput): MultiplierFields => {
  const paceOf = (rate: number) => paceValue(rate, i.sustainableRatePct);
  const zoneAt = (p: number): ZoneId => (i.livePct >= 100 ? "nitro" : zoneOf(p, i.bounds));
  const pace = paceOf(i.liveRatePct);
  const smoothPace = paceOf(i.smoothRatePct);
  return {
    pace,
    smoothPace,
    zone: zoneAt(pace),
    smoothZone: zoneAt(smoothPace),
  };
};
