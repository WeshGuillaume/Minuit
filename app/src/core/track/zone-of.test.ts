import { describe, expect, it } from 'vitest';
import { zoneOf } from './zone-of';
import { SEGMENTS } from './segments';
import type { SegmentBound } from '../types';

// zoneOf is axis-agnostic; synthetic monotonic cut points exercise the walk.
const boundsFrom = (cuts: number[]): SegmentBound[] =>
  SEGMENTS.map((s, i) => ({ id: s.id, low: cuts[i], high: cuts[i + 1] }));
const bounds = boundsFrom([0, 0.33, 0.73, 85, 100, 115, 130]);

describe('zoneOf', () => {
  it('classifies values within each zone', () => {
    expect(zoneOf(0.1, bounds)).toBe('underuse');
    expect(zoneOf(0.5, bounds)).toBe('profitable');
    expect(zoneOf(40, bounds)).toBe('clear');
    expect(zoneOf(90, bounds)).toBe('warn');
    expect(zoneOf(107, bounds)).toBe('noreturn');
    expect(zoneOf(120, bounds)).toBe('over');
  });

  it('puts boundary values in the upper zone', () => {
    expect(zoneOf(0.73, bounds)).toBe('clear');
    expect(zoneOf(85, bounds)).toBe('warn');
    expect(zoneOf(100, bounds)).toBe('noreturn');
    expect(zoneOf(115, bounds)).toBe('over');
  });

  it('treats anything past the far bound as over', () => {
    expect(zoneOf(130, bounds)).toBe('over');
  });

  it('skips an empty zone', () => {
    const light = boundsFrom([0, 40, 92, 92, 100, 115, 130]); // clear empty at 92
    expect(zoneOf(92, light)).toBe('warn');
  });
});
