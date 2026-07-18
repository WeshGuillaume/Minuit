// The speedometer itself: the radial dial, its live needle, the hovered-zone
// sweep, the center readout and the profitability badge.
//
// Responsiveness here is pure CSS: the dial establishes its own named container
// ("dial", sized to itself) with four thresholds (index.css), each dropping
// one more thing as the dial shrinks: decoration, then the caption, then the
// zone name entirely, then interactivity. The number itself never hides; it
// just keeps shrinking (see gauge-center.tsx's VALUE_CLASS): there's no size
// too small to show it.
//   • --container-dial-decorated (190px): below it, RadialGauge swaps to its
//     coarse/wide tick ring and drops the scale labels, and the badge here
//     hides too: decoration goes before the essentials.
//   • --container-dial-captioned (130px): below it, the zone caption under
//     the pace number (gauge-center.tsx) hides. Down to dial-labeled, the
//     bottomSlot's arc-gap space (see below) takes over showing the zone name
//     instead of leaving it blank, since the arc doesn't sweep a full circle,
//     so that space is already reserved, not claimed from the panel.
//   • --container-dial-labeled (100px): below it, the zone name in
//     bottomSlot hides too, rather than risk it: some names ("Underfarming")
//     are long enough to wrap onto a second line at the smallest dial sizes,
//     colliding with the center number instead of sitting cleanly below it.
//   • --container-dial-interactive (90px): below it, the tick hit target
//     goes inert (an !important container-query override of its own inline
//     pointer-events, in radial-gauge-tick.tsx), genuinely non-interactive,
//     not just quiet. Hovering was already meaningless at this size (the
//     wedges are too small to isolate a zone), so only the interaction goes,
//     not the readout it would have shown.
// The dial's own SIZE (how much of the panel it claims) is the caller's call,
// see gauge-page.tsx, which differs it by orientation; this component only
// owns its shape and its internal degradation. No JS measurement either way.

import { paceBounds } from "@core/track/bounds";
import { ZONES, type Zone } from "@core/track/zones";
import type { GaugeReport, ZoneId } from "@core/types";
import { useState } from "react";
import { paceZoneColorVar } from "@/components/ui/pace-zone-colors";
import { RadialGauge } from "@/components/ui/radial-gauge";
import { ProfitabilityLight } from "../../../pages/profitability-light";
import { useExplainer } from "../explainer";
import { GaugeCenter, RegionRange } from "../gauge-center";
import { useGaugeMode } from "../modes/context";
import type { MarkContext } from "../modes/types";
import { paceToDisplay, pickBand } from "../pace-track";
import { ShimmerText } from "../shimmer-text";
import { zoneTone } from "../zone-tone";

const ZONE_SWEEP_MS = 260; // total stagger across a hovered zone's ticks

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

const ZONE_BY_ID = Object.fromEntries(ZONES.map((z) => [z.id, z])) as Record<
  ZoneId,
  Zone
>;

