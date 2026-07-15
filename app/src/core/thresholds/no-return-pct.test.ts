import { describe, expect, it } from 'vitest';
import { noReturnPct } from './no-return-pct';

describe('noReturnPct', () => {
  it('sits far from 100 when lots of time remains', () => {
    // calm 1.5 %/h over 40 h -> 100 - 60 = 40
    expect(noReturnPct(1.5, 40)).toBe(40);
  });

  it('slides toward 100 as the reset approaches', () => {
    const far = noReturnPct(2, 30);
    const near = noReturnPct(2, 5);
    expect(near).toBeGreaterThan(far);
    expect(noReturnPct(2, 0)).toBe(100); // at the reset nothing more can be consumed
  });

  it('clamps to 0 when calm pace alone would overshoot', () => {
    expect(noReturnPct(10, 20)).toBe(0);
  });
});
