// ⚠️ OAuth refresh — the ONLY code that writes credentials. Opt-in (a button),
// never automatic. POST the refresh grant to the (unofficial) token endpoint,
// then write the rotated tokens back into the SAME Keychain item Claude uses, so
// the two stay in sync rather than fighting over a rotated refresh token. The
// prior secret is backed up once (`~/.cc-gauge/credentials-backup.json`) before
// the first write. Any failure leaves the Keychain untouched.

import { fetch } from '@tauri-apps/plugin-http';
import { exists, mkdir, writeTextFile } from '@tauri-apps/plugin-fs';
import { readKeychainItem, writeKeychainItem } from './keychain';
import { gaugePath } from './paths';

const CLIENT_ID = '9d1c250a-e61b-44d9-88ed-5944d1962f5e';
// platform.claude.com is the live endpoint; console.anthropic.com is the legacy
// fallback (404s for new logins, kept for older tokens).
const TOKEN_URLS = [
  'https://platform.claude.com/v1/oauth/token',
  'https://console.anthropic.com/v1/oauth/token',
];

export type RefreshResult = 'ok' | 'no-token' | 'refresh-failed' | 'write-failed';

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
}

interface OAuthCreds {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  [key: string]: unknown;
}

interface CredJson {
  claudeAiOauth?: OAuthCreds;
  [key: string]: unknown;
}

const postRefresh = async (refreshToken: string): Promise<TokenResponse | null> => {
  const body = JSON.stringify({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: CLIENT_ID,
  });
  for (const url of TOKEN_URLS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      if (res.ok) return res.json();
      // Error bodies carry no secret — safe to log for diagnosis.
      console.warn('[cc-gauge refresh] non-ok', url, res.status, await res.text());
    } catch (e) {
      console.warn('[cc-gauge refresh] threw', url, e);
    }
  }
  return null;
};

const backupOnce = async (secret: string): Promise<void> => {
  const dir = await gaugePath();
  if (!(await exists(dir))) await mkdir(dir, { recursive: true });
  const path = await gaugePath('credentials-backup.json');
  if (!(await exists(path))) await writeTextFile(path, secret);
};

// Preserve every unknown field; only the three token fields are replaced.
const merge = (parsed: CredJson, oauth: OAuthCreds, token: TokenResponse): CredJson => ({
  ...parsed,
  claudeAiOauth: {
    ...oauth,
    accessToken: token.access_token,
    refreshToken: token.refresh_token ?? oauth.refreshToken,
    expiresAt: Date.now() + (token.expires_in ?? 0) * 1_000,
  },
});

export const refreshCredentials = async (): Promise<RefreshResult> => {
  const item = await readKeychainItem();
  if (!item) return 'no-token';

  let parsed: CredJson;
  try {
    parsed = JSON.parse(item.secret);
  } catch {
    return 'no-token';
  }
  const oauth = parsed.claudeAiOauth;
  if (!oauth?.refreshToken) return 'no-token';

  const token = await postRefresh(oauth.refreshToken);
  if (!token?.access_token) return 'refresh-failed';

  await backupOnce(item.secret);
  const ok = await writeKeychainItem(item.account, JSON.stringify(merge(parsed, oauth, token)));
  return ok ? 'ok' : 'write-failed';
};
