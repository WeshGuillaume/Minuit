const ZONES = [
  { stop: 0, color: "oklch(0.78 0.07 240)" },
  { stop: 0.25, color: "oklch(0.8 0.08 195)" },
  { stop: 0.5, color: "oklch(0.75 0.12 150)" },
  { stop: 0.75, color: "oklch(0.78 0.1 70)" },
  { stop: 1, color: "oklch(0.63 0.16 25)" },
];

function zoneColorForFraction(fraction: number): string {
  const clamped = Math.min(1, Math.max(0, fraction));
  const upperIndex = ZONES.findIndex((zone) => zone.stop >= clamped);
  if (upperIndex <= 0) return ZONES[0].color;

  const lower = ZONES[upperIndex - 1];
  const upper = ZONES[upperIndex];
  const span = upper.stop - lower.stop;
  const t = Math.round(((clamped - lower.stop) / span) * 100);
  return `color-mix(in oklch, ${lower.color}, ${upper.color} ${t}%)`;
}

function tickActiveColor(fraction: number): string {
  return zoneColorForFraction(fraction);
}

function tickInactiveColor(fraction: number, deepVar: string): string {
  return `color-mix(in oklch, ${zoneColorForFraction(fraction)} 4%, ${deepVar})`;
}

export { tickActiveColor, tickInactiveColor, zoneColorForFraction };
