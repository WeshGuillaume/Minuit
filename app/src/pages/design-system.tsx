// Canvas to develop and showcase the design system. Two galleries, both driven by
// mock reports (no Tauri / real data):
//   1. RESPONSIVE - the same gauge at a spread of fixed sizes, so every layout
//      tier (label tabs → icon tabs, full → title-only explainer, column → row,
//      centered → bare dial) can be eyeballed side by side, plus a drag-to-resize
//      playground to sweep through the in-between sizes freely.
//   2. ZONES - one full-size gauge per pace zone, to check the dial at each speed.

import { paceBounds } from "@core/track/bounds";
import { zoneOf } from "@core/track/zone-of";
import type { GaugeReport, PaceThresholds, WindowKey } from "@core/types";
import { type ReactNode, useState } from "react";
import { ExplainerProvider } from "../components/gauge/explainer";
import { SIZE_CLUSTERS, type SizeCluster, type WH } from "./design-system-catalog";
import { GaugeContent } from "./gauge-page";

const THRESHOLDS: PaceThresholds = {
  coasting: 0.5,
  maxxing: 0.85,
  redlining: 1.15,
  turbo: 1.5,
  nitro: 2,
};
const NOW = 1_700_000_000_000;

const mock = (over: Partial<GaugeReport>): GaugeReport => {
  const pace = over.pace ?? 1;
  const capped = (over.currentPct ?? 40) >= 100;
  const zone = capped ? "nitro" : zoneOf(pace, paceBounds(THRESHOLDS));
  return {
    tool: "claude",
    window: "seven_day",
    pace,
    smoothPace: pace,
    paceThresholds: THRESHOLDS,
    zone,
    smoothZone: zone,
    smoothRatePct: 1.2,
    sustainableRatePct: 1.5,
    currentPct: 40,
    landingPct: 70,
    smoothLandingPct: 70,
    hoursToCap: 30,
    smoothHoursToCap: 30,
    hoursUntilReset: 40,
    resetsAt: NOW + 40 * 3_600_000,
    ratio: 58,
    breakEvenRatio: 1.1,
    apiValue: 2709,
    planLabel: "Max 20×",
    tokens: {
      input: 120_000,
      output: 45_000,
      cacheRead: 2_000_000,
      cacheWrite5m: 0,
      cacheWrite1h: 0,
      total: 2_165_000,
      perHour: 85_000,
      cacheHitRate: 0.94,
    },
    calibrated: true,
    signalAvailable: true,
    measuring: false,
    ...over,
  };
};

const MAXXING = mock({ pace: 1.0, currentPct: 55, landingPct: 99 });
// Longest zone label ("Underfarming"): the real-world case that wraps onto a
// second line at the smallest dial sizes if the label isn't dropped in time.
const UNDERFARMING = mock({ pace: 0.3, currentPct: 20, landingPct: 40 });

// A live gauge fixed to a given box, with its own explainer scope and window
// state: exactly how it renders in the app, only the size is pinned.
function Frame({ report, width, height }: { report: GaugeReport; width: number; height: number }) {
  const [window, setWindow] = useState<WindowKey>("seven_day");
  return (
    <div style={{ width, height }} className="flex overflow-hidden rounded-lg ring-1 ring-white/10">
      <ExplainerProvider>
        <GaugeContent
          report={report}
          refreshing={false}
          onRefreshed={() => {}}
          window={window}
          setWindow={setWindow}
        />
      </ExplainerProvider>
    </div>
  );
}

// The design page opts its labels OUT of the app's global `user-select: none`
// (index.css, for the native-window feel) so a specimen's `WxH` can be copied
// into a bug report. `.selectable` is an un-layered rule in index.css — a
// layered Tailwind `select-text` utility can't beat the un-layered `*` rule.
const COPYABLE = "selectable cursor-text";

