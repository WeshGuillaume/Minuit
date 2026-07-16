// ⚠️ The Axis-2 signal: GET /api/oauth/usage. Undocumented, unsupported,
// community-identified — it may change schema or vanish. The actual HTTP call is
// done in native Rust (`fetch_usage` command) because the Anthropic org blocks
// browser-origin/CORS requests; this module only invokes it, then caches and
// parses. Any failure returns null → "signal unavailable".

import { invoke } from "@tauri-apps/api/core";
import { readCache, readCacheEntry, writeCache } from "./cache";
import type { Credentials } from "./credentials";

const CACHE_FILE = "usage-cache.json";
const CACHE_TTL = 180_000;

/** Full outcome of one live call — the diagnostic surface behind `doctor`. */
export interface UsageProbe {
  ok: boolean;
  status: number | null; // HTTP status, or null when the request threw
  body: unknown; // parsed JSON on success, else raw text / null
  error: string | null; // thrown message (network, invoke failure…)
}

interface RustProbe {
  ok: boolean;
  status: number;
  body: string;
}

export const probeUsage = async (creds: Credentials): Promise<UsageProbe> => {
  try {
    const r = await invoke<RustProbe>("fetch_usage", { token: creds.accessToken });
    return { ok: r.ok, status: r.status, body: r.ok ? JSON.parse(r.body) : r.body, error: null };
  } catch (e) {
    return {
      ok: false,
      status: null,
      body: null,
      error: e instanceof Error ? e.message : String(e),
    };
  }
};

interface CachedUsage {
  ok: boolean;
  body: unknown;
}

// One live probe that caches its outcome — success AND failure. Caching the 429
// too means the automatic reload path won't re-hit the endpoint for TTL, which
// is what keeps a storm of app reloads from digging deeper into the rate-limit
// bucket. The manual refresh button calls this directly to force a real retry.
export const probeAndCache = async (creds: Credentials): Promise<UsageProbe> => {
  const probe = await probeUsage(creds);
  await writeCache<CachedUsage>(CACHE_FILE, { ok: probe.ok, body: probe.body });
  return probe;
};

export const fetchUsage = async (creds: Credentials): Promise<unknown | null> => {
  const cached = await readCache<CachedUsage>(CACHE_FILE, CACHE_TTL);
  if (cached) return cached.ok ? cached.body : null;
  const probe = await probeAndCache(creds);
  return probe.ok ? probe.body : null;
};

/** The usage body plus WHEN it was observed (cache write time, or now if fresh),
 *  so the caller can extrapolate a live figure between throttled network hits. */
export interface UsageWithMeta {
  body: unknown | null;
  capturedAt: number;
}

export const fetchUsageMeta = async (creds: Credentials): Promise<UsageWithMeta> => {
  const cached = await readCacheEntry<CachedUsage>(CACHE_FILE, CACHE_TTL);
  if (cached) return { body: cached.value.ok ? cached.value.body : null, capturedAt: cached.at };
  const probe = await probeAndCache(creds);
  return { body: probe.ok ? probe.body : null, capturedAt: Date.now() };
};
