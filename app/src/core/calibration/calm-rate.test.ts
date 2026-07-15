import { describe, expect, it } from 'vitest';
import { calmRate } from './calm-rate';

describe('calmRate', () => {
  it('is the P10 of active-hour rates', () => {
    // rates 1..11, P10 rank = 0.1*10 = 1 -> second value = 2
    expect(calmRate([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])).toBe(2);
  });

  it('ignores nothing extra — caller already dropped zero hours', () => {
    expect(calmRate([4, 4, 4])).toBe(4);
  });

  it('returns 0 when there is no observed activity', () => {
    expect(calmRate([])).toBe(0);
  });
});
