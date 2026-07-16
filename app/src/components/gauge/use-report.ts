// Async bridge from the page to loadReport: re-runs whenever tool/window change,
// ignores stale results if they change mid-flight. It seeds from the last cached
// report (localStorage) so a cold start paints the previous gauge immediately
// while the fresh scan runs, exposing `refreshing` so the page can show a small
// spinner instead of a blank loader.
//
// Two cadences, deliberately decoupled: a FOREGROUND load (mount, tool/window
// switch, manual reload) shows the spinner; a SILENT background tick recomputes
// every REFRESH_MS. The local jsonl scan is cheap (incremental, mtime-cached) so
// the needle can follow your live burn every few seconds, while the unofficial
// usage endpoint stays TTL-throttled underneath (see usage-api CACHE_TTL) — a
// silent tick only repaints from fresh LOCAL data, it does not re-hit the network.

import type { GaugeReport, ToolId, WindowKey } from "@core/types";
import { useEffect, useState } from "react";
import { readCachedReport, writeCachedReport } from "./report-cache";
import { loadReport } from "./source";

const REFRESH_MS = 15_000; // local recompute cadence; network stays throttled below

export interface ReportState {
  report: GaugeReport | null;
  refreshing: boolean;
  reload: () => void;
}

export const useReport = (tool: ToolId, window: WindowKey): ReportState => {
  const [report, setReport] = useState<GaugeReport | null>(() => readCachedReport(tool, window));
  const [refreshing, setRefreshing] = useState(true);
  const [nonce, setNonce] = useState(0);

  // On a tool/window switch, show that pair's cached report right away so the
  // gauge never flashes empty before the fresh load lands.
  useEffect(() => {
    setReport(readCachedReport(tool, window));
  }, [tool, window]);

  // Foreground load: mount, tool/window change, or manual reload. Shows the spinner.
  // biome-ignore lint/correctness/useExhaustiveDependencies: nonce is a bump counter — reload() increments it purely to force this effect to re-run.
  useEffect(() => {
    let live = true;
    setRefreshing(true);
    loadReport(tool, window).then((next) => {
      if (!live) return;
      setReport(next);
      writeCachedReport(tool, window, next);
      setRefreshing(false);
    });
    return () => {
      live = false;
    };
  }, [tool, window, nonce]);

  // Silent background refresh: cheap local recompute every REFRESH_MS, no spinner.
  useEffect(() => {
    let live = true;
    const id = setInterval(() => {
      loadReport(tool, window).then((next) => {
        if (!live) return;
        setReport(next);
        writeCachedReport(tool, window, next);
      });
    }, REFRESH_MS);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [tool, window]);

  return { report, refreshing, reload: () => setNonce((n) => n + 1) };
};