// Shape/behaviour invariants true regardless of how the caller sizes the dial;
// the actual width formula is the caller's (see gauge-page.tsx). No aspect-*
// here: RadialGauge now owns its own (slightly-shorter-than-square, cropped)
// aspect ratio internally; a caller-supplied aspect-square would override it.
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
  const { mode } = useGaugeMode();
  const bounds = paceBounds(report.paceThresholds);

  // The selected mode owns the needle, tick labels AND the zone-band
  // layout: a broken track for the pace axis, true proportions for the linear
  // one, so the dial just places and colours whatever the mode hands it.
  const ctx: MarkContext = {
    bounds,
    toDisplay: (p) => paceToDisplay(p, bounds),
  };
  const needle = mode.needle(report, ctx);
  const bands = mode.bands(report, ctx);

  const bandAt = (fraction: number) => pickBand(bands, fraction * 100);
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

  const marks = mode.marks(report, ctx);

  // One solid fill colour, not a gradient: the arc reads as the current verdict
  // rather than a legend of the whole track. In hover it's the hovered zone
  // (ticks are isolated to it); otherwise the needle's zone.
  const fillColor = paceZoneColorVar(hovered ?? mode.zone(report));

  const handleHover = (tick: { fraction: number } | null) => {
    const zone = tick ? bandAt(tick.fraction).seg.id : null;
    setHovered(zone);
    const seg = zone ? ZONE_BY_ID[zone] : null;
    setOverride(
      seg
        ? {
            title: seg.label,
            description: seg.description,
            tone: zoneTone(seg.id),
          }
        : null,
    );
  };

  return (
    <RadialGauge
      value={needle}
      min={mode.min(report)}
      max={mode.max(report)}
      scaleLabels={hovered ? undefined : marks.map((m) => m.pos)}
      // RadialGauge hands back the exact label value, so match on it; a fuzzy
      // tolerance mismatches on tight axes (linear pace marks sit 0.5 apart).
      formatLabel={(v) =>
        marks.find((m) => Math.abs(m.pos - v) < 1e-6)?.text ?? ""
      }
      compactTickCount={46}
      compactTickLength={18}
      compactTickWidth={1.5}
      compactTickRadius={100}
      centerLabel={
        // Always shown: there's no size too small for the number itself, it
        // just keeps stepping down (see gauge-center.tsx's VALUE_CLASS). Only
        // the caption/decoration around it get dropped as the dial shrinks.
        hoveredBound && hovered ? (
          <RegionRange
            low={hoveredBound.low}
            high={hoveredBound.high}
            name={ZONE_BY_ID[hovered].label}
            tone={zoneTone(hovered)}
          />
        ) : (
          <GaugeCenter report={report} onRefreshed={onRefreshed} />
        )
      }
      bottomSlot={
        // The arc doesn't sweep a full circle - its open bottom is already
        // reserved space, not something to additionally claim from the panel.
        // Above dial-decorated it's the $ badge; between dial-labeled and
        // dial-captioned the center's OWN caption (gauge-center.tsx) has
        // already hidden, so the zone name moves down here instead of just
        // leaving the gap empty. Below dial-labeled it hides too - some zone
        // names ("Underfarming") are long enough to wrap onto a second line
        // at the smallest dial sizes, colliding with the center number rather
        // than sitting cleanly in the gap below it - better to drop it than
        // let that happen. whitespace-nowrap is a second line of defence: if
        // it's shown at all, clip rather than wrap.
        <>
          {/* Normally gated on the DIAL's own box (@dial-decorated) - but the
              dial can stay wide enough to clear that on almost any panel width
              (it caps at a fixed 216px, see gauge-page.tsx) while the "rest"
              row below is starved for height (see token-footer.tsx's matching
              min-height:380 cutoff, and its derivation). WIDTH-unconditional on
              purpose: an earlier version only overrode narrow panels, which let
              a WIDE-but-short one slip through and keep showing this badge
              while the fuel gauge's own arc got crushed below it - the opposite
              of the intended priority. This badge is the least essential number
              on screen (a near-constant brag, see profitability-light.tsx), so
              it's first to go as the panel gets short. */}
          <span className="hidden @dial-decorated/dial:block flat:hidden!">
            <ProfitabilityLight report={report} />
          </span>
          <span className="hidden @dial-labeled/dial:block @dial-captioned/dial:hidden">
            <ShimmerText
              text={ZONE_BY_ID[mode.zone(report)].label}
              tone={zoneTone(mode.zone(report))}
              className="whitespace-nowrap text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
            />
          </span>
        </>
      }
      activeColor={() => fillColor}
      inactiveColor={() => `color-mix(in oklch, ${fillColor} 4%, var(--deep))`}
      resolveActive={(tick, isActive) =>
        hovered !== null ? zoneProgress(tick.fraction) !== null : isActive
      }
      fillDelay={(tick) => (zoneProgress(tick.fraction) ?? 0) * ZONE_SWEEP_MS}
      onTickHover={handleHover}
      tickWidth={1}
      tickLength={12}
      glow={2}
      // RadialGauge's own aspect-[1/0.95] crops the arc's open-bottom wedge by
      // a fixed 5%, sized for when bottomSlot actually has something to show
      // there. Below the $ badge's own hide threshold (max-height:379px, see
      // the bottomSlot span above), that wedge is genuinely empty (no badge,
      // no zone name - both hidden here) - the ticks' own geometry bottoms out
      // at ~84% of the box width (measured against this exact dial), so 0.86
      // crops right past that with a small safety margin, not into the ticks
      // themselves. `!` forces it over the base utility regardless of cn()'s
      // merge order, same idiom as radial-gauge-tick.tsx's own container-query
      // overrides.
      className={`@container/dial [container-type:size] mb-0 max-w-none ${DIAL_SHAPE} flat:@dial-captioned/dial:aspect-[1/0.83]! ${className ?? ""}`}
    />
  );
}
