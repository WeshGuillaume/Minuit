// Tolerant parse of the /api/oauth/usage body into RateConstraints. The shape is
//   { five_hour: {utilization, resets_at}, seven_day: {...},
//     seven_day_opus: null, seven_day_sonnet: {...}, extra_usage: {...} }
// A Max plan lights up several seven_day_* caps at once; each becomes its own
// independent constraint (bindingWindow keeps the worst). Unknown/absent keys
// are simply skipped — nothing here hard-fails on a schema drift.

import type { RateConstraint, WindowKey } from "@core/types";

const FIVE_HOUR = 5 * 3_600;
const SEVEN_DAY = 7 * 86_400;

const WINDOWS: Record<string, { seconds: number; label: string }> = {
  five_hour: { seconds: FIVE_HOUR, label: "5 h" },
  seven_day: { seconds: SEVEN_DAY, label: "Hebdo" },
  seven_day_opus: { seconds: SEVEN_DAY, label: "Hebdo · Opus" },
  seven_day_sonnet: { seconds: SEVEN_DAY, label: "Hebdo · Sonnet" },
};

interface RawWindow {
  utilization?: number;
  resets_at?: string;
}

const toConstraint = (key: string, raw: RawWindow, now: number): RateConstraint | null => {
  if (typeof raw.utilization !== "number") return null;
  const resetsAt = raw.resets_at ? Date.parse(raw.resets_at) : NaN;
  return {
    key,
    label: WINDOWS[key].label,
    usedPercent: raw.utilization,
    resetsAt: Number.isNaN(resetsAt) ? now : resetsAt,
    windowSeconds: WINDOWS[key].seconds,
  };
};

export const parseUsage = (body: unknown, now: number): RateConstraint[] => {
  if (!body || typeof body !== "object") return [];
  const record = body as Record<string, RawWindow | null>;
  return Object.keys(WINDOWS)
    .map((key) => (record[key] ? toConstraint(key, record[key] as RawWindow, now) : null))
    .filter((c): c is RateConstraint => c !== null);
};

/** Which UI window a constraint key belongs to (all seven_day_* → weekly). */
export const windowKeyOf = (key: string): WindowKey =>
  key.startsWith("five") ? "five_hour" : "seven_day";
