// bindingWindow: pick the most constraining rate limit from the live signal.
//
// A Max plan can expose several simultaneous caps (all-models weekly, Sonnet-
// only, and possibly others added later). We treat the response as an
// independent list of constraints and keep the one closest to its cap, the
// highest usedPercent. Any future key flows through unchanged; there is no
// hard-coded set of window names here.
//
// Returns null for an empty list (signal unavailable / no constraints), which
// the report surfaces as signalAvailable = false rather than a fake 0%.

import type { RateConstraint } from "../types";

export const bindingWindow = (constraints: RateConstraint[]): RateConstraint | null =>
  constraints.reduce<RateConstraint | null>(
    (worst, c) => (worst === null || c.usedPercent > worst.usedPercent ? c : worst),
    null,
  );
