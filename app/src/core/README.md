# core — the speedometer, its values, and how to read them

Quick reference for what every gauge quantity means and the design choices behind
them. `buildGauge` (`report/build-gauge.ts`) is the single pure entry point: it
gathers the shared quantities and asks each **mode** for its fields. For folder
conventions see `CLAUDE.md`; this file is the "what does this number mean" map.

## The one idea

It's a **speedometer**, not a level gauge. `pace = your burn rate ÷ the rate that
grazes the cap exactly at reset`. `1 = maxxing` (max value, never hit the wall).
Below 1 = underfarming; above 1 = you'll cap out early.

```
sustainableRate = (100 − livePct) / activeHoursLeft     %/h that grazes the cap
pace            = recentRate / sustainableRate           1 = maxxing
```

## The three time windows (why a number moves — or doesn't)

Every quantity is recomputed every **15s** (`use-report.ts` `REFRESH_MS`), but
whether its *value* moves depends on which window it measures. The OAuth network
call stays throttled to **180s**; the 15s tick only re-reads local JSONL.

| Window | Value | Feeds | Behaviour |
|---|---|---|---|
| `pace.recentWindowHours` | **0.5h** | the **needle** (`pace`, `recentRatePct`) | stable, eases over minutes |
| `pace.readoutWindowHours` | **~1min** (`0.01667`) | the **center readouts** (`readoutPace`, `recentPerHour`) | live — **drops to 0 when no prompt is running** |
| `projection.lookbackWeeks` | 4 weeks | calibration (`dollarsPerPct`) | slow, historical |

Key consequence: the **needle is smoothed** (0.5h) so it doesn't twitch between
prompts, while the **big center number is instantaneous** (~1min) so it reads like
a real speedometer easing back to 0. This split is deliberate and applies to
**both** modes (Nx and tok/h).

## GaugeReport fields

### The speedometer (pace axis)
| Field | Meaning | Window |
|---|---|---|
| `pace` | needle: live/recent speed | 0.5h |
| `readoutPace` | Nx center: instantaneous pace → 0 when idle | ~1min |
| `zone` | named band the **needle** sits in (`over` when capped) | 0.5h |
| `recentRatePct` / `sustainableRatePct` | the rates behind pace, in %-of-cap per hour | — |
| `paceThresholds` | zone cut points (so the UI can draw the bands) | — |

### The tok/h readout (token axis)
| Field | Meaning | Window |
|---|---|---|
| `recentPerHour` | tok/h center: fresh tokens/h → 0 when idle | ~1min |
| `sustainableTokPerHour` | the tok/h that grazes the cap = the **"1×" tick** | 0.5h/window |

`sustainableTokPerHour` is anchored so `recentPerHour ÷ sustainableTokPerHour ≈
pace` — the token readout sits where the pace needle points. "fresh" tokens =
everything except `cacheRead` (re-read cache would dwarf the rate).

### Reality anchor & projection
| Field | Meaning |
|---|---|
| `currentPct` | raw usage bar — the exact `/usage` number (not extrapolated) |
| `landingPct` | where the recent rate lands you at reset (`livePct + recentRate × activeHoursLeft`, the same active-hours horizon pace normalizes by) |
| `hoursToCap` | hours to the cap at the recent rate; `Infinity` when idle |
| `hoursUntilReset` / `resetsAt` | wall-clock to this window's reset |

Note: `currentPct` is the exact anchor; the pace maths use `livePct` =
`currentPct + local $ burned since the signal was captured ÷ dollarsPerPct`, so
pace stays live between the throttled network hits.

### Profitability flex (demoted to a badge)
| Field | Meaning |
|---|---|
| `ratio` | API value ÷ this window's subscription cost (e.g. 58×) |
| `breakEvenRatio` | ratio at/above which Anthropic is "at a loss" |
| `apiValue` | USD of API value farmed this window |

### Descriptive & signal quality
`planLabel` · `tokens` (I/O + cache mix) · `calibrated` (dollarsPerPct came from
history, not the instant) · `signalAvailable` (the OAuth usage signal was reachable).

## The zones (pace axis, slowest → fastest)

`Underfarming` < 0.5 · `Coasting` < 0.85 · **`Maxxing` 0.85–1.15** · `Redlining`
< 1.5 · `Way Too Fast` < 2 · `Capped` (real usage ≥ 100%, forced). The dial track
is **broken** (fixed widths) so maxxing reads as a big central target despite its
narrow pace range.

## Display modes (how a value is drawn)

Two modes, cycled by clicking the center. Each is a vertical slice: its **maths**
live in `core/modes/<mode>/`, its **display** in `components/gauge/modes/<mode>/`.
Adding a mode = a new folder each side + one call in `buildGauge` + its fields on
`GaugeReport`. Deleting = remove the folders + the call/fields.

| Mode | Center | Ticks | Core module |
|---|---|---|---|
| **multiplier** (Nx) | `readoutPace` as `1.2×`, caption = zone | `0.5× / 1× / 1.5×` | `core/modes/multiplier` |
| **token-hour** (tok/h) | `recentPerHour` as `320k` | tokens via the 1× anchor | `core/modes/token-hour` |

Each mode's **axis** is chosen per-user (see config below):
- **broken** — the fixed pace track; maxxing is a big central target.
- **linear** — a straight `0 → 2.5×` axis; true proportions, evenly spaced ticks
  (maxxing shows as the narrow band it really is), a right-side label.

The needle geometry and zone bands live once in
`components/gauge/modes/axis.ts`; a mode supplies only its labels + center.

## Multiple caps — the binding rate (`limits/binding-rate.ts`)

Max plans expose **several independent walls** (a rolling 5-hour cap AND a weekly
one). The pace for one window would ignore the other, so "maxxing weekly" could
send you into the 5-hour wall. `sustainableRate` is therefore **bound on the
tightest wall**, compared in a common unit ($/h, cap-independent):

```
sustainable_$/h per cap = remaining_$ / active hours left
remaining_$             = apiValue × (100 − used%) / used%   (instant per-window calibration)
binding                 = min over all caps  → back to selected-window %/h
```

The selected window passes through unchanged when it's the tightest; another cap
only ever *lowers* the sustainable rate (raises pace). The tabs stay as a
per-window drill-down; the pace always reflects the binding wall.

## Configuration — `~/.minuit/config.json`

Frontend-read keys (native side writes the file; see `src-tauri/src/config.rs`
for the template). Any missing/invalid value falls back to its default.

| Key | Default | Effect |
|---|---|---|
| `work.hoursPerDay` | `24` | Compresses the maxxing horizon to your working hours — but **only for multi-day windows** (weekly). A sub-day window (the rolling 5h cap) stays on the wall clock, else its pace reads "slow" while the projection says you'll cap out (see `pace/active-hours`). Lower = higher maxxing rate on the weekly; 24 = neutral. |
| `display.paceAxis` | `"broken"` | Nx dial axis: `broken` or `linear`. |
| `display.tokenAxis` | `"linear"` | tok/h dial axis: `broken` or `linear`. |

Tuning knobs live in `pricing.json → pace`: `recentWindowHours` (needle),
`readoutWindowHours` (center readout — shorter = drops to 0 sooner).

## Where the maths live

```
core/
  report/build-gauge.ts     orchestrator (pure) — gathers shared quantities, calls each mode
  modes/multiplier/         pace-value.ts + multiplierFields → { pace, smoothPace, zone }
  modes/token-hour/         tok-per-hour.ts + tokenHourFields → { recentPerHour, sustainableTokPerHour }
  pace/                     SHARED: recent-rate, sustainable-rate, pace-bounds
  limits/                   binding-window (which cap drives currentPct) + binding-rate (min sustainable)
  calibration/              dollarsPerPct
  tokens/                   window-breakdown (fresh vs cache mix, cacheHitRate)
```

## Gotchas

- **Bump `SCHEMA` in `components/gauge/report-cache.ts` on any `GaugeReport`
  shape change.** The cached last-good report is repainted on cold start; an
  old-shape blob against new UI crashes on a missing field. The version bump makes
  stale keys simply not match.
- The needle and the center number **measure different windows on purpose** — if
  the center reads 0 while the needle sits mid-dial, that's idle-right-now vs
  your-last-half-hour, not a bug.
- `currentPct` (raw bar) is the exact anchor; everything pace-related uses the
  locally-extrapolated `livePct`.
