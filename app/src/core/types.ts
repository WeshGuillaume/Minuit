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

/**
 * The five token tiers summed over a window, plus two derived signals the UI
 * reads directly (see tokens/windowBreakdown). `perHour` is throughput over
 * ACTIVE hours; `cacheHitRate` (0..1) is cacheRead / (cacheRead + input).
 */
export interface TokenBreakdown extends TokenUsage {
  total: number; // sum of all five tiers — cacheRead-dominated, shown apart in UI
  perHour: number; // FRESH tokens/hour (excl. cacheRead) on active hours, 0 when none
  cacheHitRate: number; // 0..1, share of context reads served from cache
}

/** Per-million-token USD API rates for one model family. */
export interface ModelPrice {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite5m: number;
  cacheWrite1h: number;
}

/**
 * The pace-axis cut points, in units of `pace` (rate ÷ sustainable rate). The
 * clear/maxxing zone straddles pace 1; everything else is graded off it. Fixed
 * (not per-user) so the sweet spot is a stable target; see paceBounds.
 */
export interface PaceThresholds {
  underfarm: number; // below → "beaucoup trop lent"
  slow: number; // below → "trop lent"
  fast: number; // above → "trop vite"
  redline: number; // above → "beaucoup trop vite"
  blown: number; // above → past the cap trajectory ("over")
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
  projection: { lookbackWeeks: number };
  /** Axis-2 pace speedometer: how far back the live burn looks, and the zone cut points. */
  pace: { recentWindowHours: number; thresholds: PaceThresholds };
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

/** A zone's interval on the driving axis (pace, or percent); may be empty when low === high. */
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
    activeHourRates: number[]; // active-hour %/h → habitualRate (the ghost pace)
  };
}

/**
 * The pure result of buildGauge — exactly what `cc-gauge status --json` prints
 * and what the Tauri frontend consumes. No rendering notions live here.
 */
export interface GaugeReport {
  tool: ToolId;
  window: WindowKey;
  // ── The speedometer (Axis 2, reframed as a pace) ──────────────────────────
  // pace = your rate ÷ the rate that lands you exactly at the cap at reset.
  // 1 = maxxing. The needle reads recent burn; the ghost reads your habit.
  pace: number; // needle: live/recent speed
  habitualPace: number; // ghost: your typical speed
  paceThresholds: PaceThresholds; // the zone cut points, so the UI can draw the bands
  zone: ZoneId; // which named band the needle sits in (pace-driven; `over` when capped)
  // The three rates behind the pace, in percent-of-cap per hour (for the hover).
  recentRatePct: number; // live burn
  habitualRatePct: number; // typical burn
  sustainableRatePct: number; // the maxxing rate (headroom ÷ time left)
  // Where the needle's speed lands you, and when it would hit the cap.
  currentPct: number; // raw usage: the reality bar under the speedometer
  landingPct: number; // currentPct + recentRate × hoursUntilReset
  hoursToCap: number; // hours to the cap at the recent rate; Infinity when idle
  hoursUntilReset: number; // wall-clock hours until this window resets
  resetsAt: number; // ms epoch
  // ── The profitability flex (Axis 1, demoted to a badge) ───────────────────
  ratio: number; // API value ÷ this window's subscription cost (e.g. 58×)
  breakEvenRatio: number; // ratio at/above which Anthropic is "at a loss"
  apiValue: number; // USD of API value farmed this window
  // ── Descriptive & signal quality ──────────────────────────────────────────
  planLabel: string;
  tokens: TokenBreakdown; // I/O + cache mix; independent of the axes
  calibrated: boolean; // dollarsPerPct came from history, not the instant
  signalAvailable: boolean; // the OAuth usage signal was reachable
}
