// The speedometer itself: the radial dial, its live needle and habitual-pace
// ghost, the hovered-zone sweep, the center readout and the profitability badge.
//
// Responsiveness here is pure CSS: the dial establishes its own named container
// ("dial", sized to itself) with three thresholds (index.css), each dropping
// one more thing as the dial shrinks — decoration first, then the caption,
// with the number itself the last to go:
//   • --container-dial-decorated (190px) — below it, RadialGauge swaps to its
//     coarse/wide tick ring and drops the scale labels, and the badge here
//     hides too: decoration goes before the essentials.
//   • --container-dial-captioned (130px) — below it, the zone caption under
//     the pace number (gauge-center.tsx) hides; the number stays. Below it,
//     the bottomSlot's arc-gap space (see below) takes over showing the zone
//     name instead of leaving it blank — the arc doesn't sweep a full circle,
//     so that space is already reserved, not claimed from the panel.
//   • --container-dial-interactive (90px) — below it, the center readout
//     hides and the tick hit target itself goes inert (an !important
//     container-query override of its own inline pointer-events, in
//     radial-gauge-tick.tsx) — genuinely non-interactive, not just quiet.
// The dial's own SIZE (how much of the panel it claims) is the caller's call —
// see gauge-page.tsx, which differs it by orientation — this component only
// owns its shape and its internal degradation. No JS measurement either way.

import { useState } from "react";
import type { GaugeReport, ZoneId } from "@core/types";
import { paceBounds } from "@core/pace/pace-bounds";
import { SEGMENTS, type Segment } from "@core/track/segments";
import { RadialGauge } from "@/components/ui/radial-gauge";
import { paceToDisplay, displayBandAt } from "./pace-track";
import { useExplainer } from "./explainer";
import { GaugeCenter, RegionRange } from "./gauge-center";
import { ShimmerText } from "./shimmer-text";
import { ProfitabilityLight } from "../pages/profitability-light";

const ZONE_SWEEP_MS = 260; // total stagger across a hovered zone's ticks
const SPEED_MARKS = [0.5, 1, 1.5]; // pace multiples labelled on the dial

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

const SEGMENT_BY_ID = Object.fromEntries(
  SEGMENTS.map((s) => [s.id, s]),
) as Record<ZoneId, Segment>;

// Shape/behaviour invariants true regardless of how the caller sizes the dial;
// the actual width formula is the caller's (see gauge-page.tsx).
const DIAL_SHAPE = "aspect-square shrink-0";

export function SpeedoDial({
  report,
  onRefreshed,
  className,
}: {
  report: GaugeReport;
  onRefreshed?: () => void;
  className?: string;
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
  const zoneProgress = (fraction: number): number | null => {
    const band = bandAt(fraction);
    if (band.seg.id !== hovered) return null;
    const span = band.end - band.start;
    return span > 0 ? clamp01((fraction * 100 - band.start) / span) : 0;
  };

  const marks = SPEED_MARKS.map((pace) => ({
    pos: paceToDisplay(pace, bounds),
    text: `${pace}×`,
  }));

  const handleHover = (tick: { fraction: number } | null) => {
    const zone = tick ? bandAt(tick.fraction).seg.id : null;
    setHovered(zone);
    const seg = zone ? SEGMENT_BY_ID[zone] : null;
    setOverride(
      seg ? { title: seg.label, description: seg.description } : null,
    );
  };

  return (
    <RadialGauge
      value={needle}
      min={0}
      max={100}
      ghostFraction={ghost}
      scaleLabels={hovered ? undefined : marks.map((m) => m.pos)}
      formatLabel={(v) =>
        marks.find((m) => Math.abs(m.pos - v) < 0.6)?.text ?? ""
      }
      compactTickCount={25}
      compactTickLength={20}
      compactTickRadius={80}
      centerLabel={
        // `contents` (rather than `block`/`flex`) drops the wrapper's own box
        // once revealed, so the readout sits directly in RadialGauge's own
        // centering flex column exactly as if this span weren't there.
        <span className="hidden @dial-interactive/dial:contents">
          {hoveredBound ? (
            <RegionRange low={hoveredBound.low} high={hoveredBound.high} />
          ) : (
            <GaugeCenter report={report} onRefreshed={onRefreshed} />
          )}
        </span>
      }
      bottomSlot={
        // The arc doesn't sweep a full circle — its open bottom is already
        // reserved space, not something to additionally claim from the panel.
        // Above dial-decorated it's the $ badge; below dial-captioned the
        // center's OWN caption (gauge-center.tsx) has already hidden, so the
        // zone name moves down here instead of just leaving the gap empty.
        // Between the two thresholds neither shows — the caption up top is
        // still doing that job, and showing it twice would be redundant.
        <>
          <span className="hidden @dial-decorated/dial:block">
            <ProfitabilityLight report={report} />
          </span>
          <span className="block @dial-captioned/dial:hidden">
            <ShimmerText
              text={SEGMENT_BY_ID[report.zone].label}
              className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
            />
          </span>
        </>
      }
      activeColor={(tick) => bandAt(tick.fraction).seg.color}
      inactiveColor={(tick) =>
        `color-mix(in oklch, ${bandAt(tick.fraction).seg.color} 4%, var(--deep))`
      }
      resolveActive={(tick, isActive) =>
        hovered !== null ? zoneProgress(tick.fraction) !== null : isActive
      }
      fillDelay={(tick) => (zoneProgress(tick.fraction) ?? 0) * ZONE_SWEEP_MS}
      onTickHover={handleHover}
      tickWidth={2}
      tickLength={12}
      glow={0.6}
      className={`@container/dial [container-type:size] mb-0 max-w-none ${DIAL_SHAPE} ${className ?? ""}`}
    />
  );
}
