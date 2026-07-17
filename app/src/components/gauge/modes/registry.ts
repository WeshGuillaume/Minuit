// Assembles the display modes from the runtime config. Both modes are the same Nx
// dial at two smoothings of the pace metric — live (readout window) and smooth
// (longer window) — sharing one axis (broken vs linear, per ~/.minuit config).
// Each mode just picks which pace/zone the needle reads.

import type { AxisMode } from "@/adapters/config";
import { buildMultiplierMode } from "./multiplier";
import type { GaugeMode, ModeId } from "./types";

export interface DisplayConfig {
  paceAxis: AxisMode;
}

/** The modes for a given display config — both share the configured pace axis. */
export const buildGaugeModes = (display: DisplayConfig): Record<ModeId, GaugeMode> => ({
  live: buildMultiplierMode(
    "live",
    "live",
    { pace: (r) => r.pace, zone: (r) => r.zone },
    display.paceAxis,
  ),
  smooth: buildMultiplierMode(
    "smooth",
    "smooth",
    { pace: (r) => r.smoothPace, zone: (r) => r.smoothZone },
    display.paceAxis,
  ),
});

/** Cycle order for the center toggle; also the persisted-value allow-list. */
export const MODE_ORDER: ModeId[] = ["live", "smooth"];
