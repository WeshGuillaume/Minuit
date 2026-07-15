import { describe, expect, it } from 'vitest';
import { underuseEndsAt } from './underuse-ends-at';
import { breakEvenAt } from './break-even-at';

describe('underuseEndsAt', () => {
  it('reproduces the real-data control ≈ 0.33%', () => {
    expect(underuseEndsAt(0.5, 46.0, 69.5)).toBeCloseTo(0.331, 2);
  });

  it('is always ≤ breakEvenAt for the same window (shared denominator)', () => {
    const ue = underuseEndsAt(0.5, 46, 69.5);
    const be = breakEvenAt(1.1, 46, 69.5);
    expect(ue).toBeLessThanOrEqual(be);
  });

  it('guards a zero dollarsPerPct', () => {
    expect(underuseEndsAt(0.5, 46, 0)).toBe(0);
  });
});
