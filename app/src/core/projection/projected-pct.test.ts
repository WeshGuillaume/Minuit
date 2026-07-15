import { describe, expect, it } from 'vitest';
import { projectedPct } from './projected-pct';
import type { HourSlot, RateProfile } from '../types';

// A profile where Monday(1) hours each expect 2 %/h, everything else 0.
const profile: RateProfile = Array.from({ length: 7 }, (_, wd) =>
  Array.from({ length: 24 }, () => (wd === 1 ? 2 : 0)),
);

const slot = (weekday: number, hour: number, weight = 1): HourSlot => ({ weekday, hour, weight });

describe('projectedPct', () => {
  it('adds the profiled rate for each remaining full hour', () => {
    const hours = [slot(1, 9), slot(1, 10), slot(1, 11)];
    expect(projectedPct(30, hours, profile)).toBeCloseTo(36, 10); // 30 + 3×2
  });

  it('weights a partial final hour', () => {
    expect(projectedPct(30, [slot(1, 9, 0.5)], profile)).toBeCloseTo(31, 10);
  });

  it('adds nothing for hours in never-worked slots', () => {
    expect(projectedPct(30, [slot(0, 3), slot(0, 4)], profile)).toBe(30);
  });

  it('can exceed 100 (cap projected to be blown)', () => {
    const hours = Array.from({ length: 40 }, () => slot(1, 9));
    expect(projectedPct(30, hours, profile)).toBeGreaterThan(100);
  });
});
