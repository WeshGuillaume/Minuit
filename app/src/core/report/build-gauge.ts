// buildGauge — the single pure entry point. It ORCHESTRATES the one-formula-per-
// file quantities into a serializable GaugeReport and reimplements none of them.
// `cc-gauge status --json` prints this object verbatim; the Tauri frontend
// consumes it. It reads no disk, clock, or network — an adapter gathers the
// GaugeInput (see src/adapters/**) and injects `now`.
//
// The only arithmetic here is time WIRING (ms → hours, window alignment), not a
// domain formula: with a live signal we align to the real reset; without one we
// fall back to a trailing window ending "now" so nothing crashes.

import type { GaugeInput, GaugeReport } from '../types';
import { windowApiValue } from '../cost/window-api-value';
import { windowSubCost } from '../subscription/window-sub-cost';
import { elapsedSubShare } from '../subscription/elapsed-sub-share';
import { profitabilityRatio } from '../ratio/profitability-ratio';
import { bindingWindow } from '../limits/binding-window';
import { dollarsPerPct } from '../calibration/dollars-per-pct';
import { calmRate } from '../calibration/calm-rate';
import { habitualRate } from '../calibration/habitual-rate';
import { breakEvenAt } from '../thresholds/break-even-at';
import { underuseEndsAt } from '../thresholds/underuse-ends-at';
import { noReturnPct } from '../thresholds/no-return-pct';
import { projectedPct } from '../projection/projected-pct';
import { hoursLeft } from '../projection/hours-left';
import { realBounds } from '../track/real-bounds';
import { zoneOf } from '../track/zone-of';

const H = 3_600_000; // ms per hour

/** Time wiring: resolve the window's reset/elapsed from the binding constraint. */
const windowClock = (
  now: number,
  resetsAt: number,
  windowSeconds: number,
): { hoursUntilReset: number; elapsedHours: number } => {
  const hoursUntilReset = Math.max(0, (resetsAt - now) / H);
  const elapsedHours = Math.max(0, windowSeconds / 3600 - hoursUntilReset);
  return { hoursUntilReset, elapsedHours };
};

export const buildGauge = (input: GaugeInput): GaugeReport => {
  const { pricing, calibration, now } = input;
  const constraint = bindingWindow(input.constraints);

  const currentPct = constraint?.usedPercent ?? 0;
  const windowSeconds = constraint?.windowSeconds ?? input.windowSeconds;
  const resetsAt = constraint?.resetsAt ?? now;
  const { hoursUntilReset, elapsedHours } = windowClock(now, resetsAt, windowSeconds);

  const monthlyUsd = pricing.subscriptions[pricing.activePlan];
  const monthDays = pricing.subscriptionPeriodDays;

  const apiValue = windowApiValue(input.events, pricing);
  const subCost = windowSubCost(monthlyUsd, windowSeconds, monthDays);
  const ratio = profitabilityRatio(apiValue, subCost);

  const dpp = dollarsPerPct(calibration.samples, calibration.instant);
  const be = breakEvenAt(pricing.ratioThresholds.breakEven, subCost, dpp.value);
  const ue = underuseEndsAt(pricing.ratioThresholds.underuse, subCost, dpp.value);
  const bounds = realBounds({ underuseEndsAt: ue, breakEvenAt: be });

  const projected = projectedPct(currentPct, calibration.remainingHours, calibration.profile);

  return {
    tool: input.tool,
    window: input.window,
    currentPct,
    projectedPct: projected,
    noReturnPct: noReturnPct(calmRate(calibration.activeHourRates), hoursUntilReset),
    breakEvenAt: be,
    underuseEndsAt: ue,
    ratio,
    breakEvenRatio: pricing.ratioThresholds.breakEven,
    apiValue,
    windowSubCost: subCost,
    elapsedSubShare: elapsedSubShare(monthlyUsd, elapsedHours, monthDays),
    hoursLeft: hoursLeft(currentPct, habitualRate(calibration.activeHourRates)),
    resetsAt,
    zone: zoneOf(currentPct, bounds),
    planLabel: input.planLabel,
    calibrated: dpp.calibrated,
    signalAvailable: constraint !== null,
  };
};
