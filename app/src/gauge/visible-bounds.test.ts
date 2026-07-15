import { describe, expect, it } from 'vitest'
import { realBounds } from '@core/track/real-bounds'
import { visibleBounds } from './visible-bounds'

describe('visibleBounds', () => {
  it('snaps the sliver Axis-1 zones of a heavy user shut, contiguously', () => {
    const v = visibleBounds(realBounds({ underuseEndsAt: 0.33, breakEvenAt: 0.73 }))
    expect(v.map((x) => [x.id, x.low, x.high])).toEqual([
      ['underuse', 0, 0], // < 1% → empty
      ['profitable', 0, 0], // < 1% → empty
      ['clear', 0, 85], // maxxing owns the whole sub-cap track
      ['warn', 85, 100],
      ['noreturn', 100, 115],
      ['over', 115, 130],
    ])
  })

  it('keeps an Axis-1 zone once it is at least MIN_WIDTH wide', () => {
    const v = visibleBounds(realBounds({ underuseEndsAt: 0.4, breakEvenAt: 6 }))
    expect(v.find((x) => x.id === 'underuse')).toEqual({ id: 'underuse', low: 0, high: 0 })
    expect(v.find((x) => x.id === 'profitable')).toEqual({ id: 'profitable', low: 0, high: 6 })
    expect(v.find((x) => x.id === 'clear')).toEqual({ id: 'clear', low: 6, high: 85 })
  })

  it('never collapses the fixed plafond zones', () => {
    const v = visibleBounds(realBounds({ underuseEndsAt: 30, breakEvenAt: 60 }))
    expect(v.find((x) => x.id === 'warn')).toEqual({ id: 'warn', low: 85, high: 100 })
    expect(v.find((x) => x.id === 'noreturn')).toEqual({ id: 'noreturn', low: 100, high: 115 })
    expect(v.find((x) => x.id === 'over')).toEqual({ id: 'over', low: 115, high: 130 })
    // wide Axis-1 zones pass through untouched
    expect(v.find((x) => x.id === 'underuse')).toEqual({ id: 'underuse', low: 0, high: 30 })
  })
})
