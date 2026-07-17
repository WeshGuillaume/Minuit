/*
 * Resolves a pace zone into a CSS color usable in inline styles or
 * `color-mix()`, contexts where a Tailwind utility class doesn't apply. A zone's
 * color is `--pace-${id}` by construction (see core/track/zones — the zone id IS
 * the color name), so this is a one-liner; it stays a named function because it
 * is the one place that encodes the `--pace-*` convention from index.css. Takes a
 * plain string (not the core `ZoneId`) so this ui/ primitive stays core-agnostic.
 */

/** Zone id → CSS custom property reference, e.g. "maxxing" → "var(--pace-maxxing)". */
export function paceZoneColorVar(zone: string): string {
  return `var(--pace-${zone})`;
}
