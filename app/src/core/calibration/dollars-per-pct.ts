// dollarsPerPct: the keystone conversion, how many USD of API value equal one
// percentage point of the window's cap. It bridges the two axes, turning a
// dollar threshold (the ratio) into a position on the percent track.
//
// Formula:  dollarsPerPct = median over recent complete windows of
//           (apiValue_window / pctConsumed_window)
//
// Why calibrated on history, not the current session:
//  • at low pctConsumed you divide by a tiny number and the estimate explodes;
//  • the instantaneous value drifts with your current model mix.
// So we use a robust MEDIAN over the last N complete windows, and drop any
// window whose pctConsumed is under a floor (default 3%) to avoid the same
// small-denominator blow-up. When the sample is empty (new user) we fall back
// to the instant reading and flag calibrated=false so the UI can say so.

import { percentile } from "../stats/percentile";
import type { WindowSample } from "../types";

export interface DollarsPerPct {
  value: number;
  calibrated: boolean;
}

export const dollarsPerPct = (
  samples: WindowSample[],
  instant: WindowSample,
  floorPct = 3,
): DollarsPerPct => {
  const usable = samples.filter((s) => s.pctConsumed >= floorPct);
  if (usable.length > 0) {
    return {
      value: percentile(
        usable.map((s) => s.apiValue / s.pctConsumed),
        50,
      ),
      calibrated: true,
    };
  }
  const value = instant.pctConsumed > 0 ? instant.apiValue / instant.pctConsumed : 0;
  return { value, calibrated: false };
};
