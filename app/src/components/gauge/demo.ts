// Screenshot / demo mode: synthetic GaugeReports that pin the speedometer into
// each named zone (Underfarming through Nitro) without touching real usage. Activated
// from the DemoPicker overlay, which stores the active scenario id in localStorage;
// loadReport (source.ts) short-circuits to demoReport() when one is set, so the
// entire real render pipeline paints these numbers unchanged. Inert otherwise:
// no scenario stored → demoReport() returns null and the live path runs.
//
// Everything is COHERENT by construction: each scenario is a token volume, and
// apiValue / tokens / ratio all flow from the SAME synthetic events through the
// real pure core (windowApiValue, windowBreakdown, profitabilityRatio), never
// three independently-invented numbers. The pace rates are derived from currentPct
// and time-to-reset so pace 1 lands exactly at the cap.

import { windowApiValue } from "@core/cost/window-api-value";
import { profitabilityRatio } from "@core/ratio/profitability-ratio";
import { windowSubCost } from "@core/subscription/window-sub-cost";
import { windowBreakdown } from "@core/tokens/window-breakdown";
import type { GaugeReport, ToolId, UsageEvent, WindowKey, ZoneId } from "@core/types";
import { DEFAULT_PRICING } from "../../adapters/pricing.default";

const H = 3_600_000;
const SEVEN_DAY_HOURS = 168;
const WINDOW_HOURS: Record<WindowKey, number> = {
  five_hour: 5,
  seven_day: SEVEN_DAY_HOURS,
};

// One active hour of heavy Opus work: the fixed "working intensity". Scenarios
// differ only in how MANY such hours they stack, so throughput and cache-hit rate
// stay constant while volume (and thus apiValue / ratio) scales with the zone.
const PER_HOUR: Omit<UsageEvent, "uuid" | "timestamp" | "model"> = {
  input: 680_000,
  output: 250_000,
  cacheRead: 10_000_000,
  cacheWrite5m: 900_000,
  cacheWrite1h: 135_000,
};

export interface DemoScenario {
  id: string;
  key: string; // keyboard digit that selects it in the picker
  label: string;
  zone: ZoneId;
  pace: number; // needle
  currentPct: number; // raw usage anchor under the dial
  resetFraction: number; // share of the window still left before reset (0..1)
  activeHours: number; // active hours of work over a 7-day window (scaled per window)
  measuring?: boolean; // warming up: live window empty, pace stands in with the smooth rhythm
}

// pace values sit clearly inside each band (cuts at 0.5 / 0.85 / 1.15 / 1.5 / 2.0,
// see paceBounds). Capped forces currentPct ≥ 100.
export const SCENARIOS: readonly DemoScenario[] = [
  {
    id: "underfarming",
    key: "1",
    label: "Underfarming",
    zone: "underfarming",
    pace: 0.3,
    currentPct: 11,
    resetFraction: 0.62,
    activeHours: 11,
  },
  {
    id: "coasting",
    key: "2",
    label: "Coasting",
    zone: "coasting",
    pace: 0.68,
    currentPct: 34,
    resetFraction: 0.55,
    activeHours: 24,
  },
  {
    id: "maxxing",
    key: "3",
    label: "Maxxing",
    zone: "maxxing",
    pace: 1.0,
    currentPct: 52,
    resetFraction: 0.48,
    activeHours: 38,
  },
  {
    id: "redlining",
    key: "4",
    label: "Redlining",
    zone: "redlining",
    pace: 1.3,
    currentPct: 63,
    resetFraction: 0.4,
    activeHours: 49,
  },
  {
    id: "turbo",
    key: "5",
    label: "Turbo",
    zone: "turbo",
    pace: 1.8,
    currentPct: 78,
    resetFraction: 0.3,
    activeHours: 62,
  },
  {
    id: "nitro",
    key: "6",
    label: "Nitro",
    zone: "nitro",
    pace: 2.2,
    currentPct: 100,
    resetFraction: 0.18,
    activeHours: 76,
  },
  {
    // Fresh window, prompts running but nothing priced in the live window yet: the
    // needle borrows the smooth rhythm (maxxing) and the live caption reads
    // "Warming up" instead of a dishonest 0×/underfarming. See core/modes/multiplier.
    id: "warming",
    key: "7",
    label: "Warming up",
    zone: "maxxing",
    pace: 1.0,
    currentPct: 8,
    resetFraction: 0.87,
    activeHours: 20,
    measuring: true,
  },
];

