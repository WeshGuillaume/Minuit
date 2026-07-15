import { describe, expect, it } from 'vitest';
import { toTrack } from './to-track';
import { realBounds } from './real-bounds';

// Heavy-user bounds: underuse [0,0.33], profitable [0.33,0.73], clear [0.73,85],
// warn [85,100], noreturn [100,115], over [115,130]. Display offsets 0,13,26,70,80,88
// (widths 13/13/44/10/8/12).
const bounds = realBounds({ underuseEndsAt: 0.33, breakEvenAt: 0.73 });

describe('toTrack', () => {
  it('maps segment boundaries to their exact display offsets', () => {
    expect(toTrack(0, bounds)).toBe(0);
    expect(toTrack(0.33, bounds)).toBeCloseTo(13, 6); // end of underuse / start of profitable
    expect(toTrack(0.73, bounds)).toBeCloseTo(26, 6); // start of clear
    expect(toTrack(85, bounds)).toBeCloseTo(70, 6); // start of warn
    expect(toTrack(100, bounds)).toBeCloseTo(80, 6); // start of noreturn
    expect(toTrack(115, bounds)).toBeCloseTo(88, 6); // start of over
    expect(toTrack(130, bounds)).toBeCloseTo(100, 6);
  });

  it('places a mid-zone value proportionally WITHIN its display band', () => {
    // 92.5% is halfway through warn [85,100] -> offset 70 + 0.5*10 = 75
    expect(toTrack(92.5, bounds)).toBeCloseTo(75, 6);
  });

  it('is monotonic non-decreasing and never NaN across the range', () => {
    let prev = -1;
    for (let p = 0; p <= 130; p += 0.5) {
      const t = toTrack(p, bounds);
      expect(Number.isNaN(t)).toBe(false);
      expect(t).toBeGreaterThanOrEqual(prev);
      prev = t;
    }
  });

  it('clamps out-of-range inputs', () => {
    expect(toTrack(-10, bounds)).toBe(0);
    expect(toTrack(999, bounds)).toBe(100);
  });

  it('steps across a collapsed (empty) zone without NaN', () => {
    const light = realBounds({ underuseEndsAt: 40, breakEvenAt: 92 }); // clear is empty
    expect(Number.isNaN(toTrack(92, light))).toBe(false);
    expect(toTrack(91, light)).toBeLessThanOrEqual(toTrack(93, light));
  });
});
