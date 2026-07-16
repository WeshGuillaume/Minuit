// The single seam between the page and its data: return a GaugeReport for the
// selected tool/window. It now reads the real machine — local transcripts + the
// OAuth usage signal — via the adapter layer, then runs the pure core on it. The
// signature is async so the page can await it; buildGauge itself stays pure.

import { buildGauge } from "@core/report/build-gauge";
import type { GaugeReport, ToolId, WindowKey } from "@core/types";
import { buildRealInput } from "../../adapters/build-input";
import { demoReport } from "./demo";

export const loadReport = async (tool: ToolId, window: WindowKey): Promise<GaugeReport> =>
  demoReport(tool, window) ?? buildGauge(await buildRealInput(tool, window));
