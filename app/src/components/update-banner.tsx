/*
 * Update overlay: full-screen, blocking, no way to dismiss it. As soon as a
 * version is detected, the download + install starts automatically (see
 * useUpdater); this screen only shows its progress.
 */

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { loadConfig } from "@/adapters/config";
import { useUpdater } from "@/lib/updater";

export function UpdateBanner() {
  const [autoUpdate, setAutoUpdate] = useState(false);

  useEffect(() => {
    let live = true;
    loadConfig().then((c) => {
      if (live) setAutoUpdate(c.autoUpdate);
    });
    return () => {
      live = false;
    };
  }, []);

  const { state } = useUpdater(autoUpdate);

  if (state.phase === "downloading") {
    return (
      <Overlay>
        <Loader2 className="size-6 animate-spin text-primary" />
        <span className="text-sm">
          Updating to {state.version}… {Math.round(state.percent * 100)}%
        </span>
      </Overlay>
    );
  }

  if (state.phase === "relaunching") {
    return (
      <Overlay>
        <Loader2 className="size-6 animate-spin text-primary" />
        <span className="text-sm">Restarting…</span>
      </Overlay>
    );
  }

  return null;
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/95 text-foreground backdrop-blur">
      {children}
    </div>
  );
}
