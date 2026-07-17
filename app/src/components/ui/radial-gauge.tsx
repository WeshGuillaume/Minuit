import * as React from "react";
import { NumberFlow } from "@/components/ui/number-flow";
import {
  tickActiveColor,
  tickInactiveColor,
} from "@/components/ui/radial-gauge-colors";
import { TickFilters } from "@/components/ui/radial-gauge-filters";
import { TickRing } from "@/components/ui/radial-gauge-ring";
import type {
  Tick,
  TickActiveResolver,
  TickColor,
} from "@/components/ui/radial-gauge-tick";
import { cn } from "@/lib/utils";

interface RadialGaugeProps extends React.ComponentProps<"div"> {
  value: number;
  min?: number;
  max?: number;
  tickCount?: number;
  /** Tick count for the coarse ring shown once the dial's own box drops below
   * `--container-dial-decorated` (index.css), fewer, wider marks read better
   * than a shrunk copy of the fine ring. */
  compactTickCount?: number;
  startAngle?: number;
  sweepAngle?: number;
  tickLength?: number;
  tickRadius?: number;
  /** Tick length/radius for the coarse ring (see `compactTickCount`): longer
   * and set further in than the fine ring's, so the coarse ring reads as a
   * bold band filling the dial rather than a thin ring floating in empty
   * space once the dial has shrunk too far for finesse. */
  compactTickLength?: number;
  compactTickRadius?: number;
  scaleLabels?: number[];
  labelRadius?: number;
  formatLabel?: (value: number) => string;
  centerLabel?: React.ReactNode;
  /** Rendered inside the gauge, anchored to the bottom arc gap. */
  bottomSlot?: React.ReactNode;
  /** Suffix for the animated center number (e.g. "%"), used when no centerLabel override. */
  centerSuffix?: string;
  activeColor?: TickColor;
  inactiveColor?: TickColor;
  /** Override the value-driven active state (e.g. to isolate a hovered zone). */
  resolveActive?: TickActiveResolver;
  /** Per-tick fill delay in ms, to stagger a zone's ticks into a sweep. */
  fillDelay?: (tick: Tick) => number;
  /** Fired with the tick under the cursor, or null once the cursor leaves. */
  onTickHover?: (tick: Tick | null) => void;
  /** Per-tick extra class on the fill rect - e.g. an `animate-*` utility to call
   * out one tick (a current-value frontier, a hovered mark) without a caller
   * needing its own overlay. */
  tickClassName?: (tick: Tick) => string | undefined;
  /** A hollow marker on the arc (0..1 of the sweep), e.g. where usage lands at reset. */
  ghostFraction?: number;
  /** Value (same domain as `value`/`min`/`max`) to position a caller-supplied
   * custom marker at - pairs with `cursor`. Unlike `ghostFraction` (a fixed
   * hollow-circle shape, positioned by raw fraction), this lets the caller draw
   * its own marker (a label, an arrow, a tooltip trigger) and think in the
   * gauge's own value units instead of a 0..1 fraction. */
  cursorValue?: number;
  /** Render prop for `cursorValue`'s marker, called once per ring (fine, then
   * compact - only one is ever visible, by the same CSS this component uses to
   * swap rings). Given the marker's angle (RadialGauge's own convention: 0° is
   * straight up, +clockwise) and that ring's own tickRadius/tickLength, so the
   * caller can position ON the tick band (`polar(radius, angle)`) or OFFSET
   * from it (e.g. `polar(radius - tickLength - gap, angle)` to sit below it) -
   * whatever a fixed `{x,y}` pos couldn't express. */
  cursor?: (info: {
    angle: number;
    tickRadius: number;
    tickLength: number;
  }) => React.ReactNode;
  tickWidth?: number;
  /** Tick width for the coarse ring (see `compactTickCount`). */
  compactTickWidth?: number;
  tickInsetShadow?: boolean;
  glow?: number;
  fadeActive?: boolean;
}

const CENTER = 100;

// Below this, the dial's own box has no room for finesse: the scale labels and
// the coarse tick ring below take over from the fine one (see index.css).
const DECORATED_HIDDEN = "hidden @dial-decorated/dial:block";
const DECORATED_ONLY = "block @dial-decorated/dial:hidden";

/** 0° is straight up, +clockwise - the same convention `startAngle`/`sweepAngle`
 * use throughout. Exported so callers positioning their own content (e.g. a
 * `cursor` marker) into this gauge's 200×200 viewBox share the exact same math. */
function polarToCartesian(radius: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.cos(rad),
    y: CENTER + radius * Math.sin(rad),
  };
}

