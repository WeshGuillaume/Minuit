// buildGauge: the single pure entry point. It ORCHESTRATES the one-formula-per-
// file quantities into a serializable GaugeReport and reimplements none of them.
// `cc-gauge status --json` prints this object verbatim; the Tauri frontend
// consumes it. It reads no disk, clock, or network; an adapter gathers the
// GaugeInput (see src/adapters/**) and injects `now`.
//
// Axis 2 is a SPEEDOMETER: pace = your rate ÷ the rate that lands you exactly at
// the cap at reset (1 = maxxing). The needle reads the live/recent local burn;
// the ghost reads your habitual pace. Axis 1 (profitability) is demoted to a
// ratio badge. The only arithmetic here is time WIRING (ms → hours), not a
// domain formula.

import type { GaugeInput, GaugeReport, UsageEvent } from '../types';
import { windowApiValue } from '../cost/window-api-value';
import { windowBreakdown } from '../tokens/window-breakdown';
import { windowSubCost } from '../subscription/window-sub-cost';
import { profitabilityRatio } from '../ratio/profitability-ratio';
import { bindingWindow } from '../limits/binding-window';
import { dollarsPerPct } from '../calibration/dollars-per-pct';
import { habitualRate } from '../calibration/habitual-rate';
import { sustainableRate } from '../pace/sustainable-rate';
import { recentRate } from '../pace/recent-rate';
import { paceValue } from '../pace/pace-value';
import { paceBounds } from '../pace/pace-bounds';
import { hoursLeft } from '../projection/hours-left';
import { zoneOf } from '../track/zone-of';

const H = 3_600_000; // ms per hour

/** Local turns priced into the last `hours` before `now`: the live-burn window. */
const recentEvents = (events: UsageEvent[], now: number, hours: number): UsageEvent[] => {
  const from = now - hours * H;
  return events.filter((e) => e.timestamp >= from && e.timestamp <= now);
};

export const buildGauge = (input: GaugeInput): GaugeReport => {
  const { pricing, calibration, now } = input;
  const constraint = bindingWindow(input.constraints);

  const anchorPct = constraint?.usedPercent ?? 0;
  const windowSeconds = constraint?.windowSeconds ?? input.windowSeconds;
  const resetsAt = constraint?.resetsAt ?? now;
  const hoursUntilReset = Math.max(0, (resetsAt - now) / H);

  const apiValue = windowApiValue(input.events, pricing);
  const subCost = windowSubCost(
    pricing.subscriptions[pricing.activePlan],
    windowSeconds,
    pricing.subscriptionPeriodDays,
  );

  const dpp = dollarsPerPct(calibration.samples, calibration.instant);
  const { recentWindowHours, thresholds } = pricing.pace;

  // Advance the anchored % with the LOCAL burn since the signal was captured, so
  // the pace stays live between the (throttled) network hits. The raw bar still
  // shows anchorPct (the exact /usage number); only the pace math uses livePct.
  const sinceAnchorUsd = windowApiValue(
    input.events.filter((e) => e.timestamp >= input.capturedAt && e.timestamp <= now),
    pricing,
  );
  const livePct = anchorPct + (dpp.value > 0 ? sinceAnchorUsd / dpp.value : 0);

  const recentUsd = windowApiValue(recentEvents(input.events, now, recentWindowHours), pricing);
  const recentPct = recentRate(recentUsd, recentWindowHours, dpp.value);
  const habitualPct = habitualRate(calibration.activeHourRates);
  const sustainablePct = sustainableRate(livePct, hoursUntilReset);

  return {
    tool: input.tool,
    window: input.window,
    pace: paceValue(recentPct, sustainablePct),
    habitualPace: paceValue(habitualPct, sustainablePct),
    paceThresholds: thresholds,
    zone: livePct >= 100 ? 'over' : zoneOf(paceValue(recentPct, sustainablePct), paceBounds(thresholds)),
    recentRatePct: recentPct,
    habitualRatePct: habitualPct,
    sustainableRatePct: sustainablePct,
    currentPct: anchorPct,
    landingPct: livePct + recentPct * hoursUntilReset,
    hoursToCap: hoursLeft(livePct, recentPct),
    hoursUntilReset,
    resetsAt,
    ratio: profitabilityRatio(apiValue, subCost),
    breakEvenRatio: pricing.ratioThresholds.breakEven,
    apiValue,
    planLabel: input.planLabel,
    tokens: windowBreakdown(input.events),
    calibrated: dpp.calibrated,
    signalAvailable: constraint !== null,
  };
};
