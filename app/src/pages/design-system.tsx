// Canvas to develop and showcase the design system. Current specimen: the pace
// SPEEDOMETER across its zones, driven by mock reports (no Tauri/real data), so
// the dial, ghost marker, raw-usage bar and center readout can be eyeballed at
// each speed without waiting for a live window to drift into that state.

import { useState } from "react";
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

function Specimen({ label, report }: { label: string; report: GaugeReport }) {
  const [window, setWindow] = useState<WindowKey>("seven_day");
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <div className="h-[440px] w-[300px]">
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
    </div>
  );
}

const SPECIMENS = [
  { label: "Coasting · 0.7×", report: mock({ pace: 0.7, currentPct: 30, landingPct: 62 }) },
  { label: "Maxxing · 1.0×", report: mock({ pace: 1.0, currentPct: 55, landingPct: 99 }) },
  { label: "Redlining · 1.3×", report: mock({ pace: 1.3, currentPct: 62, landingPct: 118 }) },
  { label: "Way too fast · 1.7×", report: mock({ pace: 1.7, currentPct: 70, landingPct: 140 }) },
  { label: "Capped · 100%", report: mock({ pace: 0, currentPct: 100, landingPct: 100 }) },
];

export default function DesignSystem() {
  return (
    <main className="flex min-h-screen flex-col">
      <nav className="mb-5 p-6 text-[13px]">
        <a href="#/" className="text-[#66aaff] no-underline hover:underline">
          ← Back to the gauge
        </a>
      </nav>
      <div className="flex flex-wrap items-start justify-center gap-6 p-6">
        {SPECIMENS.map((s) => (
          <Specimen key={s.label} {...s} />
        ))}
      </div>
    </main>
  );
}
