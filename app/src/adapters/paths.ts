// Home-anchored path builders for the two directories the adapters read/write:
// Claude's own data (`~/.claude`) and Minuit's local state (`~/.minuit`).
// Everything else in the adapter layer takes absolute paths from here so the
// Tauri fs scope only ever has to allow these two roots.

import { homeDir, join } from "@tauri-apps/api/path";

export const claudePath = async (...segments: string[]): Promise<string> =>
  join(await homeDir(), ".claude", ...segments);

export const gaugePath = async (...segments: string[]): Promise<string> =>
  join(await homeDir(), ".minuit", ...segments);
