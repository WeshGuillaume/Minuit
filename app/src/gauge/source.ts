// The single seam between the page and its data: return a GaugeReport for the
// selected tool/window. Today it runs the pure core on sample input; the real
// backend (Tauri plugin-fs + plugin-http → buildGauge) slots in here later
// without changing the signature.

import type { GaugeReport, ToolId, WindowKey } from '@core/types'
import { buildGauge } from '@core/report/build-gauge'
import { sampleInput } from './sample'

export const loadReport = (tool: ToolId, window: WindowKey): GaugeReport =>
  buildGauge(sampleInput(tool, window))
