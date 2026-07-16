// The speedometer itself: the radial dial, its live needle and habitual-pace
// ghost, the hovered-zone sweep, the center readout and the profitability badge.
//
// Responsiveness here is pure CSS: the dial establishes its own named container
// ("dial", sized to itself) with four thresholds (index.css), each dropping
// one more thing as the dial shrinks — decoration, then the caption, then the
// zone name entirely, then interactivity. The number itself never hides; it
// just keeps shrinking (see gauge-center.tsx's VALUE_CLASS) — there's no size
// too small to show it.
//   • --container-dial-decorated (190px) — below it, RadialGauge swaps to its
//     coarse/wide tick ring and drops the scale labels, and the badge here
//     hides too: decoration goes before the essentials.
//   • --container-dial-captioned (130px) — below it, the zone caption under
//     the pace number (gauge-center.tsx) hides. Down to dial-labeled, the
//     bottomSlot's arc-gap space (see below) takes over showing the zone name
//     instead of leaving it blank — the arc doesn't sweep a full circle, so
//     that space is already reserved, not claimed from the panel.
//   • --container-dial-labeled (100px) — below it, the zone name in
//     bottomSlot hides too, rather than risk it: some names ("Underfarming")
//     are long enough to wrap onto a second line at the smallest dial sizes,
//     colliding with the center number instead of sitting cleanly below it.
//   • --container-dial-interactive (90px) — below it, the tick hit target
//     goes inert (an !important container-query override of its own inline
//     pointer-events, in radial-gauge-tick.tsx) — genuinely non-interactive,
//     not just quiet. Hovering was already meaningless at this size (the
//     wedges are too small to isolate a zone), so only the interaction goes,
//     not the readout it would have shown.
// The dial's own SIZE (how much of the panel it claims) is the caller's call —
// see gauge-page.tsx, which differs it by orientation — this component only
// owns its shape and its internal degradation. No JS measurement either way.

import { paceBounds } from "@core/pace/pace-bounds";
import { SEGMENTS, type Segment } from "@core/track/segments";
import type { GaugeReport, ZoneId } from "@core/types";
import { useState } from "react";
import { paceZoneColorVar } from "@/components/ui/pace-zone-colors";
import { RadialGauge } from "@/components/ui/radial-gauge";
import { ProfitabilityLight } from "../../../pages/profitability-light";
import { useExplainer } from "../explainer";
import { GaugeCenter, RegionRange } from "../gauge-center";
import { displayBandAt, paceToDisplay } from "../pace-track";
import { ShimmerText } from "../shimmer-text";

const ZONE_SWEEP_MS = 260; // total stagger across a hovered zone's ticks
const SPEED_MARKS = [0.5, 1, 1.5]; // pace multiples labelled on the dial

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

const SEGMENT_BY_ID = Object.fromEntries(SEGMENTS.map((s) => [s.id, s])) as Record<ZoneId, Segment>;

// Shape/behaviour invariants true regardless of how the caller sizes the dial;
// the actual width formula is the caller's (see gauge-page.tsx). No aspect-*
// here: RadialGauge now owns its own (slightly-shorter-than-square, cropped)
// aspect ratio internally — a caller-supplied aspect-square would override it.
const DIAL_SHAPE = "shrink-0";

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
  const needle = report.zone === "over" ? 100 : paceToDisplay(report.pace, bounds);
  const ghost = clamp01(paceToDisplay(report.habitualPace, bounds) / 100);

  const bandAt = (fraction: number) => displayBandAt(fraction * 100);
  const hoveredBound = hovered ? (bounds.find((b) => b.id === hovered) ?? null) : null;

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
    setOverride(seg ? { title: seg.label, description: seg.description } : null);
  };

  return (
    <RadialGauge
      value={needle}
      min={0}
      max={100}
      ghostFraction={ghost}
      scaleLabels={hovered ? undefined : marks.map((m) => m.pos)}
      formatLabel={(v) => marks.find((m) => Math.abs(m.pos - v) < 0.6)?.text ?? ""}
      compactTickCount={25}
      compactTickLength={20}
      compactTickRadius={80}
      centerLabel={
        // Always shown — there's no size too small for the number itself, it
        // just keeps stepping down (see gauge-center.tsx's VALUE_CLASS). Only
        // the caption/decoration around it get dropped as the dial shrinks.
        hoveredBound ? (
          <RegionRange low={hoveredBound.low} high={hoveredBound.high} />
        ) : (
          <GaugeCenter report={report} onRefreshed={onRefreshed} />
        )
      }
      bottomSlot={
        // The arc doesn't sweep a full circle — its open bottom is already
        // reserved space, not something to additionally claim from the panel.
        // Above dial-decorated it's the $ badge; between dial-labeled and
        // dial-captioned the center's OWN caption (gauge-center.tsx) has
        // already hidden, so the zone name moves down here instead of just
        // leaving the gap empty. Below dial-labeled it hides too — some zone
        // names ("Underfarming") are long enough to wrap onto a second line
        // at the smallest dial sizes, colliding with the center number rather
        // than sitting cleanly in the gap below it — better to drop it than
        // let that happen. whitespace-nowrap is a second line of defence: if
        // it's shown at all, clip rather than wrap.
        <>
          <span className="hidden @dial-decorated/dial:block">
            <ProfitabilityLight report={report} />
          </span>
          <span className="hidden @dial-labeled/dial:block @dial-captioned/dial:hidden">
            <ShimmerText
              text={SEGMENT_BY_ID[report.zone].label}
              className="whitespace-nowrap text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
            />
          </span>
        </>
      }
      activeColor={(tick) => paceZoneColorVar(bandAt(tick.fraction).seg.colorToken)}
      inactiveColor={(tick) =>
        `color-mix(in oklch, ${paceZoneColorVar(bandAt(tick.fraction).seg.colorToken)} 4%, var(--deep))`
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
