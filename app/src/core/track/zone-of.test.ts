import { describe, expect, it } from 'vitest';
import { zoneOf } from './zone-of';
import { realBounds } from './real-bounds';

const bounds = realBounds({ underuseEndsAt: 0.33, breakEvenAt: 0.73 });

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

  it('treats anything past the cap as over', () => {
    expect(zoneOf(130, bounds)).toBe('over');
  });

  it('skips an empty zone', () => {
    const light = realBounds({ underuseEndsAt: 40, breakEvenAt: 92 }); // clear empty at 92
    expect(zoneOf(92, light)).toBe('warn');
  });
});
