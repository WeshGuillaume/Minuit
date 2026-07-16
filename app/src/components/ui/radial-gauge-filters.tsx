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
      <filter id={glowId} x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur in="SourceGraphic" stdDeviation={glowIntensity * 1.6} result="blur" />
        <feComponentTransfer in="blur" result="blurFaded">
          <feFuncA type="linear" slope={glowIntensity} />
        </feComponentTransfer>
        <feMerge>
          <feMergeNode in="blurFaded" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}

export { TickFilters };
