// elapsedSubShare — the slice of the subscription "used up" by TIME already
// elapsed in the current window. Distinct from windowSubCost, which covers the
// whole window regardless of elapsed time. Do not confuse the two.
//
// Formula:  elapsedSubShare = monthlyUsd × (elapsedHours / (monthDays × 24))
// with monthDays = 30.44.
//
// This is the OLD CLI's ratio denominator, kept as a labelled secondary stat
// ("at this stage of the window"). It deliberately does NOT drive the track — a
// time-dependent denominator would make the break-even toggle drift on its own.

export const elapsedSubShare = (
  monthlyUsd: number,
  elapsedHours: number,
  monthDays = 30.44,
): number => monthlyUsd * (elapsedHours / (monthDays * 24));
