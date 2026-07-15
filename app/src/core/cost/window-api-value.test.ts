import { describe, expect, it } from 'vitest';
import { windowApiValue } from './window-api-value';
import type { Pricing, UsageEvent } from '../types';

const pricing = {
  models: {
    opus: { input: 15, output: 75, cacheRead: 1.5, cacheWrite5m: 18.75, cacheWrite1h: 30 },
    sonnet: { input: 3, output: 15, cacheRead: 0.3, cacheWrite5m: 3.75, cacheWrite1h: 6 },
  },
  match: [
    { pattern: 'opus', family: 'opus' },
    { pattern: 'sonnet', family: 'sonnet' },
  ],
} as unknown as Pricing;

const ev = (model: string, over: Partial<UsageEvent>): UsageEvent => ({
  uuid: model + Math.random(),
  timestamp: 0,
  model,
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite5m: 0,
  cacheWrite1h: 0,
  ...over,
});

describe('windowApiValue', () => {
  it('prices a mixed-model window by resolving each event to its family', () => {
    const events = [
      ev('claude-opus-4-8', { output: 1_000_000 }), // 75
      ev('claude-sonnet-5', { input: 1_000_000 }), // 3
    ];
    expect(windowApiValue(events, pricing)).toBeCloseTo(78, 10);
  });

  it('falls back to the last family for an unknown model id', () => {
    // 'sonnet' is last in match -> unknown model priced as sonnet
    expect(windowApiValue([ev('mystery-model', { input: 1_000_000 })], pricing)).toBeCloseTo(3, 10);
  });

  it('is zero for an empty window', () => {
    expect(windowApiValue([], pricing)).toBe(0);
  });
});
