// Read-only access to the Claude OAuth token. Two sources, same schema: the
// macOS Keychain (where Claude Code stores it) first, then the plain
// `~/.claude/.credentials.json` fallback. This module NEVER writes: refreshing
// the token (the only path that could disturb a live `claude` session) is a
// separate, opt-in concern that is intentionally not wired here.

import { readTextFile } from "@tauri-apps/plugin-fs";
import { Command } from "@tauri-apps/plugin-shell";
import { claudePath } from "./paths";

export interface Credentials {
  accessToken: string;
  expiresAt: number; // ms epoch; 0 when the source omits it
}

interface CredFile {
  claudeAiOauth?: { accessToken?: string; expiresAt?: number };
}

const parse = (raw: string): Credentials | null => {
  const oauth = (JSON.parse(raw) as CredFile).claudeAiOauth;
  if (!oauth?.accessToken) return null;
  return { accessToken: oauth.accessToken, expiresAt: oauth.expiresAt ?? 0 };
};

const fromKeychain = async (): Promise<Credentials | null> => {
  const out = await Command.create("security", [
    "find-generic-password",
    "-s",
    "Claude Code-credentials",
    "-w",
  ]).execute();
  return out.code === 0 && out.stdout.trim() ? parse(out.stdout) : null;
};

const fromFile = async (): Promise<Credentials | null> =>
  parse(await readTextFile(await claudePath(".credentials.json")));

export const readCredentials = async (): Promise<Credentials | null> => {
  try {
    const keychain = await fromKeychain();
    if (keychain) return keychain;
  } catch {
    // Keychain locked/denied/absent: fall through to the file.
  }
  try {
    return await fromFile();
  } catch {
    return null; // No token anywhere → Axis 2 shows "signal unavailable".
  }
};
