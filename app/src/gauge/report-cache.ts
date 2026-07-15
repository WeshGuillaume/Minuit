// Last-known-good report per (tool, window), persisted in localStorage. A cold
// start can paint the previous gauge instantly while the fresh scan runs behind
// a small spinner — no blank-loader flash on every launch. Stored data is
// external (user-editable, possibly a stale schema), so the read guards its parse.

import type { GaugeReport, ToolId, WindowKey } from '@core/types';

const keyOf = (tool: ToolId, window: WindowKey) => `cc-gauge:report:${tool}:${window}`;

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
