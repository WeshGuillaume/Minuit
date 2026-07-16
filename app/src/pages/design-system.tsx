// Canvas to develop and showcase the design system. Two galleries, both driven by
// mock reports (no Tauri / real data):
//   1. RESPONSIVE — the same gauge at a spread of fixed sizes, so every layout
//      tier (label tabs → icon tabs, full → title-only explainer, column → row,
//      centered → bare dial) can be eyeballed side by side, plus a drag-to-resize
//      playground to sweep through the in-between sizes freely.
//   2. ZONES — one full-size gauge per pace zone, to check the dial at each speed.

import { useState, type ReactNode } from "react";
import type { GaugeReport, PaceThresholds, WindowKey } from "@core/types";
import { paceBounds } from "@core/pace/pace-bounds";
import { zoneOf } from "@core/track/zone-of";
import { ExplainerProvider } from "../gauge/explainer";
import { GaugeContent } from "./gauge-page";

const THRESHOLDS: PaceThresholds = { underfarm: 0.5, slow: 0.85, fast: 1.15, redline: 1.5, blown: 2 };
const NOW = 1_700_000_000_000;

const mock = (over: Partial<GaugeReport>): GaugeReport => {
  const pace = over.pace ?? 1;
  const capped = (over.currentPct ?? 40) >= 100;
  return {
    tool: "claude",
    window: "seven_day",
    pace,
    habitualPace: 1.1,
    paceThresholds: THRESHOLDS,
    zone: capped ? "over" : zoneOf(pace, paceBounds(THRESHOLDS)),
    recentRatePct: 1.2,
    habitualRatePct: 1.3,
    sustainableRatePct: 1.5,
    currentPct: 40,
    landingPct: 70,
    hoursToCap: 30,
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
    ...over,
  };
};

const MAXXING = mock({ pace: 1.0, currentPct: 55, landingPct: 99 });
// Longest zone label ("Underfarming") — the real-world case that wraps onto a
// second line at the smallest dial sizes if the label isn't dropped in time.
const UNDERFARMING = mock({ pace: 0.3, currentPct: 20, landingPct: 40 });

// A live gauge fixed to a given box, with its own explainer scope and window
// state — exactly how it renders in the app, only the size is pinned.
function Frame({ report, width, height }: { report: GaugeReport; width: number; height: number }) {
  const [window, setWindow] = useState<WindowKey>("seven_day");
  return (
    <div style={{ width, height }} className="flex overflow-hidden rounded-lg ring-1 ring-white/10">
      <ExplainerProvider>
        <GaugeContent report={report} refreshing={false} onRefreshed={() => {}} window={window} setWindow={setWindow} />
      </ExplainerProvider>
    </div>
  );
}

function Specimen({ label, width, height }: { label: string; width: number; height: number }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-[11px] tabular-nums text-muted-foreground">
        {label} · {width}×{height}
      </span>
      <Frame report={MAXXING} width={width} height={height} />
    </div>
  );
}

const SIZES: { label: string; width: number; height: number }[] = [
  { label: "Full", width: 330, height: 467 },
  { label: "Narrow → icon tabs", width: 240, height: 467 },
  { label: "No center", width: 190, height: 430 },
  { label: "Shorter → title only", width: 320, height: 380 },
  { label: "Short → row", width: 320, height: 300 },
  { label: "Row, wide", width: 470, height: 260 },
  { label: "Row + narrow → bare-ish", width: 250, height: 240 },
  { label: "Very short landscape", width: 348, height: 120 },
  { label: "Column, moderate", width: 238, height: 362 },
  { label: "Column, full desc", width: 335, height: 480 },
  { label: "Column, top gap check", width: 274, height: 443 },
  { label: "Micro landscape → icon tabs", width: 377, height: 120 },
  { label: "Bare tiny square", width: 120, height: 120 },
  { label: "Bare tiny", width: 150, height: 150 },
  { label: "Below OS minimum", width: 80, height: 80 },
];

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
          <GaugeContent report={MAXXING} refreshing={false} onRefreshed={() => {}} window={window} setWindow={setWindow} />
        </ExplainerProvider>
      </div>
    </div>
  );
}

const ZONES: { label: string; report: GaugeReport }[] = [
  { label: "Coasting · 0.7×", report: mock({ pace: 0.7, currentPct: 30, landingPct: 62 }) },
  { label: "Maxxing · 1.0×", report: mock({ pace: 1.0, currentPct: 55, landingPct: 99 }) },
  { label: "Redlining · 1.3×", report: mock({ pace: 1.3, currentPct: 62, landingPct: 118 }) },
  { label: "Way too fast · 1.7×", report: mock({ pace: 1.7, currentPct: 70, landingPct: 140 }) },
  { label: "Capped · 100%", report: mock({ pace: 0, currentPct: 100, landingPct: 100 }) },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      <div className="flex flex-wrap items-start gap-6">{children}</div>
    </section>
  );
}

export default function DesignSystem() {
  return (
    <main className="flex min-h-screen flex-col gap-10 p-6">
      <nav className="text-[13px]">
        <a href="#/" className="text-[#66aaff] no-underline hover:underline">
          ← Back to the gauge
        </a>
      </nav>

      <Section title="Responsive">
        {SIZES.map((s) => (
          <Specimen key={s.label} {...s} />
        ))}
        <div className="flex flex-col items-center gap-2">
          <span className="text-[11px] tabular-nums text-muted-foreground">
            Below OS minimum, longest label · 80×80
          </span>
          <Frame report={UNDERFARMING} width={80} height={80} />
        </div>
        <Playground />
      </Section>

      <Section title="Zones">
        {ZONES.map((z) => (
          <div key={z.label} className="flex flex-col items-center gap-2">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{z.label}</span>
            <Frame report={z.report} width={300} height={440} />
          </div>
        ))}
      </Section>
    </main>
  );
}
