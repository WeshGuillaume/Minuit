// English labels for each GaugeReport field. Keyed on `keyof GaugeReport`, so
// adding a field to the report without a label here is a type error.

import type { GaugeReport } from "@core/types";

export const FIELD_LABELS: Record<keyof GaugeReport, string> = {
  tool: "Tool",
  window: "Window",
  pace: "Pace (live)",
  smoothPace: "Pace (smooth)",
  paceThresholds: "Pace zones",
  zone: "Zone (live)",
  smoothZone: "Zone (smooth)",
  smoothRatePct: "Smoothed rate",
  sustainableRatePct: "Maxxing rate",
  currentPct: "Current usage",
  landingPct: "Landing at reset",
  hoursToCap: "Time to cap",
  hoursUntilReset: "Time to reset",
  resetsAt: "Reset",
  ratio: "Profitability ratio",
  breakEvenRatio: "“At a loss” ratio",
  apiValue: "API value",
  planLabel: "Plan",
  tokens: "Token breakdown",
  calibrated: "Calibrated",
  signalAvailable: "Signal available",
};
