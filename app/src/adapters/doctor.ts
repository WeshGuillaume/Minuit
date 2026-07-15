// Axis-2 diagnostic: walk the live signal stage by stage and report exactly
// where it stops. Mirrors the CLI's `doctor` command. Attached to `window` in
// dev (see main.tsx) so `await ccgaugeDoctor()` can be run from the console.

import { readCredentials } from './credentials';
import { probeUsage } from './usage-api';
import { parseUsage } from './usage-parse';
import { scanAllEvents } from './scan';

export interface Diagnosis {
  events: number; // local turns found (Axis 1 source)
  credentials: 'ok' | 'missing';
  tokenExpiresIn: string; // human hint, or 'expired' / 'n/a'
  usage: 'ok' | 'unreachable';
  usageStatus: number | null; // HTTP status of the live call (null = threw)
  usageError: string | null; // thrown message when the call didn't complete
  constraints: number; // rate-limit windows parsed from the signal
  raw: unknown; // the raw usage body (JSON on ok, error text otherwise)
}

const expiryHint = (expiresAt: number): string => {
  if (!expiresAt) return 'n/a';
  const ms = expiresAt - Date.now();
  return ms <= 0 ? 'expired' : `${Math.round(ms / 3_600_000)}h`;
};

export const doctor = async (): Promise<Diagnosis> => {
  const events = (await scanAllEvents(0)).length; // 0 = full history, no lookback floor
  const creds = await readCredentials();
  if (!creds) {
    return {
      events, credentials: 'missing', tokenExpiresIn: 'n/a',
      usage: 'unreachable', usageStatus: null, usageError: null, constraints: 0, raw: null,
    };
  }
  const probe = await probeUsage(creds);
  return {
    events,
    credentials: 'ok',
    tokenExpiresIn: expiryHint(creds.expiresAt),
    usage: probe.ok ? 'ok' : 'unreachable',
    usageStatus: probe.status,
    usageError: probe.error,
    constraints: probe.ok ? parseUsage(probe.body, Date.now()).length : 0,
    raw: probe.body,
  };
};
