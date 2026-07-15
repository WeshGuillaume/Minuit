// Baseline pricing shipped with the app. Edit `~/.cc-gauge/pricing.json` to
// override any field (loadPricing merges it on top) rather than touching this.
// Rates are USD per MILLION tokens, per tier. ⚠️ `fable` is a placeholder cloned
// from opus — update it once its real API rates are published.

import type { Pricing } from '@core/types';

export const DEFAULT_PRICING: Pricing = {
  updated: '2026-07-15',
  models: {
    opus: { input: 15, output: 75, cacheRead: 1.5, cacheWrite5m: 18.75, cacheWrite1h: 30 },
    sonnet: { input: 3, output: 15, cacheRead: 0.3, cacheWrite5m: 3.75, cacheWrite1h: 6 },
    haiku: { input: 0.8, output: 4, cacheRead: 0.08, cacheWrite5m: 1, cacheWrite1h: 1.6 },
    fable: { input: 15, output: 75, cacheRead: 1.5, cacheWrite5m: 18.75, cacheWrite1h: 30 },
  },
  match: [
    { pattern: 'opus', family: 'opus' },
    { pattern: 'sonnet', family: 'sonnet' },
    { pattern: 'haiku', family: 'haiku' },
    { pattern: 'fable', family: 'fable' },
  ],
  subscriptions: { pro: 20, max5x: 100, max20x: 200 },
  activePlan: 'max20x',
  subscriptionPeriodDays: 30.44,
  ratioThresholds: { underuse: 0.5, breakEven: 1.1 },
  projection: { lookbackWeeks: 4 },
  pace: {
    recentWindowHours: 1,
    thresholds: { underfarm: 0.5, slow: 0.85, fast: 1.15, redline: 1.5, blown: 2 },
  },
};
