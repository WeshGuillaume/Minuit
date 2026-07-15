// The gauge page: the window select, the radial gauge coloured by the
// calculated zones, and a hover-driven explainer. Every number and zone comes
// from the pure core — this file just places elements and maps a hovered tick
// back to its zone.

import { useState } from "react";
import type { ToolId, WindowKey, ZoneId } from "@core/types";
import { realBounds } from "@core/track/real-bounds";
import { zoneOf } from "@core/track/zone-of";
import { SEGMENTS, type Segment } from "@core/track/segments";
import { RadialGauge } from "@/components/ui/radial-gauge";
import { ProfitabilityLight } from "./profitability-light";
import {
  ExplainerProvider,
  ExplainerPanel,
  useExplainer,
} from "../gauge/explainer";
import { zoneColorForPct } from "../gauge/zone-color";
import { loadReport } from "../gauge/source";

const GAUGE_MIN = 0;
const GAUGE_MAX = 130;
const SCALE_LABELS = [0, 30, 60, 100, 130];
const ZONE_SWEEP_MS = 260; // total stagger across a hovered zone's ticks

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

const SEGMENT_BY_ID = Object.fromEntries(
  SEGMENTS.map((s) => [s.id, s]),
) as Record<ZoneId, Segment>;

const WINDOWS: { id: WindowKey; label: string }[] = [
  { id: "seven_day", label: "Weekly" },
  { id: "five_hour", label: "5-hour" },
];

export default function GaugePage() {
  return (
    <ExplainerProvider>
      <GaugeView />
    </ExplainerProvider>
  );
}

function GaugeView() {
  const tool: ToolId = "claude";
  const [window, setWindow] = useState<WindowKey>("seven_day");
  const [hovered, setHovered] = useState<ZoneId | null>(null);
  const { setOverride } = useExplainer();
  const report = loadReport(tool, window);
  const bounds = realBounds(report);

  const zoneAt = (fraction: number) => zoneOf(fraction * GAUGE_MAX, bounds);
  const colorAt = (fraction: number) =>
    zoneColorForPct(fraction * GAUGE_MAX, report);
  const explained = SEGMENT_BY_ID[hovered ?? report.zone];
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
    <main className="w-full h-full px-6 pb-6 pt-10 flex justify-around flex-col gap-4">
      <div
        data-tauri-drag-region
        className="fixed inset-x-0 cursor-grab top-0 z-50 h-4"
      >
        <div className="w-10 translate-y-2 pointer-events-none h-0.5 rounded-full bg-white/30 mx-auto" />
      </div>

      <div className="gap-4 flex justify-center">
        <select
          className="text-xs text-muted-foreground font-semibold"
          value={window}
          onChange={(e) => setWindow(e.target.value as WindowKey)}
        >
          {WINDOWS.map((w) => (
            <option key={w.id} value={w.id}>
              {w.label}
            </option>
          ))}
        </select>
      </div>

      <div className="w-full flex jsutify-center items-center flex-col">
        <RadialGauge
          value={report.currentPct}
          min={GAUGE_MIN}
          max={GAUGE_MAX}
          scaleLabels={SCALE_LABELS}
          formatLabel={(v) => `${Math.round(v)}%`}
          centerLabel={
            hoveredBound
              ? `${Math.round(hoveredBound.low)}–${Math.round(hoveredBound.high)}%`
              : undefined
          }
          centerSubLabel={explained.label}
          centerSuffix="%"
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
          glow={0.9}
          className="max-w-64"
        >
          <ProfitabilityLight report={report} />
        </RadialGauge>
        <ExplainerPanel
          fallback={{
            title: SEGMENT_BY_ID[report.zone].label,
            description: SEGMENT_BY_ID[report.zone].description,
          }}
        />
      </div>
    </main>
  );
}
