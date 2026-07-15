import { describe, expect, it } from 'vitest';
import { rateProfile } from './rate-profile';
import type { HourObservation } from '../types';

const o = (weekday: number, hour: number, ratePctPerHour: number): HourObservation => ({
  weekday,
  hour,
  ratePctPerHour,
});

describe('rateProfile', () => {
  it('produces a dense 7×24 grid', () => {
    const grid = rateProfile([]);
    expect(grid).toHaveLength(7);
    expect(grid.every((d) => d.length === 24)).toBe(true);
  });

  it('is 0 for never-worked cells', () => {
    expect(rateProfile([])[3][14]).toBe(0);
  });

  it('takes the P75 within a (weekday, hour) bucket', () => {
    // Monday(1) 9am samples 1..5 -> P75 rank = 0.75*4 = 3 -> value 4
    const obs = [1, 2, 3, 4, 5].map((r) => o(1, 9, r));
    expect(rateProfile(obs)[1][9]).toBe(4);
  });

  it('keeps buckets independent', () => {
    const grid = rateProfile([o(1, 9, 10), o(2, 9, 2)]);
    expect(grid[1][9]).toBe(10);
    expect(grid[2][9]).toBe(2);
  });
});
