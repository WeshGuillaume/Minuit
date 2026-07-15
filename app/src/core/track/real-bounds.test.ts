import { describe, expect, it } from 'vitest';
import { realBounds } from './real-bounds';

describe('realBounds', () => {
  it('handles the heavy-user extreme (breakEven ≈ 0.7%)', () => {
    const b = realBounds({ underuseEndsAt: 0.33, breakEvenAt: 0.73 });
    expect(b.map((x) => [x.id, x.low, x.high])).toEqual([
      ['underuse', 0, 0.33],
      ['profitable', 0.33, 0.73],
      ['clear', 0.73, 85],
      ['warn', 85, 100],
      ['noreturn', 100, 115],
      ['over', 115, 130],
    ]);
  });

  it('pins the plafond zones to fixed lines regardless of the dynamic thresholds', () => {
    const b = realBounds({ underuseEndsAt: 10, breakEvenAt: 20 });
    expect(b.find((x) => x.id === 'warn')).toEqual({ id: 'warn', low: 85, high: 100 });
    expect(b.find((x) => x.id === 'noreturn')).toEqual({ id: 'noreturn', low: 100, high: 115 });
    expect(b.find((x) => x.id === 'over')).toEqual({ id: 'over', low: 115, high: 130 });
  });

  it('handles the light-user extreme (breakEven > 85) without inverting', () => {
    const b = realBounds({ underuseEndsAt: 40, breakEvenAt: 92 });
    // clear collapses to empty at 92; warn starts at 92; nothing goes negative or NaN
    expect(b.find((x) => x.id === 'clear')).toEqual({ id: 'clear', low: 92, high: 92 });
    expect(b.find((x) => x.id === 'warn')).toEqual({ id: 'warn', low: 92, high: 100 });
    expect(b.find((x) => x.id === 'noreturn')).toEqual({ id: 'noreturn', low: 100, high: 115 });
    expect(b.every((x) => x.high >= x.low)).toBe(true);
    expect(b.every((x) => Number.isFinite(x.low) && Number.isFinite(x.high))).toBe(true);
  });

  it('produces monotonic, contiguous cut points', () => {
    const b = realBounds({ underuseEndsAt: 10, breakEvenAt: 20 });
    for (let i = 1; i < b.length; i++) expect(b[i].low).toBe(b[i - 1].high);
  });
});
