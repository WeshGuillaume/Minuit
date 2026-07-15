import { describe, expect, it } from 'vitest';
import { bindingWindow } from './binding-window';
import type { RateConstraint } from '../types';

const c = (key: string, usedPercent: number): RateConstraint => ({
  key,
  label: key,
  usedPercent,
  resetsAt: 0,
  windowSeconds: 7 * 86_400,
});

describe('bindingWindow', () => {
  it('returns null when there are no constraints', () => {
    expect(bindingWindow([])).toBeNull();
  });

  it('picks the closest-to-cap of two constraints', () => {
    const picked = bindingWindow([c('all', 39), c('sonnet', 61)]);
    expect(picked?.key).toBe('sonnet');
  });

  it('picks the closest-to-cap of three, including an unknown future key', () => {
    const picked = bindingWindow([c('all', 39), c('sonnet', 61), c('future_opus_only', 88)]);
    expect(picked?.key).toBe('future_opus_only');
  });
});
