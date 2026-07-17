// The landscape fuel gauge: the SAME lit-tick frontier as the portrait arc
// (fuel-arc.tsx), but laid along a straight horizontal line - a car's fuel bar,
// not a second dial - so it sits flat and thin beside the speedometer in a wide,
// short window. It reuses RadialGauge's own tick primitives (TickRing + the neon
// glow filter) with LINEAR tick coordinates instead of polar ones: GaugeTick
// draws a bar between each tick's (x1,y1)→(x2,y2) and rotates by its `angle`, so
// vertical segments at `angle: 0`, evenly spaced in x, render as a row of marks
// with the exact same socket/fill/glow/blink the arc has - no bespoke drawing.

import * as React from "react";
import { TickFilters } from "@/components/ui/radial-gauge-filters";
import { TickRing } from "@/components/ui/radial-gauge-ring";
import type { Tick } from "@/components/ui/radial-gauge-tick";
import { FUEL_TICKS, type FuelData, fuelTickColors } from "./fuel-data";

const GLOW = 0.28; // matches the arc's, so both read as the same lit tube
// viewBox for the tick line. Taller than the marks (they sit mid-height) so the
// neon bloom above/below isn't clipped by the SVG's own box; overflow-visible
// lets it spill past the element bounds the way the square arc's does.
const BAR = { w: 220, h: 24, x0: 6, x1: 214, top: 6, bottom: 18, tickWidth: 2.4 };

/** Ticks evenly spaced along a horizontal line, each a vertical segment. `angle:
 * 0` means GaugeTick draws them upright (no rotation); `active` lights every
 * tick up to today's frontier, exactly as the arc's value-driven ring does. */
function linearTicks(activeIndex: number): Tick[] {
  return Array.from({ length: FUEL_TICKS }, (_, index) => {
    const fraction = index / (FUEL_TICKS - 1);
    const x = BAR.x0 + fraction * (BAR.x1 - BAR.x0);
    return {
      index,
      angle: 0,
      fraction,
      active: index <= activeIndex,
      x1: x,
      y1: BAR.top,
      x2: x,
      y2: BAR.bottom,
    };
  });
}

/** The horizontal fuel bar. Given the shape-independent tank data, it only owns
 * the linear tick layout; colours + call-outs come from fuel-data.ts, shared
 * verbatim with the arc. */
export function FuelBar({ data }: { data: FuelData }) {
  const reactId = React.useId().replace(/[:]/g, "");
  const glowId = `fuel-bar-glow-${reactId}`;
  const insetId = `fuel-bar-inset-${reactId}`;
  const colors = fuelTickColors(data);
  return (
    <svg
      viewBox={`0 0 ${BAR.w} ${BAR.h}`}
      // Fills the space between the icon and the percent in the landscape row
      // (index.tsx); the wrapper there caps how wide it gets.
      className="w-full min-w-0 overflow-visible"
      role="img"
      aria-label={`${Math.round(data.fuelLeft)}% fuel left`}
    >
      <TickFilters insetId={insetId} glowId={glowId} glowIntensity={GLOW} />
      <TickRing
        ticks={linearTicks(data.lastActiveTick)}
        step={0}
        tickWidth={BAR.tickWidth}
        tickRadius={0}
        tickLength={0}
        activeColor={colors.activeColor}
        inactiveColor={colors.inactiveColor}
        fadeActive={false}
        insetId={null}
        glowId={glowId}
        className=""
        tickClassName={colors.tickClassName}
      />
    </svg>
  );
}
