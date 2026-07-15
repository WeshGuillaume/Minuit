// Tiny TTL'd JSON cache under `~/.cc-gauge`. Used to throttle the unofficial
// usage endpoint (which 429s aggressively) to one call per few minutes. Both
// read and write are best-effort: a missing/corrupt/stale entry just misses.

import { readTextFile, writeTextFile, mkdir, exists } from '@tauri-apps/plugin-fs';
import { gaugePath } from './paths';

interface Entry<T> {
  at: number; // ms epoch when written
  value: T;
}

export const readCache = async <T>(name: string, ttlMs: number): Promise<T | null> => {
  try {
    const entry = JSON.parse(await readTextFile(await gaugePath(name))) as Entry<T>;
    return Date.now() - entry.at <= ttlMs ? entry.value : null;
  } catch {
    return null;
  }
};

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
