// The gauge page: the window select, the radial gauge coloured by the
// calculated zones, and a hover-driven explainer. Every number and zone comes
// from the pure core (via loadReport, which now reads the real machine) — this
// file just places elements and maps a hovered tick back to its zone.

import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { GaugeReport, ToolId, WindowKey, ZoneId } from "@core/types";
import { realBounds } from "@core/track/real-bounds";
import { zoneOf } from "@core/track/zone-of";
import { visibleBounds } from "../gauge/visible-bounds";
import { SEGMENTS, type Segment } from "@core/track/segments";
import { RadialGauge } from "@/components/ui/radial-gauge";
import { ProfitabilityLight } from "./profitability-light";
import {
  ExplainerProvider,
  ExplainerPanel,
  useExplainer,
} from "../gauge/explainer";
import { zoneColorForPct } from "../gauge/zone-color";
import { useReport } from "../gauge/use-report";
import { SignalRefresh } from "../gauge/signal-refresh";
import { AdBanner } from "../components/ad-banner";
import { WindowSize } from "../gauge/window-size";
import { WindowTabs, WINDOWS } from "../gauge/window-tabs";
import { EtaCenter, RegionRange } from "../gauge/eta-center";
import { TokenFooter } from "../gauge/token-footer";

const GAUGE_MIN = 0;
const GAUGE_MAX = 130;
const SCALE_LABELS = [0, 30, 65, 100, 130];
const ZONE_SWEEP_MS = 260; // total stagger across a hovered zone's ticks

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

const SEGMENT_BY_ID = Object.fromEntries(
  SEGMENTS.map((s) => [s.id, s]),
) as Record<ZoneId, Segment>;

const WINDOW_STORAGE_KEY = "cc-gauge:window";

const loadWindow = (): WindowKey => {
  const saved = localStorage.getItem(WINDOW_STORAGE_KEY);
  return WINDOWS.some((w) => w.id === saved)
    ? (saved as WindowKey)
    : "seven_day";
};

export default function GaugePage() {
  return (
    <ExplainerProvider>
      <GaugeView />
    </ExplainerProvider>
  );
}

function GaugeView() {
  const tool: ToolId = "claude";
  const [window, setWindow] = useState<WindowKey>(loadWindow);
  const { report, refreshing, reload } = useReport(tool, window);

  return (
    <main className="w-full h-full px-4 pb-4 pt-8.5 flex flex-col gap-2">
      <div
        data-tauri-drag-region
        className="fixed inset-x-0 cursor-grab top-0 z-50 h-4"
      >
        <div className="w-10 translate-y-2 pointer-events-none h-0.5 rounded-full bg-white/30 mx-auto" />
      </div>
      <WindowSize />

      {report ? (
        <GaugeContent
          report={report}
          refreshing={refreshing}
          onRefreshed={reload}
          window={window}
          setWindow={setWindow}
        />
      ) : (
        <GaugeLoading />
      )}

      <AdBanner />
    </main>
  );
}

function GaugeLoading() {
  return (
    <div className="w-full flex-1 flex items-center justify-center text-muted-foreground">
      <Loader2 className="size-6 animate-spin" />
    </div>
  );
}

function RefreshDot({ show }: { show: boolean }) {
  // Sits over the (possibly stale) gauge while a fresh scan resolves; fades out
  // rather than popping so a fast refresh doesn't flicker.
  return (
    <div
      className={`absolute right-3 top-3 z-10 transition-opacity duration-300 ${
        show ? "opacity-100" : "opacity-0"
      }`}
    >
      <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
    </div>
  );
}

function GaugeContent({
  report,
  refreshing,
  onRefreshed,
  window,
  setWindow,
}: {
  report: GaugeReport;
  refreshing: boolean;
  onRefreshed: () => void;
  window: WindowKey;
  setWindow: (next: WindowKey) => void;
}) {
  const [hovered, setHovered] = useState<ZoneId | null>(null);
  const { setOverride } = useExplainer();
  const bounds = visibleBounds(realBounds(report));

  const zoneAt = (fraction: number) => zoneOf(fraction * GAUGE_MAX, bounds);
  const colorAt = (fraction: number) =>
    zoneColorForPct(fraction * GAUGE_MAX, report);
  const hoveredBound = hovered
    ? (bounds.find((b) => b.id === hovered) ?? null)
    : null;

  // Position of a tick within the hovered zone (0 at its low, 1 at its high),
  // used both to isolate the zone and to stagger its ticks into a sweep.
  const zoneProgress = (fraction: number) => {
    if (!hoveredBound) return null;
    const pct = fraction * GAUGE_MAX;
    if (zoneAt(fraction) !== hovered) return null;
    const span = hoveredBound.high - hoveredBound.low;
    return span > 0 ? clamp01((pct - hoveredBound.low) / span) : 0;
  };

  return (
    <div className="flex h-full">
      <div className="relative flex-1 flex justify-between items-center flex-col bg-[#252525] p-2 pb-6 gap-4 rounded-2xl drop-shadow-xl border">
        <RefreshDot show={refreshing} />
        <div className="flex justify-center">
          <WindowTabs
            value={window}
            onChange={(next) => {
              localStorage.setItem(WINDOW_STORAGE_KEY, next);
              setWindow(next);
            }}
          />
        </div>
        <RadialGauge
          value={report.currentPct}
          min={GAUGE_MIN}
          max={GAUGE_MAX}
          scaleLabels={SCALE_LABELS}
          formatLabel={(v) => `${Math.round(v)}%`}
          centerLabel={
            hoveredBound ? (
              <RegionRange low={hoveredBound.low} high={hoveredBound.high} />
            ) : (
              <EtaCenter report={report} />
            )
          }
          bottomSlot={<ProfitabilityLight report={report} />}
          activeColor={(tick) => colorAt(tick.fraction)}
          inactiveColor={(tick) =>
            `color-mix(in oklch, ${colorAt(tick.fraction)} 4%, var(--deep))`
          }
          resolveActive={(tick, isActive) =>
            hovered !== null ? zoneProgress(tick.fraction) !== null : isActive
          }
          fillDelay={(tick) =>
            (zoneProgress(tick.fraction) ?? 0) * ZONE_SWEEP_MS
          }
          onTickHover={(tick) => {
            const zone = tick ? zoneAt(tick.fraction) : null;
            setHovered(zone);
            const seg = zone ? SEGMENT_BY_ID[zone] : null;
            setOverride(
              seg ? { title: seg.label, description: seg.description } : null,
            );
          }}
          tickWidth={1}
          tickLength={12}
          glow={0.1}
          // className="flex-1"
        />
        <TokenFooter report={report} />
        <ExplainerPanel
          fallback={{
            title: SEGMENT_BY_ID[report.zone].label,
            description: SEGMENT_BY_ID[report.zone].description,
          }}
        />
        {!report.signalAvailable && <SignalRefresh onRefreshed={onRefreshed} />}
      </div>
    </div>
  );
}
