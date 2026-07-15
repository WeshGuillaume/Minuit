// Stand-in GaugeInput per (tool, window) so the selects actually change the
// numbers, until the real Tauri data read is wired. buildGauge runs on this
// exactly as it would on live data.

import type { GaugeInput, Pricing, ToolId, WindowKey } from '@core/types'

const pricing: Pricing = {
  updated: '2026-07-15',
  models: { opus: { input: 15, output: 75, cacheRead: 1.5, cacheWrite5m: 18.75, cacheWrite1h: 30 } },
  match: [{ pattern: 'opus', family: 'opus' }],
  subscriptions: { max20x: 200 },
  activePlan: 'max20x',
  subscriptionPeriodDays: 30.44,
  ratioThresholds: { underuse: 0.5, breakEven: 1.1 },
  projection: { lookbackWeeks: 4, profilePercentile: 75 },
}

interface Seed {
  usedPercent: number
  windowSeconds: number
  resetsInHours: number
  outputTokens: number
}

const SEEDS: Record<WindowKey, Seed> = {
  seven_day: { usedPercent: 41, windowSeconds: 7 * 86_400, resetsInHours: 60, outputTokens: 37_800_000 },
  five_hour: { usedPercent: 82, windowSeconds: 5 * 3_600, resetsInHours: 0.7, outputTokens: 58_600 },
}

export const sampleInput = (tool: ToolId, window: WindowKey): GaugeInput => {
  const now = Date.now()
  const s = SEEDS[window]
  const apiValue = (s.outputTokens * pricing.models.opus.output) / 1_000_000
  return {
    tool,
    window,
    now,
    pricing,
    planLabel: 'Max 20×',
    events: [
      { uuid: 's1', timestamp: now - 1000, model: 'claude-opus-4-8', input: 0, output: s.outputTokens, cacheRead: 0, cacheWrite5m: 0, cacheWrite1h: 0 },
    ],
    constraints: [
      { key: window, label: window, usedPercent: s.usedPercent, resetsAt: now + s.resetsInHours * 3_600_000, windowSeconds: s.windowSeconds },
    ],
    windowSeconds: s.windowSeconds,
    calibration: {
      samples: [],
      instant: { apiValue, pctConsumed: s.usedPercent },
      activeHourRates: [1, 2, 3, 4],
      profile: Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0)),
      remainingHours: [],
    },
  }
}
