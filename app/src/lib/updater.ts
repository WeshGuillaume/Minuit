// OTA update via le plugin Tauri updater. `check()` interroge le latest.json des
// GitHub Releases ; si une version signée existe, elle est téléchargée, installée
// et relancée automatiquement, sans action utilisateur. En dev / hors Tauri,
// `check()` échoue → phase "none" (silencieux).

import { useEffect, useState } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

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
