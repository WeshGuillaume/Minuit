import { describe, expect, it } from 'vitest';
import { sustainableRate } from './sustainable-rate';
import { recentRate } from './recent-rate';
import { paceValue } from './pace-value';
import { paceBounds, PACE_DISPLAY_MAX } from './pace-bounds';
import { zoneOf } from '../track/zone-of';
import type { PaceThresholds } from '../types';

const THRESHOLDS: PaceThresholds = { underfarm: 0.5, slow: 0.85, fast: 1.15, redline: 1.5, blown: 2 };

describe('sustainableRate', () => {
  it('spreads the remaining headroom over the hours left', () => {
    // 40% headroom over 40h ⇒ 1%/h is the exact-cap-at-reset pace
    expect(sustainableRate(60, 40)).toBeCloseTo(1, 6);
  });

  it('is Infinity when no time is left (nothing lands before reset)', () => {
    expect(sustainableRate(60, 0)).toBe(Infinity);
  });

  it('is 0 once the cap is hit (no headroom to spend)', () => {
    expect(sustainableRate(100, 10)).toBe(0);
    expect(sustainableRate(120, 10)).toBe(0);
  });
});

describe('recentRate', () => {
  it('converts recent dollars/hour into percent-of-cap/hour via the calibration', () => {
    // $70 over 2h = $35/h; at $70/pct that is 0.5%/h
    expect(recentRate(70, 2, 70)).toBeCloseTo(0.5, 6);
  });

  it('reads idle (0) when there is no recent burn or no calibration', () => {
    expect(recentRate(0, 1, 70)).toBe(0);
    expect(recentRate(70, 0, 70)).toBe(0);
    expect(recentRate(70, 2, 0)).toBe(0);
  });
});

describe('paceValue', () => {
  it('is 1 when you burn exactly the sustainable rate (maxxing)', () => {
    expect(paceValue(1, 1)).toBe(1);
  });

  it('reads the ratio for slow and fast burns', () => {
    expect(paceValue(0.5, 1)).toBeCloseTo(0.5, 6); // half speed
    expect(paceValue(2, 1)).toBeCloseTo(2, 6); // double speed
  });

  it('collapses to 0 when the cap is hit or the reset is reached', () => {
    expect(paceValue(3, 0)).toBe(0); // sustainable 0 (capped)
    expect(paceValue(3, Infinity)).toBe(0); // sustainable ∞ (reset now)
  });
});

describe('paceBounds → zoneOf', () => {
  const bounds = paceBounds(THRESHOLDS);
  const zoneAt = (pace: number) => zoneOf(pace, bounds);

  it('maps each speed band to its named zone', () => {
    expect(zoneAt(0.2)).toBe('underuse'); // beaucoup trop lent
    expect(zoneAt(0.7)).toBe('profitable'); // trop lent
    expect(zoneAt(1)).toBe('clear'); // maxxing 🎯
    expect(zoneAt(1.3)).toBe('warn'); // trop vite
    expect(zoneAt(1.7)).toBe('noreturn'); // beaucoup trop vite
    expect(zoneAt(2.4)).toBe('over'); // blown past the cap trajectory
  });

  it('puts the maxxing sweet spot symmetrically around pace 1', () => {
    expect(zoneAt(0.85)).toBe('clear');
    expect(zoneAt(1.14)).toBe('clear');
    expect(zoneAt(1.15)).toBe('warn'); // upper edge belongs to the next zone
  });

  it('covers the whole track from 0 to the display max', () => {
    expect(bounds[0].low).toBe(0);
    expect(bounds[bounds.length - 1].high).toBe(PACE_DISPLAY_MAX);
  });
});