/** A hollow ring marker on the arc, at `fraction` (0..1) of the sweep. */
function GhostMarker({
  fraction,
  startAngle,
  sweepAngle,
  tickRadius,
  compactTickRadius,
}: {
  fraction: number;
  startAngle: number;
  sweepAngle: number;
  tickRadius: number;
  compactTickRadius: number;
}) {
  const angle = startAngle + Math.min(1, Math.max(0, fraction)) * sweepAngle;
  // Two markers, not one: the ghost sits just past the tick radius, and that
  // radius differs between the fine and coarse rings (see compactTickRadius
  // above): anchoring to the fine ring's radius alone left it floating
  // outside the coarse ring once the dial shrank far enough to swap rings.
  const fine = polarToCartesian(tickRadius + 5, angle);
  const compact = polarToCartesian(compactTickRadius + 5, angle);
  return (
    <g data-slot="radial-gauge-ghost">
      <circle
        cx={fine.x}
        cy={fine.y}
        r={2.6}
        className={`fill-none stroke-muted-foreground ${DECORATED_HIDDEN}`}
        strokeWidth={1.4}
        opacity={0.75}
      />
      <circle
        cx={compact.x}
        cy={compact.y}
        r={2.6}
        className={`fill-none stroke-muted-foreground ${DECORATED_ONLY}`}
        strokeWidth={1.4}
        opacity={0.75}
      />
    </g>
  );
}

/** A caller-drawn marker on the arc, at `value` (same domain as the gauge's own
 * value). Hands the render prop each ring's own angle/radius/length (see
 * RadialGaugeProps.cursor) rather than a fixed position, so the caller can
 * offset from the tick band instead of only sitting on it. */
function Cursor({
  value,
  min,
  max,
  startAngle,
  sweepAngle,
  tickRadius,
  tickLength,
  compactTickRadius,
  compactTickLength,
  render,
}: {
  value: number;
  min: number;
  max: number;
  startAngle: number;
  sweepAngle: number;
  tickRadius: number;
  tickLength: number;
  compactTickRadius: number;
  compactTickLength: number;
  render: (info: {
    angle: number;
    tickRadius: number;
    tickLength: number;
  }) => React.ReactNode;
}) {
  const fraction = Math.min(1, Math.max(0, (value - min) / (max - min)));
  const angle = startAngle + fraction * sweepAngle;
  return (
    <g data-slot="radial-gauge-cursor">
      <g className={DECORATED_HIDDEN}>
        {render({ angle, tickRadius, tickLength })}
      </g>
      <g className={DECORATED_ONLY}>
        {render({
          angle,
          tickRadius: compactTickRadius,
          tickLength: compactTickLength,
        })}
      </g>
    </g>
  );
}

function buildTicks(
  count: number,
  startAngle: number,
  sweepAngle: number,
  tickRadius: number,
  tickLength: number,
  activeAngle: number,
): Tick[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = startAngle + (index / (count - 1)) * sweepAngle;
    const inner = polarToCartesian(tickRadius - tickLength, angle);
    const outer = polarToCartesian(tickRadius, angle);
    return {
      index,
      angle,
      fraction: (angle - startAngle) / sweepAngle,
      active: angle <= activeAngle,
      x1: inner.x,
      y1: inner.y,
      x2: outer.x,
      y2: outer.y,
    };
  });
}

