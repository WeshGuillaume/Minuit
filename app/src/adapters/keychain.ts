// macOS Keychain read/write for the Claude Code credentials item. On macOS the
// token lives only here (no file), so refreshing it means updating THIS item in
// place — which is precisely what keeps a parallel `claude` session in sync
// instead of stranding it on a rotated-away refresh token.
//
// `security` prints attributes on stdout, and the secret (with -w) on stdout too
// but from a separate call. `add-generic-password -U` updates the existing item.

import { Command } from "@tauri-apps/plugin-shell";

const SERVICE = "Claude Code-credentials";

const security = (args: string[]) => Command.create("security", args).execute();

export interface KeychainItem {
  account: string;
  secret: string; // the stored JSON blob
}

export const readKeychainItem = async (): Promise<KeychainItem | null> => {
  const pw = await security(["find-generic-password", "-s", SERVICE, "-w"]);
  if (pw.code !== 0 || !pw.stdout.trim()) return null;
  const attrs = await security(["find-generic-password", "-s", SERVICE]);
  const account = /"acct"<blob>="([^"]*)"/.exec(attrs.stdout)?.[1] ?? "";
  return { account, secret: pw.stdout.trim() };
};

export const writeKeychainItem = async (account: string, secret: string): Promise<boolean> => {
  const out = await security([
    "add-generic-password",
    "-U",
    "-s",
    SERVICE,
    "-a",
    account,
    "-w",
    secret,
  ]);
  return out.code === 0;
};
