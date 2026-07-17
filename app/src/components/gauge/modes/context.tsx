// The selected gauge mode, shared across the dial and its center readout so both
// speak the same unit at once. It lives in context (not local state) because two
// separate widgets - the center number and the scale ticks - must read the one
// choice, and the click that cycles it lands on the center while the ticks react.
// The choice is persisted (localStorage), same key the old center toggle used.
//
// The MODES themselves are built from the runtime display config (~/.minuit →
// which axis the dial draws). It loads once on mount; until it lands we render
// the default (broken pace), then swap to the configured build, no flash, and no
// signal-availability coupling (this is a pure display pref).

import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { loadConfig } from "@/adapters/config";
import { buildGaugeModes, type DisplayConfig, MODE_ORDER } from "./registry";
import type { GaugeMode, ModeId } from "./types";

const STORAGE_KEY = "minuit:center-mode";
const DEFAULT_DISPLAY: DisplayConfig = { paceAxis: "broken" };

const loadMode = (): ModeId => {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved && (MODE_ORDER as string[]).includes(saved) ? (saved as ModeId) : "live";
};

interface GaugeModeStore {
  mode: GaugeMode;
  cycle: () => void;
}

const GaugeModeCtx = createContext<GaugeModeStore | null>(null);

export function GaugeModeProvider({ children }: { children: ReactNode }) {
  const [id, setId] = useState<ModeId>(loadMode);
  const [display, setDisplay] = useState<DisplayConfig>(DEFAULT_DISPLAY);

  useEffect(() => {
    let live = true;
    loadConfig().then((c) => {
      if (live) setDisplay({ paceAxis: c.paceAxis });
    });
    return () => {
      live = false;
    };
  }, []);

  const modes = useMemo(() => buildGaugeModes(display), [display]);

  const store = useMemo<GaugeModeStore>(() => {
    const cycle = () =>
      setId((cur) => {
        const next = MODE_ORDER[(MODE_ORDER.indexOf(cur) + 1) % MODE_ORDER.length];
        localStorage.setItem(STORAGE_KEY, next);
        return next;
      });
    return { mode: modes[id], cycle };
  }, [modes, id]);

  return <GaugeModeCtx.Provider value={store}>{children}</GaugeModeCtx.Provider>;
}

export function useGaugeMode(): GaugeModeStore {
  const ctx = useContext(GaugeModeCtx);
  if (!ctx) throw new Error("useGaugeMode must be used within GaugeModeProvider");
  return ctx;
}
