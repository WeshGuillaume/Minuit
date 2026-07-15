// OTA update via le plugin Tauri updater. `check()` interroge le latest.json des
// GitHub Releases ; si une version signée existe, on la télécharge, on l'installe
// et on relance. En dev / hors Tauri, `check()` échoue → phase "none" (silencieux).

import { useEffect, useState } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export type UpdaterState =
  | { phase: "checking" }
  | { phase: "none" }
  | { phase: "available"; update: Update }
  | { phase: "downloading"; percent: number };

export function useUpdater() {
  const [state, setState] = useState<UpdaterState>({ phase: "checking" });

  useEffect(() => {
    let active = true;
    check()
      .then((update) => {
        if (active) setState(update ? { phase: "available", update } : { phase: "none" });
      })
      .catch(() => active && setState({ phase: "none" }));
    return () => {
      active = false;
    };
  }, []);

  const install = async () => {
    if (state.phase !== "available") return;
    let downloaded = 0;
    let total = 0;
    await state.update.downloadAndInstall((e) => {
      if (e.event === "Started") total = e.data.contentLength ?? 0;
      else if (e.event === "Progress") {
        downloaded += e.data.chunkLength;
        setState({ phase: "downloading", percent: total ? downloaded / total : 0 });
      }
    });
    await relaunch();
  };

  return { state, install };
}
