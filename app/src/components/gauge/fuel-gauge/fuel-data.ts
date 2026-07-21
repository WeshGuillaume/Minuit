// Everything the fuel gauge needs that DOESN'T depend on its shape - shared by
// the portrait arc (fuel-arc.tsx) and the landscape bar (fuel-bar.tsx) so both
// light the exact same frontier from the same index math and wear the same tank
// colours. The only difference between the two renderers is where the ticks sit.

import type { GaugeReport } from "@core/types";
import type { Tick } from "@/components/ui/radial-gauge-tick";
import { cn } from "@/lib/utils";

// The fuel gauge draws this many ticks either way; shared so the arc and the bar
// resolve the same active/projected indices.
export const FUEL_TICKS = 24;

// Fuel left (%) at/below which the tank is "approaching dry": the ticks turn
// red. 15% left = 85% used, the pace zones' redlining break.
export const DRY_THRESHOLD = 15;

// A plain muted tank colour otherwise (the fuel gauge is the reality anchor, not
// the headline), red only once genuinely close to empty - a binary warning, not
// a graduated band.
const fuelColor = (fuelLeft: number): string =>
  fuelLeft <= DRY_THRESHOLD ? "var(--destructive)" : "var(--muted-foreground)";

export interface FuelData {
  signalAvailable: boolean;
  /** Percent of the cap still unspent (100 − usage): the level both renderers track. */
  fuelLeft: number;
  dry: boolean;
  color: string;
  drainColor: string;
  /** Index of today's lit frontier (−1 when the signal is down). */
  lastActiveTick: number;
  /** Index the frontier retreats to by reset at the current rate; equals
   * `lastActiveTick` when there's no live projection. */
  projectedActiveTick: number;
  /** Usage % this same rate lands you at by reset, clamped to [0, 100]. Kept
   * for the tick math; the readout shows its fuel-space complement instead. */
  landingUsagePct: number;
  /** Fuel % still unspent at reset if the rate holds (100 − `landingUsagePct`)
   * — the "N% left by reset" readout, framed like `fuelLeft` above it, not in
   * the opposite usage convention. */
  fuelLeftAtLanding: number;
  hoursUntilReset: number;
  /** True when the RAW (unclamped) landing projection hits 100% before reset
   * actually arrives — "N% by reset" would misleadingly imply you coast to
   * exactly N% right at reset, when really you run dry sooner. */
  willCapBeforeReset: boolean;
  /** Hours until the tank actually hits 0 at this rate; only meaningful when
   * `willCapBeforeReset` (Infinity/NaN otherwise, e.g. genuinely idle). */
  hoursToCap: number;
}

/** Resolve a report into the shape-independent fuel figures. `landingPct` and
 * `hoursToCap` are caller-picked (the live or smooth pair) so the projection
 * always matches whichever pace mode is on screen. */
export function fuelData(report: GaugeReport, landingPct: number, hoursToCap: number): FuelData {
  const { currentPct, signalAvailable, hoursUntilReset } = report;
  const usage = Math.max(0, Math.min(100, currentPct));
  const fuelLeft = 100 - usage;
  const landingUsagePct = Math.max(0, Math.min(100, landingPct));
  const fuelAtLanding = 100 - landingUsagePct;
  const willCapBeforeReset = signalAvailable && landingPct >= 100 && Number.isFinite(hoursToCap);
  // The pump warns — and the drain band reddens — ONLY on OVERSHOOT: when the
  // rate would blow past the cap BEFORE reset (target fuel < 0, i.e.
  // willCapBeforeReset). Draining down to exactly empty AT reset is maxxing,
  // the goal you aim for, not a danger — so any landing at 0-or-above fuel
  // reads neutral, never red.
  const dry = willCapBeforeReset;
  const color = signalAvailable ? fuelColor(fuelLeft) : "var(--muted-foreground)";
  // The "about to drain by reset" band is neutral white by default (dimmed by
  // opacity in fuelTickColors) — that fuel is on-plan spend, not a warning —
  // and only turns red when you'd overshoot the cap before reset.
  const drainColor = willCapBeforeReset ? "var(--destructive)" : "var(--foreground)";
  const showProjection = signalAvailable && fuelAtLanding < fuelLeft;
  // Mirrors RadialGauge's buildTicks(): tick i is active when i/(count-1) ≤
  // fraction, so the last active index is floor(fraction·(count-1)).
  const lastActiveTick = signalAvailable ? Math.floor((fuelLeft / 100) * (FUEL_TICKS - 1)) : -1;
  // fuelAtLanding === 0 means a TOTAL drain (landingUsagePct clamped from
  // ≥100), not just a sliver left — floor() alone would still land tick 0 in
  // the "safe" band (it's the one tick lit for any fuelAtLanding > 0 too), so
  // pin it to -1 (mirrors the no-signal convention) to pull tick 0 into the
  // drain band as well: nothing survives to reset, so no tick reads as safe.
  const projectedActiveTick = showProjection
    ? fuelAtLanding <= 0
      ? -1
      : Math.floor((fuelAtLanding / 100) * (FUEL_TICKS - 1))
    : lastActiveTick;
  return {
    signalAvailable,
    fuelLeft,
    dry,
    color,
    drainColor,
    lastActiveTick,
    projectedActiveTick,
    landingUsagePct,
    fuelLeftAtLanding: fuelAtLanding,
    hoursUntilReset,
    willCapBeforeReset,
    hoursToCap,
  };
}

/** The per-tick colours + call-outs both renderers hand to their TickRing: the
 * solid "have now" band in the tank colour, the "about to drain by reset" band
 * in red + dimmed, the frontier tick blinking at a dimmed peak. Purely index-
 * based, so it doesn't care whether the ticks sit on an arc or a line. */
export function fuelTickColors(d: FuelData) {
  return {
    activeColor: (tick: Tick) =>
      tick.index > d.projectedActiveTick && tick.index <= d.lastActiveTick ? d.drainColor : d.color,
    inactiveColor: () => `color-mix(in oklch, ${d.color} 5%, var(--deep))`,
    tickClassName: (tick: Tick) =>
      cn(
        tick.index === d.lastActiveTick && "animate-tick-blink-dim",
        tick.index > d.projectedActiveTick && tick.index < d.lastActiveTick && "opacity-60",
      ),
  };
}
