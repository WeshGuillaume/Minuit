// Shared domain types for Minuit. Pure data, zero runtime logic, zero I/O.
//
// These types are the lingua franca between two layers that never import each
// other's internals: the calculation core (src/core/**) and the I/O adapters
// (src/adapters/**), consumed by the Tauri frontend (src/components/**, src/pages/**).
//
// Multi-tool by construction: a `ToolId` only ever tells an *adapter* which
// provider's files/endpoints to read. The calculation core never branches on it;
// it only ever sees a `UsageEvent[]` and a `Pricing`, whatever the tool. That
// is what lets Codex / Gemini / Copilot be added later as new adapters, without
// touching a single formula.

/**
 * Coding assistants whose usage we can gauge. Only `claude` is wired today;
 * the others are reserved so the UI's Tool <select> and the adapter registry
 * can grow without reaching into the calculation core.
 */
export type ToolId = "claude" | "codex" | "gemini" | "copilot";

/** The two rate-limit windows Anthropic exposes on the usage signal. */
export type WindowKey = "five_hour" | "seven_day";

export interface WindowDef {
  key: WindowKey;
  label: string;
  seconds: number;
}

/** The six graduated pace zones, slowest to fastest (also their track order).
 *  This is the ONE canonical name for each zone: the same string is the zone id,
 *  the display label (capitalized), and the CSS color token (`--pace-${id}`). No
 *  parallel codename vocabulary — what you read here is what the UI shows. */
export type ZoneId = "underfarming" | "coasting" | "maxxing" | "redlining" | "turbo" | "nitro";

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
  total: number; // sum of all five tiers, cacheRead-dominated, shown apart in UI
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
 * Pace cut points, in units of `pace` (rate ÷ sustainable rate). Each key is the
 * pace at which you ENTER the zone it names, going up from `underfarming` (which
 * starts at 0): so `maxxing: 0.85` means the sweet spot opens at pace 0.85, and
 * `turbo: 1.5` means Turbo opens at 1.5. Reading a key tells you exactly which
 * zone boundary it is — no `redline`-vs-`Redlining` trap. Fixed (not per-user)
 * so the sweet spot is a stable target; see track/bounds.
 */
export interface PaceThresholds {
  coasting: number; // enter Coasting (leave Underfarming)
  maxxing: number; // enter Maxxing — the sweet spot opens
  redlining: number; // enter Redlining (too fast)
  turbo: number; // enter Turbo (well over sustainable)
  nitro: number; // enter Nitro — past the cap trajectory
}

/** Everything editable when Anthropic changes plans/prices; see pricing.json. */
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
  /** Axis-2 pace speedometer: just the zone cut points. Both smoothing windows
   *  (live + smooth) are runtime UI prefs resolved per rate-limit window in
   *  config.json and passed on GaugeInput, not economic constants — they live
   *  outside pricing. */
  pace: { thresholds: PaceThresholds };
}

/**
 * One rate-limit constraint from the /api/oauth/usage signal. A Max plan can
 * expose several at once (all-models weekly, Sonnet-only, …), so these are
 * always handled as an independent list, never a single value (see
 * limits/bindingWindow).
 */
export interface RateConstraint {
  key: string;
  label: string;
  usedPercent: number; // 0..100, usage as a fraction of this constraint's cap
  resetsAt: number; // ms epoch
  windowSeconds: number;
}

/** Back-compat alias: adapters historically called these "rate windows". */
export type RateWindow = RateConstraint;

export interface RateState {
  capturedAt: number; // ms epoch: when the usage signal was fetched/cached
  windows: RateConstraint[];
}

// ── Calibration sample types (produced by adapters from history) ────────────

/** One completed past window: total API value against the % of cap it burned. */
export interface WindowSample {
  apiValue: number;
  pctConsumed: number;
}

/** A zone's interval on the driving axis (pace, or percent); may be empty when low === high. */
export interface ZoneBound {
  id: ZoneId;
  low: number;
  high: number;
}

