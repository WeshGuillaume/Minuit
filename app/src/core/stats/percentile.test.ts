import { describe, expect, it } from 'vitest';
import { percentile } from './percentile';

describe('percentile', () => {
  it('returns NaN for an empty sample', () => {
    expect(percentile([], 50)).toBeNaN();
  });

  it('returns the single value regardless of p', () => {
    expect(percentile([42], 10)).toBe(42);
    expect(percentile([42], 90)).toBe(42);
  });

  it('computes the median (p50) with interpolation', () => {
    expect(percentile([1, 2, 3, 4], 50)).toBe(2.5);
    expect(percentile([1, 2, 3], 50)).toBe(2);
  });

  it('computes p10 and p75 by interpolating between ranks', () => {
    // n=11, rank(p10) = 0.1*10 = 1.0 -> exactly the 2nd value
    expect(percentile([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 10)).toBe(1);
    // rank(p75) = 0.75*10 = 7.5 -> halfway between values[7]=7 and values[8]=8
    expect(percentile([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 75)).toBe(7.5);
  });

  it('is order-independent (sorts internally)', () => {
    expect(percentile([3, 1, 4, 1, 5, 9, 2, 6], 50)).toBe(
      percentile([1, 1, 2, 3, 4, 5, 6, 9], 50),
    );
  });
});
