// Auto-refresh gate: hand back usable credentials, transparently refreshing an
// expired token first. Refresh writes the Keychain, so it fires ONLY when the
// token is actually expired (it lasts ~8h, not on every load), and a short
// cooldown prevents rapid re-attempts when the refresh itself keeps failing.
// `refreshed` lets the caller bypass the usage cache, whose negative entry would
// otherwise mask the just-refreshed token for the rest of its TTL.

import { type Credentials, readCredentials } from "./credentials";
import { refreshCredentials } from "./refresh";

const REFRESH_COOLDOWN = 30_000;
let lastAttempt = 0;

export interface FreshCreds {
  creds: Credentials | null;
  refreshed: boolean;
}

export const freshCredentials = async (): Promise<FreshCreds> => {
  const creds = await readCredentials();
  if (!creds) return { creds: null, refreshed: false };

  const expired = creds.expiresAt > 0 && creds.expiresAt <= Date.now();
  if (!expired || Date.now() - lastAttempt < REFRESH_COOLDOWN) {
    return { creds, refreshed: false };
  }

  lastAttempt = Date.now();
  if ((await refreshCredentials()) !== "ok") return { creds, refreshed: false };
  return { creds: await readCredentials(), refreshed: true };
};
