// The portrait fuel gauge: a shallow tick arc capping the readout, so it reads
// as a fuel gauge, not a second speedo. Landscape uses a flat bar instead (see
// fuel-bar.tsx); both share the tank figures + colours from fuel-data.ts.

import { polarToCartesian, RadialGauge } from "@/components/ui/radial-gauge";
import { FUEL_TICKS, type FuelData, fuelTickColors } from "./fuel-data";
import { FuelIcon } from "./fuel-icon";

// --- Arc geometry: the single source of truth for both the RadialGauge props
// and the crop box. RadialGauge draws into a fixed 200×200 viewBox; the arc is
// only a shallow cap in the top sliver of it, so we compute that cap's exact
// bounding box (in viewBox units) and frame the crop wrapper to it precisely -
// no guessed aspect ratio, no padding. Change any of these and the crop follows.
//
// Glow vs radius is a real constraint: the arc's PEAK tick sits at y = 100 −
// radius, and a lit tick's neon glow blooms ~GLOW_PAD further up. The SVG hard-
// clips anything above viewBox y=0, so the glow only survives if
// radius + GLOW_PAD ≤ 100. This pair is tuned to sit just inside that limit.
//
// Sweep is tuned for aspect ratio: for a FIXED radius, height (sagitta) shrinks
// roughly with sweep², width only with sweep, so a smaller sweep flattens the
// arc - up to a point, past which the sweep-independent GLOW_PAD dominates and
// drops the ratio again. ~40-44° is that sweet spot at this radius.
// radius < 100 − GLOW_PAD on purpose: the peak tick sits at y = 100 − radius,
// and its lit neon glow blooms ~GLOW_PAD above that; at radius 100 the peak
// hugs viewBox y=0, so a full tank's bright peak got its halo clipped off the
// top. Backing the radius off a few units leaves the bloom room to render.
const ARC = { start: -21, sweep: 42, radius: 94, tickLength: 4, glow: 0.28 };

const CENTER = 100;
const toRad = (deg: number) => (deg * Math.PI) / 180;

// Ticks sit symmetric about vertical, at y = 100 − r·cos θ, x = 100 ± r·sin θ.
const halfSweep = toRad(ARC.sweep / 2);
const tickBox = {
  minX: CENTER - ARC.radius * Math.sin(halfSweep),
  maxX: CENTER + ARC.radius * Math.sin(halfSweep),
  minY: CENTER - ARC.radius,
  maxY: CENTER - (ARC.radius - ARC.tickLength) * Math.cos(halfSweep),
};
// The neon glow blooms outward; its widest blur has stdDeviation = glow·2.6, so
// pad ~4σ around so even a lit tick's halo fits.
const GLOW_PAD = ARC.glow * 2.6 * 4;
const boxTop = Math.max(0, tickBox.minY - GLOW_PAD);
const arcBox = {
  x: tickBox.minX - GLOW_PAD,
  y: boxTop,
  w: tickBox.maxX - tickBox.minX + 2 * GLOW_PAD,
  h: tickBox.maxY + GLOW_PAD - boxTop,
};
const cropAspect = `${arcBox.w} / ${arcBox.h}`;
// The first tick's own MIDPOINT, in arcBox-relative %: the fuel icon sits here
// (the arc is a CURVE, so the first tick is well above a text row under it).
const firstTickOuter = polarToCartesian(ARC.radius, ARC.start);
const firstTickInner = polarToCartesian(ARC.radius - ARC.tickLength, ARC.start);
const firstTickFraction = {
  x: (firstTickOuter.x + firstTickInner.x) / 2,
  y: (firstTickOuter.y + firstTickInner.y) / 2,
};
firstTickFraction.x = (firstTickFraction.x - arcBox.x) / arcBox.w;
firstTickFraction.y = (firstTickFraction.y - arcBox.y) / arcBox.h;
const gaugeStyle = {
  width: `${(200 / arcBox.w) * 100}%`,
  left: `${(-arcBox.x / arcBox.w) * 100}%`,
  top: `${(-arcBox.y / arcBox.h) * 100}%`,
} as const;

/** The shallow arc fuel gauge (portrait). Given the shape-independent tank data,
 * it only owns the arc's geometry + the pump-light overlay. */
export function FuelArc({ data }: { data: FuelData }) {
  const colors = fuelTickColors(data);
  return (
    // The arc is a shallow cap in the top sliver of RadialGauge's square box; the
    // wrapper is sized to the arc's exact bounding box (glow included) and the
    // gauge is scaled + offset to fill it - all ratios, so it holds at any width.
    <div className="relative w-full max-w-[140px]" style={{ aspectRatio: cropAspect }}>
      <div className="absolute inset-0 overflow-hidden">
        <RadialGauge
          value={data.signalAvailable ? data.fuelLeft : 0}
          min={0}
          max={100}
          startAngle={ARC.start}
          sweepAngle={ARC.sweep}
          // No `dial` container here, so RadialGauge shows its COARSE ring; its
          // defaults are tuned for the big speedo, so override to short marks.
          compactTickCount={FUEL_TICKS}
          compactTickLength={ARC.tickLength}
          compactTickWidth={0.9}
          compactTickRadius={ARC.radius}
          activeColor={colors.activeColor}
          inactiveColor={colors.inactiveColor}
          tickClassName={colors.tickClassName}
          glow={ARC.glow}
          // Our own icon + percent render below the cropped arc instead.
          centerLabel={<span />}
          className="absolute mb-0 max-w-none"
          style={gaugeStyle}
        />
      </div>
      {/* At the first tick's own (x, y) in arcBox space (a curve, so both coords
          matter). NOT clipped by the inner overflow-hidden (it's a sibling): the
          tick sits at the crop edge, a same-box overflow would slice the icon.
          In a narrow column (stack ≤ ~174px) the left overhang falls off the
          panel's clipped edge, so drop it there - it's decoration, not a readout. */}
      <span
        className="-translate-x-[120%] -translate-y-1/2 absolute [@container_stack_(max-width:174px)]:hidden"
        style={{
          left: `calc(${firstTickFraction.x * 100}% - 2px)`,
          top: `calc(${firstTickFraction.y * 100}% + 2px)`,
        }}
      >
        <FuelIcon dry={data.dry} />
      </span>
    </div>
  );
}
