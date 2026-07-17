// Turn raw local history into the calibration bundle buildGauge needs for Axis 2.
//
// The keystone is $/percent: the API value burned in the CURRENT window equals
// the % of cap the live signal reports, so $/% = apiValue_now / usedPercent_now
// (Anthropic's real budget is opaque; we anchor on the observed pair).
//
// No historical %-of-cap is available per past window, so `samples` stays empty
// and buildGauge falls back to this instant reading (calibrated = false). When
// there is no live signal at all, $/% is 0 → the report degrades to
// "insufficient" instead of inventing a rhythm.

import { windowApiValue } from "@core/cost/window-api-value";
import type { GaugeInput, Pricing, RateConstraint, UsageEvent } from "@core/types";

export const buildCalibration = (
  windowEvents: UsageEvent[],
  pricing: Pricing,
  constraint: RateConstraint | null,
): GaugeInput["calibration"] => {
  const pctConsumed = constraint?.usedPercent ?? 0;
  const apiValue = windowApiValue(windowEvents, pricing);
  return {
    samples: [],
    instant: { apiValue, pctConsumed },
  };
};
