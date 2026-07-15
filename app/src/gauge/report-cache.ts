// Last-known-good report per (tool, window), persisted in localStorage. A cold
// start can paint the previous gauge instantly while the fresh scan runs behind
// a small spinner, no blank-loader flash on every launch.
//
// The key carries a SCHEMA version: a report shape change (e.g. adding
// paceThresholds) means an old cached blob would render against new UI and crash
// on a missing field. Bumping SCHEMA makes those old keys simply not match, so a
// stale-shape report is never read; the cold start falls back to the loader.

import type { GaugeReport, ToolId, WindowKey } from '@core/types';

const SCHEMA = 'v2'; // ⬆ bump whenever GaugeReport's shape changes
const keyOf = (tool: ToolId, window: WindowKey) => `cc-gauge:report:${SCHEMA}:${tool}:${window}`;

export const readCachedReport = (tool: ToolId, window: WindowKey): GaugeReport | null => {
  const raw = localStorage.getItem(keyOf(tool, window));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GaugeReport;
  } catch {
    return null;
  }
};

export const writeCachedReport = (
  tool: ToolId,
  window: WindowKey,
  report: GaugeReport,
): void => {
  localStorage.setItem(keyOf(tool, window), JSON.stringify(report));
};
