// tokenCost: the API-equivalent USD value of ONE priced turn's token breakdown.
//
// Formula (each tier billed separately, never pre-summed: the rates differ by
// an order of magnitude):
//   input·in + output·out + cacheRead·cr + cacheWrite5m·cw5 + cacheWrite1h·cw1
// all divided by 1e6 because rates in pricing.json are USD per MILLION tokens.
//
// Assumption/compromise: the caller has already resolved the model → ModelPrice.
// Keeping resolution out of here makes the formula trivially testable per tier.

import type { ModelPrice, TokenUsage } from "../types";

const PER_MTOK = 1_000_000;

export const tokenCost = (usage: TokenUsage, price: ModelPrice): number =>
  (usage.input * price.input +
    usage.output * price.output +
    usage.cacheRead * price.cacheRead +
    usage.cacheWrite5m * price.cacheWrite5m +
    usage.cacheWrite1h * price.cacheWrite1h) /
  PER_MTOK;
