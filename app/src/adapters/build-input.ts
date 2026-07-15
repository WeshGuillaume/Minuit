// The one async seam that assembles a live GaugeInput from the machine: local
// transcripts (Axis 1) + the OAuth usage signal (Axis 2) + pricing + calibration.
// buildGauge stays pure; all disk/network/clock reads are gathered here. Every
// source degrades independently — no token, no network, or a schema drift leaves
// `constraints` empty and the report simply reports "signal unavailable".

import type { GaugeInput, ToolId, WindowKey } from '@core/types';
import { bindingWindow } from '@core/limits/binding-window';
import { scanAllEvents } from './scan';
import type { Credentials } from './credentials';
import { freshCredentials } from './token';
import { fetchUsage, probeAndCache } from './usage-api';
import { parseUsage, windowKeyOf } from './usage-parse';
import { loadPricing } from './pricing';
import { buildCalibration } from './calibration';

const WINDOW_SECONDS: Record<WindowKey, number> = {
  five_hour: 5 * 3_600,
  seven_day: 7 * 86_400,
};

const PLAN_LABELS: Record<string, string> = {
  pro: 'Pro',
  max5x: 'Max 5×',
  max20x: 'Max 20×',
};

// A just-refreshed token bypasses the cache so a stale negative (401) entry
// can't mask it; otherwise the normal 180s-cached path is used.
const usageBody = async (creds: Credentials, bypassCache: boolean): Promise<unknown | null> => {
  if (bypassCache) {
    const probe = await probeAndCache(creds);
    return probe.ok ? probe.body : null;
  }
  return fetchUsage(creds);
};

const liveConstraints = async (window: WindowKey, now: number) => {
  const { creds, refreshed } = await freshCredentials();
  if (!creds) return [];
  const usage = await usageBody(creds, refreshed);
  const all = usage ? parseUsage(usage, now) : [];
  return all.filter((c) => windowKeyOf(c.key) === window);
};

export const buildRealInput = async (tool: ToolId, window: WindowKey): Promise<GaugeInput> => {
  const now = Date.now();
  const pricing = await loadPricing();
  const lookbackMs = pricing.projection.lookbackWeeks * 7 * 86_400_000;
  const windowSeconds = WINDOW_SECONDS[window];

  // The scan only needs files touched within the lookback; floor the horizon to
  // the day so the exact value is stable across the 3-min refreshes (keeps the
  // scan memo warm). The precise per-event filter below still uses `lookbackMs`.
  const DAY_MS = 86_400_000;
  const sinceMs = Math.floor((now - lookbackMs) / DAY_MS) * DAY_MS;

  const [allEvents, constraints] = await Promise.all([
    scanAllEvents(sinceMs),
    liveConstraints(window, now),
  ]);

  const lookbackEvents = allEvents.filter((e) => e.timestamp >= now - lookbackMs);
  const windowEvents = allEvents.filter((e) => e.timestamp >= now - windowSeconds * 1_000);
  const binding = bindingWindow(constraints);

  return {
    tool,
    window,
    now,
    pricing,
    planLabel: PLAN_LABELS[pricing.activePlan] ?? pricing.activePlan,
    events: windowEvents,
    constraints,
    windowSeconds,
    calibration: buildCalibration(windowEvents, lookbackEvents, pricing, binding, now),
  };
};