const SCENARIO_BY_ID = Object.fromEntries(SCENARIOS.map((s) => [s.id, s]));

const STORAGE_KEY = "minuit:demo";

export const readDemoScenario = (): string | null => localStorage.getItem(STORAGE_KEY);

export const writeDemoScenario = (id: string | null): void => {
  if (id) localStorage.setItem(STORAGE_KEY, id);
  else localStorage.removeItem(STORAGE_KEY);
};

// `count` distinct-hour Opus turns, one per clock-hour back from `now`, so
// windowBreakdown reads `count` active hours and windowApiValue prices the lot.
const syntheticEvents = (count: number, now: number): UsageEvent[] =>
  Array.from({ length: count }, (_, i) => ({
    ...PER_HOUR,
    uuid: `demo-${i}`,
    timestamp: now - i * H,
    model: "claude-opus-4-8",
  }));

const toReport = (s: DemoScenario, tool: ToolId, window: WindowKey): GaugeReport => {
  const now = Date.now();
  const windowHours = WINDOW_HOURS[window];
  const hoursUntilReset = s.resetFraction * windowHours;

  // Rate math off a pre-cap anchor so the sustainable/recent rates stay positive
  // and coherent even for the capped scenario; the usage bar still shows currentPct.
  const rateAnchor = Math.min(s.currentPct, 96);
  const sustainableRatePct = (100 - rateAnchor) / hoursUntilReset;
  const smoothRatePct = s.pace * sustainableRatePct;

  const activeHours = Math.max(1, Math.round(s.activeHours * (windowHours / SEVEN_DAY_HOURS)));
  const events = syntheticEvents(activeHours, now);
  const tokens = windowBreakdown(events);
  const apiValue = windowApiValue(events, DEFAULT_PRICING);
  const subCost = windowSubCost(
    DEFAULT_PRICING.subscriptions[DEFAULT_PRICING.activePlan],
    windowHours * 3_600,
    DEFAULT_PRICING.subscriptionPeriodDays,
  );

  return {
    tool,
    window,
    pace: s.pace,
    smoothPace: s.pace,
    paceThresholds: DEFAULT_PRICING.pace.thresholds,
    zone: s.zone,
    smoothZone: s.zone,
    smoothRatePct,
    sustainableRatePct,
    currentPct: s.currentPct,
    landingPct: rateAnchor + smoothRatePct * hoursUntilReset,
    smoothLandingPct: rateAnchor + smoothRatePct * hoursUntilReset,
    hoursToCap: smoothRatePct > 0 ? (100 - rateAnchor) / smoothRatePct : Infinity,
    smoothHoursToCap: smoothRatePct > 0 ? (100 - rateAnchor) / smoothRatePct : Infinity,
    hoursUntilReset,
    resetsAt: now + hoursUntilReset * H,
    ratio: profitabilityRatio(apiValue, subCost),
    breakEvenRatio: DEFAULT_PRICING.ratioThresholds.breakEven,
    apiValue,
    planLabel: "Max 20×",
    tokens,
    calibrated: true,
    signalAvailable: true,
    measuring: s.measuring ?? false,
  };
};

/** The active demo report, or null when demo mode is off (live path then runs). */
export const demoReport = (tool: ToolId, window: WindowKey): GaugeReport | null => {
  const id = readDemoScenario();
  const s = id ? SCENARIO_BY_ID[id] : undefined;
  return s ? toReport(s, tool, window) : null;
};
