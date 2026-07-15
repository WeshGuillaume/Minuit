import * as React from "react";

import { cn } from "@/lib/utils";
import { NumberFlow } from "@/components/ui/number-flow";
import {
  tickActiveColor,
  tickInactiveColor,
} from "@/components/ui/radial-gauge-colors";
import { TickFilters } from "@/components/ui/radial-gauge-filters";
import {
  GaugeTick,
  type Tick,
  type TickColor,
  type TickActiveResolver,
} from "@/components/ui/radial-gauge-tick";

interface RadialGaugeProps extends React.ComponentProps<"div"> {
  value: number;
  min?: number;
  max?: number;
  tickCount?: number;
  startAngle?: number;
  sweepAngle?: number;
  tickLength?: number;
  tickRadius?: number;
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
  tickWidth?: number;
  tickInsetShadow?: boolean;
  glow?: number;
  fadeActive?: boolean;
}

const CENTER = 100;

function polarToCartesian(radius: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.cos(rad),
    y: CENTER + radius * Math.sin(rad),
  };
}

function RadialGauge({
  value,
  min = 0,
  max = 100,
  tickCount = 48,
  startAngle = -130,
  sweepAngle = 260,
  tickLength = 14,
  tickRadius = 92,
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
  tickWidth = 4,
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
  const glowIntensity = Math.min(1, Math.max(0, glow));
  const step = sweepAngle / (tickCount - 1);

  const ticks: Tick[] = Array.from({ length: tickCount }, (_, index) => {
    const angle = startAngle + (index / (tickCount - 1)) * sweepAngle;
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

  const labels = (scaleLabels ?? []).map((labelValue) => {
    const labelFraction = (labelValue - min) / (max - min);
    const angle = startAngle + labelFraction * sweepAngle;
    const { x, y } = polarToCartesian(labelRadius, angle);
    return { value: labelValue, x, y };
  });

  return (
    <div
      data-slot="radial-gauge"
      className={cn(
        "relative aspect-square w-full max-w-60 translate-y-6 flex items-center justify-center",
        className,
      )}
      {...props}
    >
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
        <g onMouseLeave={() => onTickHover?.(null)}>
          {ticks.map((tick) => {
            const active = resolveActive
              ? resolveActive(tick, tick.active)
              : tick.active;
            return (
              <GaugeTick
                key={tick.index}
                tick={tick}
                active={active}
                socketColor={inactiveColor(tick)}
                fillColor={activeColor(tick)}
                fillOpacity={fadeActive ? 1 - tick.fraction * 0.05 : 1}
                tickWidth={tickWidth}
                socketFilterId={tickInsetShadow ? insetId : null}
                fillFilterId={glowIntensity > 0 ? glowId : null}
                fillDelay={fillDelay?.(tick) ?? 0}
                hitHalfAngle={step / 2}
                tickRadius={tickRadius}
                tickLength={tickLength}
                onHover={onTickHover ?? undefined}
              />
            );
          })}
        </g>
        {labels.map((label) => (
          <text
            key={label.value}
            x={label.x}
            y={label.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-muted-foreground font-semibold"
            style={{ fontSize: 7 }}
          >
            {formatLabel(label.value)}
          </text>
        ))}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-normal text-foreground">
          {centerLabel ?? (
            <NumberFlow value={Math.round(clamped)} suffix={centerSuffix} />
          )}
        </span>
        {children ? (
          <div className="pointer-events-auto mt-1">{children}</div>
        ) : null}
      </div>
      {bottomSlot ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-12 flex justify-center">
          <div className="pointer-events-auto">{bottomSlot}</div>
        </div>
      ) : null}
    </div>
  );
}

export { RadialGauge, type RadialGaugeProps };
