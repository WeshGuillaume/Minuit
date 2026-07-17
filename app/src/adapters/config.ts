// Runtime settings from `~/.minuit/config.json`, the same file the native side
// writes/reads for window geometry (see src-tauri/src/config.rs). This reader
// pulls only the frontend-owned bits (work schedule, dial-axis display, the
// live + smooth pace windows); any missing, malformed, or out-of-range value
// silently falls back to its default, so an absent config behaves like a sane
// default UI.
//
// The two smoothing windows are PER RATE-LIMIT WINDOW: a 2-min live reading fits
// the 5-hour sprint, but on the weekly cap the same burst reads far above a
// sustainable-over-days rate and pins the needle hot — so weekly wants a longer
// window. Each key accepts a scalar (applied to both windows) OR a
// `{ five_hour, seven_day }` object for per-window control.

import type { WindowKey } from "@core/types";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { gaugePath } from "./paths";

/** How a dial draws its scale: the fixed pace track, or a true-proportion axis. */
export type AxisMode = "broken" | "linear";

// Minutes. Live = the needle's responsiveness; smooth = the steady "recent
// rhythm" that doesn't flatline between prompts. Both scale up for the weekly
// cap, whose sustainable rate is spread over days, not hours.
const DEFAULT_READOUT_MIN: Record<WindowKey, number> = { five_hour: 2, seven_day: 20 };
const DEFAULT_SMOOTH_MIN: Record<WindowKey, number> = { five_hour: 30, seven_day: 240 };
const MAX_READOUT_MIN = 240; // 4h: past this the "live" needle isn't live anymore
const MAX_SMOOTH_MIN = 1440; // 24h: a full day of smoothing is the sane ceiling

export interface MinuitConfig {
  /** Hours per day you actually work, 0 < h ≤ 24. Anchors sustainableRate. */
  workHoursPerDay: number;
  /** Pace dial axis (both smoothing modes share it). */
  paceAxis: AxisMode;
  /** How far back the LIVE pace (needle/zone/center) looks, in HOURS, per window —
   *  shorter = nervier, longer = calmer. Set via `pace.readoutMinutes`. */
  readoutWindowHours: Record<WindowKey, number>;
  /** How far back the SMOOTH pace looks, in HOURS, per window — the steady recent
   *  rhythm. Set via `pace.smoothMinutes`. */
  smoothWindowHours: Record<WindowKey, number>;
}

const toHours = (perWindow: Record<WindowKey, number>): Record<WindowKey, number> => ({
  five_hour: perWindow.five_hour / 60,
  seven_day: perWindow.seven_day / 60,
});

const DEFAULT_CONFIG: MinuitConfig = {
  workHoursPerDay: 24,
  paceAxis: "broken",
  readoutWindowHours: toHours(DEFAULT_READOUT_MIN),
  smoothWindowHours: toHours(DEFAULT_SMOOTH_MIN),
};

const validHours = (h: unknown): h is number =>
  typeof h === "number" && Number.isFinite(h) && h > 0 && h <= 24;

const validMinutes = (m: unknown, max: number): m is number =>
  typeof m === "number" && Number.isFinite(m) && m > 0 && m <= max;

const axisOr = (v: unknown, fallback: AxisMode): AxisMode =>
  v === "broken" || v === "linear" ? v : fallback;

// Resolve `pace.<key>` (scalar → both windows, or `{ five_hour, seven_day }` →
// per-window) into hours per window, falling back per-window to the default.
const perWindowHours = (
  raw: unknown,
  defaults: Record<WindowKey, number>,
  max: number,
): Record<WindowKey, number> => {
  const scalar = validMinutes(raw, max) ? raw : undefined;
  const at = (w: WindowKey): number => {
    const own = raw && typeof raw === "object" ? (raw as Record<string, unknown>)[w] : undefined;
    return (validMinutes(own, max) ? own : (scalar ?? defaults[w])) / 60;
  };
  return { five_hour: at("five_hour"), seven_day: at("seven_day") };
};

export const loadConfig = async (): Promise<MinuitConfig> => {
  try {
    const raw = JSON.parse(await readTextFile(await gaugePath("config.json")));
    return {
      workHoursPerDay: validHours(raw?.work?.hoursPerDay) ? raw.work.hoursPerDay : 24,
      paceAxis: axisOr(raw?.display?.paceAxis, "broken"),
      readoutWindowHours: perWindowHours(
        raw?.pace?.readoutMinutes,
        DEFAULT_READOUT_MIN,
        MAX_READOUT_MIN,
      ),
      smoothWindowHours: perWindowHours(
        raw?.pace?.smoothMinutes,
        DEFAULT_SMOOTH_MIN,
        MAX_SMOOTH_MIN,
      ),
    };
  } catch {
    return DEFAULT_CONFIG;
  }
};
