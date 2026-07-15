// Shared domain types for cc-gauge. Pure data — zero runtime logic, zero I/O.
//
// These types are the lingua franca between three layers that never import each
// other's internals: the calculation core (src/core/**), the I/O adapters
// (src/adapters/**), and the presentation front-ends (CLI + future Tauri app).
//
// Multi-tool by construction: a `ToolId` only ever tells an *adapter* which
// provider's files/endpoints to read. The calculation core never branches on it
// — it only ever sees a `UsageEvent[]` and a `Pricing`, whatever the tool. That
// is what lets Codex / Gemini / Copilot be added later as new adapters, without
// touching a single formula.

/**
 * Coding assistants whose usage we can gauge. Only `claude` is wired today;
 * the others are reserved so the UI's Tool <select> and the adapter registry
 * can grow without reaching into the calculation core.
 */
export type ToolId = 'claude' | 'codex' | 'gemini' | 'copilot';

/** The two rate-limit windows Anthropic exposes on the usage signal. */
export type WindowKey = 'five_hour' | 'seven_day';

export interface WindowDef {
  key: WindowKey;
  label: string;
  seconds: number;
}

/** The six graduated states of the track, in track order. */
export type ZoneId = 'underuse' | 'profitable' | 'clear' | 'warn' | 'noreturn' | 'over';

/**
 * A raw token breakdown for a single priced turn. Each tier is billed at a
 * different rate, so they are never summed before pricing (see cost/tokenCost).
 */
export interface TokenUsage {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite5m: number;
  cacheWrite1h: number;
}

/** One priced assistant turn, extracted & deduped from a provider's logs. */
export interface UsageEvent extends TokenUsage {
  uuid: string;
  timestamp: number; // ms epoch
  model: string;
}

/** Per-million-token USD API rates for one model family. */
export interface ModelPrice {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite5m: number;
  cacheWrite1h: number;
}

/** Everything editable when Anthropic changes plans/prices — see pricing.json. */
export interface Pricing {
  updated: string;
  models: Record<string, ModelPrice>;
  match: Array<{ pattern: string; family: string }>;
  subscriptions: Record<string, number>;
  activePlan: string;
  /** Average month length in days used to prorate the subscription (30.44). */
  subscriptionPeriodDays: number;
  ratioThresholds: { underuse: number; breakEven: number };
  projection: { lookbackWeeks: number; profilePercentile: number };
}

/**
 * One rate-limit constraint from the /api/oauth/usage signal. A Max plan can
 * expose several at once (all-models weekly, Sonnet-only, …), so these are
 * always handled as an independent list — never a single value (see
 * limits/bindingWindow).
 */
export interface RateConstraint {
  key: string;
  label: string;
  usedPercent: number; // 0..100, usage as a fraction of this constraint's cap
  resetsAt: number; // ms epoch
  windowSeconds: number;
}

/** Back-compat alias — adapters historically called these "rate windows". */
export type RateWindow = RateConstraint;

export interface RateState {
  capturedAt: number; // ms epoch — when the usage signal was fetched/cached
  windows: RateConstraint[];
}

// ── Calibration sample types (produced by adapters from history) ────────────

/** One completed past window: total API value against the % of cap it burned. */
export interface WindowSample {
  apiValue: number;
  pctConsumed: number;
}

/** One observed active hour of consumption, in percent-of-cap per hour. */
export interface HourObservation {
  weekday: number; // 0..6 (0 = Sunday)
  hour: number; // 0..23
  ratePctPerHour: number;
}

/** One future hour between now and the reset, weighted (1 = full, <1 = partial). */
export interface HourSlot {
  weekday: number; // 0..6
  hour: number; // 0..23
  weight: number; // 0..1
}

/** Expected %/hour indexed [weekday 0..6][hour 0..23]; empty cells are 0. */
export type RateProfile = number[][];

/** A zone's real interval on the percent axis (may be empty when low === high). */
export interface SegmentBound {
  id: ZoneId;
  low: number;
  high: number;
}

// ── The single serializable output the whole app is built around ────────────

/** Everything an adapter must gather so buildGauge can stay pure. */
export interface GaugeInput {
  tool: ToolId;
  window: WindowKey;
  now: number; // ms epoch — injected, never read from the clock inside core
  pricing: Pricing;
  planLabel: string;
  /** Windowed, deduped turns whose API value feeds Axis 1. */
  events: UsageEvent[];
  /** Live rate constraints; the binding one drives currentPct. Empty = no signal. */
  constraints: RateConstraint[];
  /** Selected window length, used when there is no live signal to align to. */
  windowSeconds: number;
  calibration: {
    samples: WindowSample[]; // completed windows → dollarsPerPct
    instant: WindowSample; // fallback when samples is empty
    activeHourRates: number[]; // active-hour %/h → calmRate & habitualRate
    profile: RateProfile; // weekday×hour P75 → projectedPct
    remainingHours: HourSlot[]; // now → reset, per hour → projectedPct
  };
}

/**
 * The pure result of buildGauge — exactly what `cc-gauge status --json` prints
 * and what the Tauri frontend consumes. No rendering notions live here.
 */
export interface GaugeReport {
  tool: ToolId;
  window: WindowKey;
  // Axis-2 positions, expressed as percent of the window's real cap.
  currentPct: number;
  projectedPct: number;
  noReturnPct: number;
  // Axis-1 thresholds, projected onto the same percent axis.
  breakEvenAt: number;
  underuseEndsAt: number;
  // Axis-1 raw figures.
  ratio: number;
  breakEvenRatio: number; // ratio at/above which Anthropic is "at a loss"
  apiValue: number;
  windowSubCost: number;
  elapsedSubShare: number;
  // Projections.
  hoursLeft: number; // Infinity when the habitual rate is 0
  resetsAt: number; // ms epoch
  // Presentation-ready derived state.
  zone: ZoneId;
  planLabel: string;
  // Signal quality.
  calibrated: boolean; // dollarsPerPct came from history, not the instant
  signalAvailable: boolean; // the OAuth usage signal was reachable
}
