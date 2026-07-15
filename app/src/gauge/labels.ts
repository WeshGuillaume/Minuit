// English labels for each GaugeReport field. Keyed on `keyof GaugeReport`, so
// adding a field to the report without a label here is a type error.

import type { GaugeReport } from '@core/types'

export const FIELD_LABELS: Record<keyof GaugeReport, string> = {
  tool: 'Tool',
  window: 'Window',
  currentPct: 'Current position',
  projectedPct: 'Projected at reset',
  noReturnPct: 'Point of no return',
  breakEvenAt: '“At a loss” line',
  underuseEndsAt: 'End of underfarming',
  ratio: 'Profitability ratio',
  breakEvenRatio: '“At a loss” ratio',
  apiValue: 'API value',
  windowSubCost: 'Sub cost / window',
  elapsedSubShare: 'Sub share elapsed',
  hoursLeft: 'Runway (hours)',
  resetsAt: 'Reset',
  zone: 'Zone',
  planLabel: 'Plan',
  calibrated: 'Calibrated',
  signalAvailable: 'Signal available',
}