// ── The single serializable output the whole app is built around ────────────

/** Everything an adapter must gather so buildGauge can stay pure. */
export interface GaugeInput {
  tool: ToolId;
  window: WindowKey;
  now: number; // ms epoch: injected, never read from the clock inside core
  /** ms epoch when the live usage signal was observed; `now` when there is none.
   *  buildGauge advances currentPct with local burn since this moment (see livePct). */
  capturedAt: number;
  pricing: Pricing;
  planLabel: string;
  /** Windowed, deduped turns whose API value feeds Axis 1. */
  events: UsageEvent[];
  /** Live rate constraints; the binding one drives currentPct. Empty = no signal. */
  constraints: RateConstraint[];
  /** Selected window length, used when there is no live signal to align to. */
  windowSeconds: number;
  /** The OTHER live caps (not the selected window): used% + reset + $ burned +
   *  length of each, so the pace can bind on the tightest wall with the right
   *  active-hours factor per window (see limits/binding-rate, pace/active-hours). */
  crossWindows: { usedPct: number; resetsAt: number; apiValue: number; windowSeconds: number }[];
  /** Hours/day you work (~/.minuit config, default 24). Spreads the sustainable
   *  rate over active hours instead of the wall clock; 24 = the neutral case. */
  workHoursPerDay: number;
  /** The LIVE pace window in hours, already resolved for the SELECTED rate-limit
   *  window (~/.minuit `pace.readoutMinutes`, per-window). Shorter = nervier
   *  needle/zone/center and usage projection; longer = calmer. */
  readoutWindowHours: number;
  /** The SMOOTH pace window in hours, resolved for the SELECTED window
   *  (~/.minuit `pace.smoothMinutes`, per-window). The steady recent rhythm that
   *  doesn't flatline between prompts. */
  smoothWindowHours: number;
  calibration: {
    samples: WindowSample[]; // completed windows → dollarsPerPct
    instant: WindowSample; // fallback when samples is empty
  };
}

/**
 * The pure result of buildGauge: exactly what the Tauri frontend consumes.
 * No rendering notions live here.
 */
export interface GaugeReport {
  tool: ToolId;
  window: WindowKey;
  // ── The speedometer (Axis 2, reframed as a pace) ──────────────────────────
  // pace = your rate ÷ the rate that lands you exactly at the cap at reset.
  // 1 = maxxing. Two smoothings of the SAME metric, user-toggled: `pace` is the
  // LIVE speed (readoutWindowHours) — nervous, eases to 0 when idle; `smoothPace`
  // is the same pace over the longer smoothWindowHours — steady, your recent
  // rhythm. Each carries its own zone. When `measuring` (see below), `pace`/`zone`
  // borrow the smooth rhythm rather than reading a dishonest 0× mid-sprint.
  pace: number; // live needle/zone/center (readoutWindowHours)
  smoothPace: number; // smoothed needle/zone/center (smoothWindowHours)
  paceThresholds: PaceThresholds; // the zone cut points, so the UI can draw the bands
  zone: ZoneId; // the live pace's band (`nitro` when capped)
  smoothZone: ZoneId; // the smoothed pace's band (`nitro` when capped)
  // The rates behind the pace, in percent-of-cap per hour (for the hover).
  smoothRatePct: number; // smoothed burn (smoothWindowHours)
  sustainableRatePct: number; // the maxxing rate (headroom ÷ time left)
  // Where the needle's speed lands you, and when it would hit the cap.
  currentPct: number; // raw usage: the reality bar under the speedometer
  landingPct: number; // livePct + live (readout) rate × ACTIVE hours left (same horizon as pace)
  hoursToCap: number; // hours to the cap at the live (readout) rate; Infinity when idle
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
  // Live window has no priced burn yet but the smooth window shows activity: the
  // live pace/zone above are standing in with the smooth rhythm (warming up), not
  // asserting a real 0×/underfarming. See core/modes/multiplier.
  measuring: boolean;
}
