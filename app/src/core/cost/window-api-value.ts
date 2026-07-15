// windowApiValue — total API-equivalent USD value of every turn in a window.
//
// Formula: Σ tokenCost(event, price(event.model)) over the (already windowed and
// uuid-deduped) events. This USD figure is the common currency of both axes:
// Axis 1 compares it to the subscription, Axis 2 calibrates $/percent from it.
//
// Assumption: dedup and windowing happen upstream in the adapter — this file
// trusts the event list it is handed and only prices it. Model → family
// resolution is a private lookup here (not its own quantity): a model id that
// matches no pattern falls back to the last family in pricing.match.

import type { ModelPrice, Pricing, UsageEvent } from '../types';
import { tokenCost } from './token-cost';

const priceForModel = (model: string, pricing: Pricing): ModelPrice => {
  const hit = pricing.match.find((m) => model.includes(m.pattern));
  const family = hit ? hit.family : pricing.match[pricing.match.length - 1].family;
  return pricing.models[family];
};

export const windowApiValue = (events: UsageEvent[], pricing: Pricing): number =>
  events.reduce((sum, e) => sum + tokenCost(e, priceForModel(e.model, pricing)), 0);
