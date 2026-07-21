// buildGauge: the single pure entry point. It ORCHESTRATES the one-formula-per-
// file quantities into a serializable GaugeReport and reimplements none of them.
// The Tauri frontend consumes this object directly. It reads no disk, clock, or
// network; an adapter gathers the
// GaugeInput (see src/adapters/**) and injects `now`.
//
// Axis 2 is a SPEEDOMETER: pace = your rate ÷ the rate that lands you exactly at
// the cap at reset (1 = maxxing). The needle reads the live/recent local burn.
// Axis 1 (profitability) is demoted to a ratio badge. The only arithmetic here
// is time WIRING (ms → hours), not a domain formula.

import { dollarsPerPct } from "../calibration/dollars-per-pct";
import { windowApiValue } from "../cost/window-api-value";
import { bindingSustainableRate } from "../limits/binding-rate";
import { bindingWindow } from "../limits/binding-window";
import { multiplierFields } from "../modes/multiplier";
import { activeFactor } from "../pace/active-hours";
import { recentRate } from "../pace/recent-rate";
import { sustainableRate } from "../pace/sustainable-rate";
import { hoursLeft } from "../projection/hours-left";
import { profitabilityRatio } from "../ratio/profitability-ratio";
import { windowSubCost } from "../subscription/window-sub-cost";
import { windowBreakdown } from "../tokens/window-breakdown";
import { paceBounds } from "../track/bounds";
import type { GaugeInput, GaugeReport, UsageEvent } from "../types";

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
  const { thresholds } = pricing.pace;
  const { readoutWindowHours, smoothWindowHours } = input;

  // Advance the anchored % with the LOCAL burn since the signal was captured, so
  // the pace stays live between the (throttled) network hits. The raw bar still
  // shows anchorPct (the exact /usage number); only the pace math uses livePct.
  const sinceAnchorUsd = windowApiValue(
    input.events.filter((e) => e.timestamp >= input.capturedAt && e.timestamp <= now),
    pricing,
  );
  const livePct = anchorPct + (dpp.value > 0 ? sinceAnchorUsd / dpp.value : 0);

  // The SMOOTH window feeds the steady pace mode (smoothPace/smoothZone) — a
  // longer average that doesn't flatline between prompts.
  const smoothEvts = recentEvents(input.events, now, smoothWindowHours);
  const smoothPct = recentRate(windowApiValue(smoothEvts, pricing), smoothWindowHours, dpp.value);
  // The short readout window drives the LIVE pace (needle/zone/center) AND the
  // usage projection (landingPct, hoursToCap), so the dial and the bar tell one
  // story — stop prompting and both ease off together. Tune the live
  // responsiveness via readoutWindowHours, the steady one via smoothWindowHours.
  const readoutEvts = recentEvents(input.events, now, readoutWindowHours);
  const readoutPct = recentRate(
    windowApiValue(readoutEvts, pricing),
    readoutWindowHours,
    dpp.value,
  );
  // Spread the headroom over the ACTIVE hours left. Work hours only compress a
  // MULTI-DAY horizon (weekly): a sub-day window (the 5h cap) uses the wall clock,
  // else its pace reads "underfarming" while the projection says you'll cap out.
  const workHours = input.workHoursPerDay;
  const activeHoursLeft = hoursUntilReset * activeFactor(windowSeconds, workHours);
  // Bind the maxxing rate on the TIGHTEST wall: a weekly window that ignores the
  // 5-hour cap (or vice-versa) would tell you to sprint into the other one.
  const sustainablePct = bindingSustainableRate(
    sustainableRate(livePct, activeHoursLeft),
    dpp.value,
    input.crossWindows.map((w) => ({
      usedPct: w.usedPct,
      hoursLeft: Math.max(0, (w.resetsAt - now) / H) * activeFactor(w.windowSeconds, workHours),
      apiValue: w.apiValue,
    })),
  );

  // Each display mode owns its own maths (core/modes/**); buildGauge just gathers
  // the shared quantities and hands them over. Adding a mode = a new core/modes/X
  // + one call here + its fields on GaugeReport + its display twin.
  const tokens = windowBreakdown(input.events);
  const multiplier = multiplierFields({
    liveRatePct: readoutPct,
    smoothRatePct: smoothPct,
    sustainableRatePct: sustainablePct,
    livePct,
    bounds: paceBounds(thresholds),
  });

  return {
    tool: input.tool,
    window: input.window,
    ...multiplier, // pace, smoothPace, zone, smoothZone
    paceThresholds: thresholds,
    smoothRatePct: smoothPct,
    sustainableRatePct: sustainablePct,
    currentPct: anchorPct,
    // Project over the ACTIVE hours left, not the wall clock: pace normalizes
    // the readout rate by activeHoursLeft, so the landing projection must use
    // the same horizon or the two disagree — the dial reads "underfarming"
    // while the bar predicts capping (you don't burn through nights/weekends).
    landingPct: livePct + readoutPct * activeHoursLeft,
    smoothLandingPct: livePct + smoothPct * activeHoursLeft,
    hoursToCap: hoursLeft(livePct, readoutPct),
    smoothHoursToCap: hoursLeft(livePct, smoothPct),
    hoursUntilReset,
    resetsAt,
    ratio: profitabilityRatio(apiValue, subCost),
    breakEvenRatio: pricing.ratioThresholds.breakEven,
    apiValue,
    planLabel: input.planLabel,
    tokens,
    calibrated: dpp.calibrated,
    signalAvailable: constraint !== null,
  };
};
