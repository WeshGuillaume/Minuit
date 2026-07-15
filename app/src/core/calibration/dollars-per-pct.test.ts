import { describe, expect, it } from 'vitest';
import { dollarsPerPct } from './dollars-per-pct';
import type { WindowSample } from '../types';

const s = (apiValue: number, pctConsumed: number): WindowSample => ({ apiValue, pctConsumed });

describe('dollarsPerPct', () => {
  it('uses the median so a single outlier window is ignored', () => {
    // windows near $70/pct, one absurd outlier at $700/pct. The MEAN would be
    // dragged to ~200; the median [69,70,71,700] stays at 70.5.
    const samples = [s(700, 10), s(690, 10), s(710, 10), s(7000, 10)];
    const { value, calibrated } = dollarsPerPct(samples, s(0, 0));
    expect(calibrated).toBe(true);
    expect(value).toBeCloseTo(70.5, 5);
    expect(value).toBeLessThan(100); // outlier did not pull it up
  });

  it('reproduces the real-data control ≈ 69.5 $/pct', () => {
    const { value } = dollarsPerPct([s(2709.47, 39)], s(0, 0));
    expect(value).toBeCloseTo(69.47, 1);
  });

  it('excludes windows below the pct floor', () => {
    // the 2% window (would give $500/pct) is dropped; only the 40% window counts
    const { value } = dollarsPerPct([s(10, 2), s(2800, 40)], s(0, 0));
    expect(value).toBeCloseTo(70, 5);
  });

  it('falls back to the instant reading and flags non-calibrated when empty', () => {
    const { value, calibrated } = dollarsPerPct([], s(139, 2));
    expect(calibrated).toBe(false);
    expect(value).toBeCloseTo(69.5, 5);
  });

  it('never divides by zero when even the instant sample is empty', () => {
    const { value, calibrated } = dollarsPerPct([], s(0, 0));
    expect(calibrated).toBe(false);
    expect(value).toBe(0);
  });
});