function RadialGauge({
  value,
  min = 0,
  max = 100,
  tickCount = 48,
  compactTickCount = 16,
  startAngle = -130,
  sweepAngle = 260,
  tickLength = 14,
  tickRadius = 92,
  compactTickLength = 40,
  compactTickRadius = 94,
  scaleLabels,
  labelRadius = 66,
  formatLabel = (v) => `${v}`,
  centerLabel,
  bottomSlot,
  centerSuffix = "",
  activeColor = (tick) => tickActiveColor(tick.fraction),
  inactiveColor = (tick) => tickInactiveColor(tick.fraction, "var(--deep)"),
  resolveActive,
  fillDelay,
  onTickHover,
  tickClassName,
  ghostFraction,
  cursorValue,
  cursor,
  tickWidth = 4,
  compactTickWidth = 6,
  tickInsetShadow = true,
  glow = 0.5,
  fadeActive = true,
  className,
  children,
  ...props
}: RadialGaugeProps) {
  const reactId = React.useId().replace(/[:]/g, "");
  const insetId = `radial-gauge-inset-${reactId}`;
  const glowId = `radial-gauge-glow-${reactId}`;
  const clamped = Math.min(max, Math.max(min, value));
  const fraction = (clamped - min) / (max - min);
  const activeAngle = startAngle + fraction * sweepAngle;
  // Clamped to a generous ceiling, not to 1: the neon filter (radial-gauge-
  // filters.tsx) is built to keep reading as brighter light well past 1, so
  // callers can dial the bloom up; 4 just caps the blur region before it turns
  // into an expensive full-viewBox smear.
  const glowIntensity = Math.min(4, Math.max(0, glow));
  const step = sweepAngle / (tickCount - 1);
  const compactStep = sweepAngle / (compactTickCount - 1);

  const ticks = buildTicks(
    tickCount,
    startAngle,
    sweepAngle,
    tickRadius,
    tickLength,
    activeAngle,
  );
  const compactTicks = buildTicks(
    compactTickCount,
    startAngle,
    sweepAngle,
    compactTickRadius,
    compactTickLength,
    activeAngle,
  );

  const labels = (scaleLabels ?? []).map((labelValue) => {
    const labelFraction = (labelValue - min) / (max - min);
    const angle = startAngle + labelFraction * sweepAngle;
    const { x, y } = polarToCartesian(labelRadius, angle);
    return { value: labelValue, x, y };
  });

  const ring = {
    activeColor,
    inactiveColor,
    resolveActive,
    fillDelay,
    fadeActive,
    insetId: tickInsetShadow ? insetId : null,
    glowId: glowIntensity > 0 ? glowId : null,
    onHover: onTickHover,
    tickClassName,
  };

  return (
    // The sweep is open at the bottom (260° of 360°), so a perfectly square
    // box always has dead space below the lowest tick/badge, cropped here by
    // giving the OUTER box a shorter aspect ratio with overflow-hidden, while
    // the INNER box stays a true, undistorted square pinned to its top. Every
    // internal position (ticks, center label, bottomSlot) is computed against
    // that inner square exactly as before; only the outer crop is new.
    //
    // Kept small (0.95, not a more aggressive crop): below --container-dial-
    // decorated the badge is replaced by the zone-name label (speedo-dial.tsx),
    // which is the common case across most realistic dial sizes, not the rare
    // one: a bigger crop reliably clipped that label at the smallest sizes,
    // since this ratio can't itself react to the dial's own size (it's the
    // dial's OWN box being sized, so it can't query itself).
    <div
      data-slot="radial-gauge"
      className={cn(
        "relative aspect-[1/0.95] w-full -mb-12 overflow-hidden",
        className,
      )}
      {...props}
    >
      <div className="absolute inset-x-0 top-0 flex aspect-square w-full items-center justify-center">
        <svg
          viewBox="0 0 200 200"
          className="size-full"
          role="img"
          aria-label={formatLabel(clamped)}
        >
          <TickFilters
            insetId={insetId}
            glowId={glowId}
            glowIntensity={glowIntensity}
          />
          <TickRing
            {...ring}
            ticks={ticks}
            step={step}
            tickWidth={tickWidth}
            tickRadius={tickRadius}
            tickLength={tickLength}
            className={DECORATED_HIDDEN}
          />
          <TickRing
            {...ring}
            ticks={compactTicks}
            step={compactStep}
            tickWidth={compactTickWidth}
            tickRadius={compactTickRadius}
            tickLength={compactTickLength}
            className={DECORATED_ONLY}
          />
          {ghostFraction != null && (
            <GhostMarker
              fraction={ghostFraction}
              startAngle={startAngle}
              sweepAngle={sweepAngle}
              tickRadius={tickRadius}
              compactTickRadius={compactTickRadius}
            />
          )}
          {cursorValue != null && cursor && (
            <Cursor
              value={cursorValue}
              min={min}
              max={max}
              startAngle={startAngle}
              sweepAngle={sweepAngle}
              tickRadius={tickRadius}
              tickLength={tickLength}
              compactTickRadius={compactTickRadius}
              compactTickLength={compactTickLength}
              render={cursor}
            />
          )}
          {labels.map((label) => (
            <text
              key={label.value}
              x={label.x}
              y={label.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-muted-foreground font-medium hidden @dial-decorated/dial:inline"
              style={{ fontSize: 9 }}
            >
              {formatLabel(label.value)}
            </text>
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-normal text-foreground">
            {centerLabel ?? (
              <NumberFlow value={Math.round(clamped)} suffix={centerSuffix} />
            )}
          </span>
          {children ? (
            <div className="pointer-events-auto mt-1">{children}</div>
          ) : null}
        </div>
        {bottomSlot ? (
          // bottom-[5%], not bottom-0: the inner square is taller than the
          // OUTER box (aspect-[1/0.95] crops 5% off the bottom), so the
          // inner square's own bottom edge sits past the crop line, so a
          // badge pinned there gets its bottom sliced off. Anchoring 5% up
          // from the inner square's bottom instead lands it exactly on the
          // crop line, keeping the whole badge visible at any dial size.
          <div className="pointer-events-none absolute inset-x-0 bottom-[5%] flex justify-center">
            <div className="pointer-events-auto">{bottomSlot}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export { polarToCartesian, RadialGauge, type RadialGaugeProps };
