// One density of tick marks around the dial. RadialGauge mounts two of these —
// a fine ring for roomy dials, a coarse/wide one for cramped ones — so a shrunk
// gauge reads as a few bold marks instead of an illegible fringe. Which ring is
// visible is pure CSS (see radial-gauge.tsx): both always mount, and the hidden
// one's hit targets are automatically out of the hit-testing tree along with it.

import { GaugeTick, type Tick, type TickActiveResolver, type TickColor } from "./radial-gauge-tick";

interface TickRingProps {
  ticks: Tick[];
  step: number;
  tickWidth: number;
  tickRadius: number;
  tickLength: number;
  activeColor: TickColor;
  inactiveColor: TickColor;
  resolveActive?: TickActiveResolver;
  fillDelay?: (tick: Tick) => number;
  fadeActive: boolean;
  insetId: string | null;
  glowId: string | null;
  onHover?: (tick: Tick | null) => void;
  className: string;
}

export function TickRing({
  ticks,
  step,
  tickWidth,
  tickRadius,
  tickLength,
  activeColor,
  inactiveColor,
  resolveActive,
  fillDelay,
  fadeActive,
  insetId,
  glowId,
  onHover,
  className,
}: TickRingProps) {
  return (
    <g data-slot="radial-gauge-ring" className={className} onMouseLeave={() => onHover?.(null)}>
      {ticks.map((tick) => {
        const active = resolveActive ? resolveActive(tick, tick.active) : tick.active;
        return (
          <GaugeTick
            key={tick.index}
            tick={tick}
            active={active}
            socketColor={inactiveColor(tick)}
            fillColor={activeColor(tick)}
            fillOpacity={fadeActive ? 1 - tick.fraction * 0.05 : 1}
            tickWidth={tickWidth}
            socketFilterId={insetId}
            fillFilterId={glowId}
            fillDelay={fillDelay?.(tick) ?? 0}
            hitHalfAngle={step / 2}
            tickRadius={tickRadius}
            tickLength={tickLength}
            onHover={onHover}
          />
        );
      })}
    </g>
  );
}
