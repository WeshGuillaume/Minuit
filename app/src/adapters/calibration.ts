// Turn raw local history into the calibration bundle buildGauge needs for Axis 2.
//
// The keystone is $/percent: the API value burned in the CURRENT window equals
// the % of cap the live signal reports, so $/% = apiValue_now / usedPercent_now
// (Anthropic's real budget is opaque; we anchor on the observed pair). Every
// past active hour's dollars are then converted to %/hour through that rate,
// giving the weekday×hour profile that drives the projection.
//
// No historical %-of-cap is available per past window, so `samples` stays empty
// and buildGauge falls back to this instant reading (calibrated = false). When
// there is no live signal at all, $/% is 0 → rates 0 → the report degrades to
// "insufficient" instead of inventing a rhythm.

import type {
  GaugeInput,
  HourObservation,
  HourSlot,
  Pricing,
  RateConstraint,
  UsageEvent,
} from '@core/types';
import { windowApiValue } from '@core/cost/window-api-value';
import { rateProfile } from '@core/calibration/rate-profile';

const H = 3_600_000;

interface HourBucket {
  weekday: number;
  hour: number;
  usd: number;
}

// Group events into their calendar hour and price each bucket in USD.
const bucketByHour = (events: UsageEvent[], pricing: Pricing): HourBucket[] => {
  const groups = new Map<number, UsageEvent[]>();
  for (const event of events) {
    const key = Math.floor(event.timestamp / H);
    const list = groups.get(key) ?? [];
    if (list.length === 0) groups.set(key, list);
    list.push(event);
  }
  return [...groups].map(([key, list]) => {
    const at = new Date(key * H);
    return { weekday: at.getDay(), hour: at.getHours(), usd: windowApiValue(list, pricing) };
  });
};

const observations = (buckets: HourBucket[], dollarsPerPct: number): HourObservation[] =>
  dollarsPerPct > 0
    ? buckets.map((b) => ({ weekday: b.weekday, hour: b.hour, ratePctPerHour: b.usd / dollarsPerPct }))
    : [];

// One weighted slot per hour from now to the reset; the last hour is partial.
const remainingHours = (now: number, resetsAt: number): HourSlot[] => {
  const slots: HourSlot[] = [];
  let cursor = now;
  while (cursor < resetsAt) {
    const at = new Date(cursor);
    const end = Math.min((Math.floor(cursor / H) + 1) * H, resetsAt);
    slots.push({ weekday: at.getDay(), hour: at.getHours(), weight: (end - cursor) / H });
    cursor = end;
  }
  return slots;
};

export const buildCalibration = (
  windowEvents: UsageEvent[],
  lookbackEvents: UsageEvent[],
  pricing: Pricing,
  constraint: RateConstraint | null,
  now: number,
): GaugeInput['calibration'] => {
  const pctConsumed = constraint?.usedPercent ?? 0;
  const apiValue = windowApiValue(windowEvents, pricing);
  const dollarsPerPct = pctConsumed > 0 ? apiValue / pctConsumed : 0;
  const obs = observations(bucketByHour(lookbackEvents, pricing), dollarsPerPct);
  return {
    samples: [],
    instant: { apiValue, pctConsumed },
    activeHourRates: obs.map((o) => o.ratePctPerHour),
    profile: rateProfile(obs, pricing.projection.profilePercentile),
    remainingHours: constraint ? remainingHours(now, constraint.resetsAt) : [],
  };
};
