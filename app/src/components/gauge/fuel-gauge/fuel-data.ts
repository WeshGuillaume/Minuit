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

// Fuel left (%) at/below which the tank is "approaching dry": the warning light
// and the ticks turn red. 15% left = 85% used, the pace zones' redlining break.
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
  hoursUntilReset: number;
}

/** Resolve a report into the shape-independent fuel figures. */
export function fuelData(report: GaugeReport): FuelData {
  const { currentPct, landingPct, signalAvailable, hoursUntilReset } = report;
  const usage = Math.max(0, Math.min(100, currentPct));
  const fuelLeft = 100 - usage;
  const fuelAtLanding = 100 - Math.max(0, Math.min(100, landingPct));
  const dry = signalAvailable && fuelLeft <= DRY_THRESHOLD;
  const color = signalAvailable ? fuelColor(fuelLeft) : "var(--muted-foreground)";
  // The "about to drain" band is always red, distinct from the tank's own muted
  // default - a warning tone for fuel that's, in effect, already spoken for.
  const drainColor = "var(--destructive)";
  const showProjection = signalAvailable && fuelAtLanding < fuelLeft;
  // Mirrors RadialGauge's buildTicks(): tick i is active when i/(count-1) ≤
  // fraction, so the last active index is floor(fraction·(count-1)).
  const lastActiveTick = signalAvailable ? Math.floor((fuelLeft / 100) * (FUEL_TICKS - 1)) : -1;
  const projectedActiveTick = showProjection
    ? Math.floor((fuelAtLanding / 100) * (FUEL_TICKS - 1))
    : lastActiveTick;
  return {
    signalAvailable,
    fuelLeft,
    dry,
    color,
    drainColor,
    lastActiveTick,
    projectedActiveTick,
    hoursUntilReset,
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
