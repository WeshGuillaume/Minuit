// SVG filters for the tick ring: a subtle inset shadow that sinks each socket
// into the dial, and the neon glow the active fill emits.
//
// The glow is built like a real neon tube — three stacked light contributions
// rather than one blur, so raising `glowIntensity` reads as "brighter light,"
// not just "blurrier smudge":
//   • a wide ambient bloom (big blur, low alpha) — light spilling into the air;
//   • a tight saturated halo (small blur, alpha pushed past 1 so it stays a
//     solid coloured ring hugging the tube);
//   • a white-hot core (the fill shifted toward white, barely blurred) laid
//     back over the tube, the over-exposed centre a lit tube always has.
// The filter region is deliberately huge: a tick's own bounding box is a sliver
// (~2px wide), so the ambient bloom needs many multiples of it to spread into
// instead of being clipped to a hard rectangle.

function NeonGlow({ id, g }: { id: string; g: number }) {
  return (
    <filter
      id={id}
      x="-800%"
      y="-300%"
      width="1700%"
      height="700%"
      colorInterpolationFilters="sRGB"
    >
      {/* Wide ambient bloom. */}
      <feGaussianBlur in="SourceGraphic" stdDeviation={g * 2.6} result="wide" />
      <feComponentTransfer in="wide" result="wideGlow">
        <feFuncA type="linear" slope={g * 0.6} />
      </feComponentTransfer>
      {/* Tight saturated halo, alpha driven past 1 so it clips to a solid ring. */}
      <feGaussianBlur in="SourceGraphic" stdDeviation={g * 1.0} result="tight" />
      <feComponentTransfer in="tight" result="tightGlow">
        <feFuncA type="linear" slope={g * 1.7} />
      </feComponentTransfer>
      {/* White-hot core: shift the fill toward white, then barely soften it. */}
      <feColorMatrix
        in="SourceGraphic"
        type="matrix"
        values="1 0 0 0 0.45  0 1 0 0 0.45  0 0 1 0 0.45  0 0 0 1 0"
        result="hot"
      />
      <feGaussianBlur in="hot" stdDeviation={g * 0.35} result="core" />
      <feMerge>
        <feMergeNode in="wideGlow" />
        <feMergeNode in="tightGlow" />
        <feMergeNode in="SourceGraphic" />
        <feMergeNode in="core" />
      </feMerge>
    </filter>
  );
}

function TickFilters({
  insetId,
  glowId,
  glowIntensity,
}: {
  insetId: string;
  glowId: string;
  glowIntensity: number;
}) {
  return (
    <defs data-slot="radial-gauge-filters">
      <filter id={insetId} x="-20%" y="-20%" width="140%" height="140%">
        <feFlood floodColor="black" floodOpacity="0.55" />
        <feComposite operator="out" in2="SourceGraphic" result="inverse" />
        <feOffset dx="0" dy="0.35" in="inverse" result="offsetInverse" />
        <feGaussianBlur stdDeviation="0.35" in="offsetInverse" result="blurred" />
        <feComposite operator="in" in="blurred" in2="SourceGraphic" result="shadow" />
        <feMerge>
          <feMergeNode in="SourceGraphic" />
          <feMergeNode in="shadow" />
        </feMerge>
      </filter>
      <NeonGlow id={glowId} g={glowIntensity} />
    </defs>
  );
}

export { TickFilters };
