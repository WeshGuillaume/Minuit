import { describe, expect, it } from 'vitest';
import { buildGauge } from './build-gauge';
import type { GaugeInput, Pricing, UsageEvent } from '../types';

const pricing: Pricing = {
  updated: '2026-07-15',
  models: {
    opus: { input: 15, output: 75, cacheRead: 1.5, cacheWrite5m: 18.75, cacheWrite1h: 30 },
  },
  match: [{ pattern: 'opus', family: 'opus' }],
  subscriptions: { max20x: 200 },
  activePlan: 'max20x',
  subscriptionPeriodDays: 30.44,
  ratioThresholds: { underuse: 0.5, breakEven: 1.1 },
  projection: { lookbackWeeks: 4, profilePercentile: 75 },
};

const NOW = 1_700_000_000_000;
const event = (over: Partial<UsageEvent>): UsageEvent => ({
  uuid: 'u',
  timestamp: NOW,
  model: 'claude-opus-4-8',
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite5m: 0,
  cacheWrite1h: 0,
  ...over,
});

// One opus turn worth exactly $75 of API value; a live 7-day constraint at 39%,
// resetting in 40h; calibrated from a single real window ($2709.47 @ 39%).
const input: GaugeInput = {
  tool: 'claude',
  window: 'seven_day',
  now: NOW,
  pricing,
  planLabel: 'Max 20×',
  events: [event({ output: 1_000_000 })],
  constraints: [
    { key: 'seven_day', label: 'Weekly', usedPercent: 39, resetsAt: NOW + 40 * 3_600_000, windowSeconds: 7 * 86_400 },
  ],
  windowSeconds: 7 * 86_400,
  calibration: {
    samples: [{ apiValue: 2709.47, pctConsumed: 39 }],
    instant: { apiValue: 75, pctConsumed: 39 },
    activeHourRates: [1, 2, 3],
    profile: Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0)),
    remainingHours: [],
  },
};

describe('buildGauge (end-to-end orchestration)', () => {
  const r = buildGauge(input);

  it('carries the raw Axis-1 figures', () => {
    expect(r.apiValue).toBeCloseTo(75, 6);
    expect(r.windowSubCost).toBeCloseTo(45.9921, 3);
    expect(r.ratio).toBeCloseTo(75 / 45.9921, 4);
  });

  it('projects the calibrated thresholds onto the percent axis (§5.2 control)', () => {
    expect(r.breakEvenAt).toBeCloseTo(0.728, 2);
    expect(r.underuseEndsAt).toBeCloseTo(0.331, 2);
    expect(r.calibrated).toBe(true);
  });

  it('derives Axis-2 positions from the live signal', () => {
    expect(r.currentPct).toBe(39);
    expect(r.signalAvailable).toBe(true);
    expect(r.noReturnPct).toBeCloseTo(52, 6); // 100 - calm(1.2)*40h
    expect(r.hoursLeft).toBeCloseTo(30.5, 6); // (100-39)/habitual(2)
  });

  it('computes the elapsed subscription share from the reset alignment', () => {
    // 168h window − 40h left = 128h elapsed → 200·128/730.56
    expect(r.elapsedSubShare).toBeCloseTo(35.0416, 3);
  });

  it('resolves the current zone and the projection', () => {
    expect(r.zone).toBe('clear');
    expect(r.projectedPct).toBe(39); // no remaining-hour profile → stays put
  });

  it('degrades cleanly when the usage signal is absent', () => {
    const blind = buildGauge({ ...input, constraints: [] });
    expect(blind.signalAvailable).toBe(false);
    expect(blind.currentPct).toBe(0);
    expect(blind.zone).toBe('underuse');
    expect(Number.isNaN(blind.breakEvenAt)).toBe(false);
  });
});
