/*
 * OTA update via the Tauri updater plugin. `check()` queries the GitHub
 * Releases latest.json; if a signed version exists, it's downloaded,
 * installed, and relaunched automatically, with no user action. In dev / outside
 * Tauri, `check()` fails silently → phase "none".
 */

import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import { useEffect, useState } from "react";

export type UpdaterState =
  | { phase: "checking" }
  | { phase: "none" }
  | { phase: "downloading"; version: string; percent: number }
  | { phase: "relaunching" };

export function useUpdater() {
  const [state, setState] = useState<UpdaterState>({ phase: "checking" });

  useEffect(() => {
    let active = true;

    check()
      .then(async (update) => {
        if (!update) {
          if (active) setState({ phase: "none" });
          return;
        }

        let downloaded = 0;
        let total = 0;
        if (active) setState({ phase: "downloading", version: update.version, percent: 0 });
        await update.downloadAndInstall((e) => {
          if (!active) return;
          if (e.event === "Started") total = e.data.contentLength ?? 0;
          else if (e.event === "Progress") {
            downloaded += e.data.chunkLength;
            setState({
              phase: "downloading",
              version: update.version,
              percent: total ? downloaded / total : 0,
            });
          }
        });
        if (active) setState({ phase: "relaunching" });
        await relaunch();
      })
      .catch(() => active && setState({ phase: "none" }));

    return () => {
      active = false;
    };
  }, []);

  return { state };
}
