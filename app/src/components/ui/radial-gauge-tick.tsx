// One mark on the radial gauge, modelled as a socket + fill:
//   • the socket is a dim track bar, always drawn at full length;
//   • the fill is the coloured bar that reveals the socket when the tick is
//     active. It animates by scaling vertically from the inner end outward, so
//     zones lighting up / dimming down transition smoothly instead of snapping.
// An invisible angular wedge gives the tick a generous hover target; it is only
// rendered when an onHover handler is supplied, keeping a static gauge inert.

export type Tick = {
  index: number;
  angle: number;
  fraction: number;
  active: boolean;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type TickColor = (tick: Tick) => string;
/** Decide a tick's active state, given the value-driven default. */
export type TickActiveResolver = (tick: Tick, defaultActive: boolean) => boolean;

const CENTER = 100;
const FILL_TRANSITION = "transform 220ms ease";

function polar(radius: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CENTER + radius * Math.cos(rad), y: CENTER + radius * Math.sin(rad) };
}

function hitWedge(angle: number, half: number, inner: number, outer: number): string {
  const a = polar(inner, angle - half);
  const b = polar(outer, angle - half);
  const c = polar(outer, angle + half);
  const d = polar(inner, angle + half);
  return `M${a.x} ${a.y} L${b.x} ${b.y} L${c.x} ${c.y} L${d.x} ${d.y} Z`;
}

interface GaugeTickProps {
  tick: Tick;
  active: boolean;
  socketColor: string;
  fillColor: string;
  fillOpacity: number;
  tickWidth: number;
  socketFilterId: string | null;
  fillFilterId: string | null;
  /** Delay (ms) before this tick's fill transition runs, for a staggered sweep. */
  fillDelay: number;
  hitHalfAngle: number;
  tickRadius: number;
  tickLength: number;
  onHover?: (tick: Tick) => void;
}

function GaugeTick({
  tick,
  active,
  socketColor,
  fillColor,
  fillOpacity,
  tickWidth,
  socketFilterId,
  fillFilterId,
  fillDelay,
  hitHalfAngle,
  tickRadius,
  tickLength,
  onHover,
}: GaugeTickProps) {
  const midX = (tick.x1 + tick.x2) / 2;
  const midY = (tick.y1 + tick.y2) / 2;
  const length = Math.hypot(tick.x2 - tick.x1, tick.y2 - tick.y1);
  const x = midX - tickWidth / 2;
  const y = midY - length / 2;
  const bar = { x, y, width: tickWidth, height: length, rx: tickWidth / 2 };
  return (
    <g>
      {/* Inner group rotates the socket + fill radially; the fill scales within it. */}
      <g transform={`rotate(${tick.angle}, ${midX}, ${midY})`}>
        <rect
          {...bar}
          fill={socketColor}
          filter={socketFilterId ? `url(#${socketFilterId})` : undefined}
        />
        <rect
          {...bar}
          fill={fillColor}
          opacity={fillOpacity}
          filter={fillFilterId ? `url(#${fillFilterId})` : undefined}
          style={{
            transformBox: "fill-box",
            transformOrigin: "50% 100%",
            transform: `scaleY(${active ? 1 : 0})`,
            transition: FILL_TRANSITION,
            transitionDelay: `${fillDelay}ms`,
          }}
        />
      </g>
      {onHover ? (
        <path
          d={hitWedge(tick.angle, hitHalfAngle, tickRadius - tickLength - 6, tickRadius + 6)}
          fill="transparent"
          // Below --container-dial-decorated (index.css) the dial swaps to its
          // coarse ring — its reduced mode. There the wedges are too cramped to
          // isolate a zone meaningfully, so the hit target goes inert via an
          // !important override of the inline pointer-events. Above the
          // threshold only the fine ring is visible, so its hover still works.
          className="[@container_dial_(max-width:190px)]:pointer-events-none!"
          style={{ pointerEvents: "all", cursor: "pointer" }}
          onMouseEnter={() => onHover(tick)}
        />
      ) : null}
    </g>
  );
}

export { GaugeTick };
