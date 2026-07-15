import { describe, expect, it } from 'vitest';
import { profitabilityRatio } from './profitability-ratio';

describe('profitabilityRatio', () => {
  it('divides API value by the whole-window subscription cost', () => {
    // real-data control: apiValue 2709.47 over windowSubCost 46.00 ≈ 58.9×
    expect(profitabilityRatio(2709.47, 46.0)).toBeCloseTo(58.9, 1);
  });

  it('is 1 at exact break-even', () => {
    expect(profitabilityRatio(46, 46)).toBe(1);
  });

  it('guards against a zero/negative denominator', () => {
    expect(profitabilityRatio(10, 0)).toBe(0);
    expect(profitabilityRatio(10, -5)).toBe(0);
  });
});
