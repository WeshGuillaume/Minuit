// Tiny TTL'd JSON cache under `~/.minuit`. Used to throttle the unofficial
// usage endpoint (which 429s aggressively) to one call per few minutes. Both
// read and write are best-effort: a missing/corrupt/stale entry just misses.

import { exists, mkdir, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { gaugePath } from "./paths";

interface Entry<T> {
  at: number; // ms epoch when written
  value: T;
}

// Read the full entry (value + write time) when still within TTL. `at` lets a
// caller know HOW OLD the cached value is, used to extrapolate a live figure
// from a throttled signal (see buildGauge's currentPct advance).
export const readCacheEntry = async <T>(
  name: string,
  ttlMs: number,
): Promise<{ value: T; at: number } | null> => {
  try {
    const entry = JSON.parse(await readTextFile(await gaugePath(name))) as Entry<T>;
    return Date.now() - entry.at <= ttlMs ? { value: entry.value, at: entry.at } : null;
  } catch {
    return null;
  }
};

export const readCache = async <T>(name: string, ttlMs: number): Promise<T | null> =>
  (await readCacheEntry<T>(name, ttlMs))?.value ?? null;

export const writeCache = async <T>(name: string, value: T): Promise<void> => {
  try {
    const dir = await gaugePath();
    if (!(await exists(dir))) await mkdir(dir, { recursive: true });
    const entry: Entry<T> = { at: Date.now(), value };
    await writeTextFile(await gaugePath(name), JSON.stringify(entry));
  } catch {
    // Cache is an optimization, never a requirement.
  }
};
