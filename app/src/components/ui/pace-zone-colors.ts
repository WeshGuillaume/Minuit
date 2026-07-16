/*
 * Resolves a pace zone's `colorToken` (see core/track/segments.ts) into a CSS
 * color usable in inline styles or `color-mix()` — contexts where a Tailwind
 * utility class doesn't apply. Keeps the core zone data free of any concrete
 * color value; this is the one place that knows the token maps to a
 * `--pace-*` custom property in index.css.
 */

/** colorToken → CSS custom property reference, e.g. "pace-maxxing" → "var(--pace-maxxing)". */
export function paceZoneColorVar(colorToken: string): string {
  return `var(--${colorToken})`;
}
