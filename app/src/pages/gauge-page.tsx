// The gauge page: the window select and the SPEEDOMETER, a radial dial whose
// needle reads your live pace (rate ÷ the rate that kisses the cap at reset),
// with a ghost marker for your habitual pace and a raw-usage bar underneath as
// the reality anchor. Every number and zone comes from the pure core (via
// useReport); this file only places elements and maps a hovered tick to its zone.

import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { GaugeReport, ToolId, WindowKey, ZoneId } from "@core/types";
import { paceBounds } from "@core/pace/pace-bounds";
import { SEGMENTS, type Segment } from "@core/track/segments";
import { RadialGauge } from "@/components/ui/radial-gauge";
import { ProfitabilityLight } from "./profitability-light";
import {
  ExplainerProvider,
  ExplainerPanel,
  useExplainer,
} from "../gauge/explainer";
import { paceToDisplay, displayBandAt } from "../gauge/pace-track";
import { useReport } from "../gauge/use-report";
import { SignalRefresh } from "../gauge/signal-refresh";
import { WindowSize } from "../gauge/window-size";
import { WindowTabs, WINDOWS } from "../gauge/window-tabs";
import { GaugeCenter, RegionRange } from "../gauge/gauge-center";
import { TokenFooter } from "../gauge/token-footer";
import { RawUsageBar } from "../gauge/raw-usage-bar";

const ZONE_SWEEP_MS = 260; // total stagger across a hovered zone's ticks
const SPEED_MARKS = [0.5, 1, 1.5]; // pace multiples labelled on the dial

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
    <main className="w-full h-full flex flex-col gap-2">
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

      {/*<AdBanner />*/}
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

export function GaugeContent({
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
  const bounds = paceBounds(report.paceThresholds);

  // Broken-axis position [0..100] of a pace value; capped pins to the far edge.
  const needle =
    report.zone === "over" ? 100 : paceToDisplay(report.pace, bounds);
  const ghost = clamp01(paceToDisplay(report.habitualPace, bounds) / 100);

  const bandAt = (fraction: number) => displayBandAt(fraction * 100);
  const hoveredBound = hovered
    ? (bounds.find((b) => b.id === hovered) ?? null)
    : null;

  // Position of a tick within the hovered zone (0 at its low, 1 at its high),
  // used both to isolate the zone and to stagger its ticks into a sweep.
  const zoneProgress = (fraction: number) => {
    const band = bandAt(fraction);
    if (band.seg.id !== hovered) return null;
    const span = band.end - band.start;
    return span > 0 ? clamp01((fraction * 100 - band.start) / span) : 0;
  };

  const marks = SPEED_MARKS.map((p) => ({
    pos: paceToDisplay(p, bounds),
    text: `${p}×`,
  }));

  return (
    <div className="flex h-full">
      <div className="relative flex-1 flex justify-between items-center flex-col bg-[#252525] p-2 pb-6 pt-6 gap-4 drop-shadow-xl border-b">
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
          value={needle}
          min={0}
          max={100}
          ghostFraction={ghost}
          scaleLabels={hovered ? undefined : marks.map((m) => m.pos)}
          formatLabel={(v) =>
            marks.find((m) => Math.abs(m.pos - v) < 0.6)?.text ?? ""
          }
          centerLabel={
            hoveredBound ? (
              <RegionRange low={hoveredBound.low} high={hoveredBound.high} />
            ) : (
              <GaugeCenter report={report} />
            )
          }
          bottomSlot={<ProfitabilityLight report={report} />}
          activeColor={(tick) => bandAt(tick.fraction).seg.color}
          inactiveColor={(tick) =>
            `color-mix(in oklch, ${bandAt(tick.fraction).seg.color} 4%, var(--deep))`
          }
          resolveActive={(tick, isActive) =>
            hovered !== null ? zoneProgress(tick.fraction) !== null : isActive
          }
          fillDelay={(tick) =>
            (zoneProgress(tick.fraction) ?? 0) * ZONE_SWEEP_MS
          }
          onTickHover={(tick) => {
            const zone = tick ? bandAt(tick.fraction).seg.id : null;
            setHovered(zone);
            const seg = zone ? SEGMENT_BY_ID[zone] : null;
            setOverride(
              seg ? { title: seg.label, description: seg.description } : null,
            );
          }}
          tickWidth={2}
          tickLength={12}
          glow={0.6}
          className="w-54"
        />
        <RawUsageBar report={report} />
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
