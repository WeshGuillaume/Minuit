// Axis-1's local event stream. The heavy walk + parse of ~/.claude/projects now
// runs natively in Rust (see src-tauri/src/scan) — this just invokes it and
// memoizes the result briefly so switching windows or the 3-min usage refresh
// doesn't re-invoke a scan that can't have changed. The Rust side keeps its own
// on-disk cache, so a cold app start only re-parses the transcripts touched
// since last run; `sinceMs` lets it skip files older than the lookback entirely.

import type { UsageEvent } from "@core/types";
import { invoke } from "@tauri-apps/api/core";
import { claudePath, gaugePath } from "./paths";

const MEMO_TTL = 60_000;

const scanFresh = async (sinceMs: number): Promise<UsageEvent[]> => {
  const [root, cachePath] = await Promise.all([
    claudePath("projects"),
    gaugePath("scan-cache.json"),
  ]);
  return invoke<UsageEvent[]>("scan_events", { root, cachePath, sinceMs });
};

// Keyed by `sinceMs` so callers wanting different horizons (the gauge's lookback
// vs. doctor's full history) don't clobber each other's cached scan.
const memo = new Map<number, { at: number; events: Promise<UsageEvent[]> }>();

export const scanAllEvents = (sinceMs: number): Promise<UsageEvent[]> => {
  const hit = memo.get(sinceMs);
  if (hit && Date.now() - hit.at < MEMO_TTL) return hit.events;
  const events = scanFresh(sinceMs);
  memo.set(sinceMs, { at: Date.now(), events });
  events.catch(() => {
    if (memo.get(sinceMs)?.events === events) memo.delete(sinceMs);
  });
  return events;
};
