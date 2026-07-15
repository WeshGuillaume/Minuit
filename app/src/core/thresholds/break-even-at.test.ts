import { describe, expect, it } from 'vitest';
import { breakEvenAt } from './break-even-at';

describe('breakEvenAt', () => {
  it('reproduces the real-data control ≈ 0.73%', () => {
    // breakEven 1.1 × windowSubCost 46.00 / dollarsPerPct 69.5
    expect(breakEvenAt(1.1, 46.0, 69.5)).toBeCloseTo(0.728, 2);
  });

  it('clamps into [0,100] for a light user', () => {
    // huge sub cost, tiny $/pct -> would exceed 100, clamped
    expect(breakEvenAt(1.1, 5000, 1)).toBe(100);
  });

  it('guards a zero dollarsPerPct', () => {
    expect(breakEvenAt(1.1, 46, 0)).toBe(0);
  });
});