// One sweep specimen: its pinned box, labelled with the raw dimensions and its
// aspect ratio, so a whole cluster reads as a continuous morph. The label is
// selectable so it can be copied verbatim as a reference for feedback.
function Specimen({ size }: { size: WH }) {
  const [width, height] = size;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className={`text-[11px] tabular-nums text-muted-foreground ${COPYABLE}`}>
        {width}×{height}
        <span className="ml-1 opacity-50">{(width / height).toFixed(2)}</span>
      </span>
      <Frame report={MAXXING} width={width} height={height} />
    </div>
  );
}

// One orientation family: its whole swept row of specimens under a shared head.
function Cluster({ cluster }: { cluster: SizeCluster }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className={`text-[13px] font-medium text-foreground/80 ${COPYABLE}`}>
        {cluster.title} <span className="ml-2 text-muted-foreground">{cluster.hint}</span>
      </h3>
      <div className="flex flex-wrap items-end gap-x-5 gap-y-6">
        {cluster.sizes.map((size) => (
          <Specimen key={`${size[0]}x${size[1]}`} size={size} />
        ))}
      </div>
    </section>
  );
}

// A resizable box (drag the bottom-right corner) to sweep every in-between size.
function Playground() {
  const [window, setWindow] = useState<WindowKey>("seven_day");
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-[11px] text-muted-foreground">Playground · drag the corner ↘</span>
      <div
        className="flex resize overflow-hidden rounded-lg ring-1 ring-white/10"
        style={{ width: 330, height: 467, minWidth: 120, minHeight: 120 }}
      >
        <ExplainerProvider>
          <GaugeContent
            report={MAXXING}
            refreshing={false}
            onRefreshed={() => {}}
            window={window}
            setWindow={setWindow}
          />
        </ExplainerProvider>
      </div>
    </div>
  );
}

const ZONES: { label: string; report: GaugeReport }[] = [
  { label: "Coasting · 0.7×", report: mock({ pace: 0.7, currentPct: 30, landingPct: 62 }) },
  { label: "Maxxing · 1.0×", report: mock({ pace: 1.0, currentPct: 55, landingPct: 99 }) },
  { label: "Redlining · 1.3×", report: mock({ pace: 1.3, currentPct: 62, landingPct: 118 }) },
  { label: "Turbo · 1.7×", report: mock({ pace: 1.7, currentPct: 70, landingPct: 140 }) },
  { label: "Nitro · 100%", report: mock({ pace: 0, currentPct: 100, landingPct: 100 }) },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <div className="flex flex-wrap items-start gap-6">{children}</div>
    </section>
  );
}

export default function DesignSystem() {
  return (
    <main className="flex h-full flex-col gap-10 overflow-y-auto p-6">
      <nav className="text-[13px]">
        <a href="#/" className="text-info no-underline hover:underline">
          ← Back to the gauge
        </a>
      </nav>

      <Section title="Responsive · shape sweep">
        <div className="flex w-full flex-col gap-10">
          {SIZE_CLUSTERS.map((cluster) => (
            <Cluster key={cluster.title} cluster={cluster} />
          ))}
          <div className="flex flex-wrap items-end gap-x-5 gap-y-6">
            {(
              [
                [80, 80],
                [248, 312],
                [300, 440],
              ] as WH[]
            ).map(([w, h]) => (
              <div key={`uf-${w}x${h}`} className="flex flex-col items-center gap-1.5">
                <span className={`text-[11px] tabular-nums text-muted-foreground ${COPYABLE}`}>
                  {w}×{h} · longest label ("Underfarming")
                </span>
                <Frame report={UNDERFARMING} width={w} height={h} />
              </div>
            ))}
          </div>
          <Playground />
        </div>
      </Section>

      <Section title="Zones">
        {ZONES.map((z) => (
          <div key={z.label} className="flex flex-col items-center gap-2">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {z.label}
            </span>
            <Frame report={z.report} width={300} height={440} />
          </div>
        ))}
      </Section>
    </main>
  );
}
