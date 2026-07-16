// Opt-in Axis-2 recovery, extracted so any surface (the gauge center, a banner…)
// can trigger it. One call runs the OAuth token refresh, warms the usage cache
// with exactly one probe, then asks the page to reload. This is the sole
// user-facing path that writes credentials; nothing here fires without a click.

import { useState } from "react";
import { readCredentials } from "../../adapters/credentials";
import { type RefreshResult, refreshCredentials } from "../../adapters/refresh";
import { probeAndCache } from "../../adapters/usage-api";
import { parseUsage } from "../../adapters/usage-parse";

const ERRORS: Record<Exclude<RefreshResult, "ok">, string> = {
  "no-token": "No token",
  "refresh-failed": "Refresh failed",
  "write-failed": "Keychain write refused",
};

export interface SignalRefresh {
  run: () => Promise<void>;
  busy: boolean;
  error: string | null;
}

// onRefreshed is optional: on success the probe warms the usage cache, so even
// without an explicit reload the silent 15s poll recovers the signal on its own.
export function useSignalRefresh(onRefreshed: () => void = () => {}): SignalRefresh {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await refreshCredentials();
      if (result !== "ok") {
        setError(ERRORS[result]);
        return;
      }
      // Token refreshed. Make exactly ONE usage call (which warms the cache) so
      // the reload reuses it instead of hitting the endpoint again back-to-back.
      const creds = await readCredentials();
      const probe = creds ? await probeAndCache(creds) : null;
      if (probe?.ok && parseUsage(probe.body, Date.now()).length > 0) onRefreshed();
      else setError(`usage ${probe?.status ?? probe?.error ?? "—"}`);
    } catch (e) {
      console.error("[minuit refresh] threw", e);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return { run, busy, error };
}
