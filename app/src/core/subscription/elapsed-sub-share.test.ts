import { describe, expect, it } from 'vitest';
import { elapsedSubShare } from './elapsed-sub-share';
import { windowSubCost } from './window-sub-cost';

describe('elapsedSubShare', () => {
  it('is zero at the start of a window', () => {
    expect(elapsedSubShare(200, 0)).toBe(0);
  });

  it('a full 7-day elapse equals the whole 7-day windowSubCost', () => {
    const elapsed = elapsedSubShare(200, 7 * 24);
    expect(elapsed).toBeCloseTo(windowSubCost(200, 7 * 86_400), 10);
  });

  it('half a 5-hour window is half its window sub cost', () => {
    expect(elapsedSubShare(200, 2.5)).toBeCloseTo(windowSubCost(200, 5 * 3600) / 2, 10);
  });
});
