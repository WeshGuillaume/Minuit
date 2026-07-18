// A small lightning bolt next to the center readout: lit while the dial is in
// LIVE mode (a cue that the needle is the instant, twitchy reading, not the
// smoothed average), switched off — not hidden — in Smooth mode. Hovering it
// takes over the shared explainer to say so; the surrounding center still
// cycles between the two modes on click.

import { Zap } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { type ExplainerContent, useExplainer } from "../explainer";

const LIVE_EXPLAINER: ExplainerContent = {
  title: "Live pace",
  description:
    "The instant speed over the last ~minute — twitchy, and eases to 0 when you stop. Not the smoothed average; click the center to switch to Smooth.",
};

export function LiveIndicator({ active }: { active: boolean }) {
  const { setOverride } = useExplainer();
  // If we unmount while hovered (the click that cycles us away to Smooth),
  // onMouseLeave never fires — clear the override on unmount so it can't stick.
  useEffect(() => () => setOverride(null), [setOverride]);

  return (
    <span
      className="inline-flex transition-opacity hover:opacity-80"
      onMouseEnter={() => setOverride(LIVE_EXPLAINER)}
      onMouseLeave={() => setOverride(null)}
    >
      {/* Lit (Live): amber, glowing like the gauge ticks — a wide ambient bloom
          stacked under a tight saturated halo, mirroring the two-contribution
          neon filter the fills use (radial-gauge-filters.tsx). Unlit (Smooth):
          not hidden, just switched off — the same dark socket tone as an
          inactive tick (tickInactiveColor) with an inset shadow standing in for
          the ticks' SVG socket filter, since this is a plain icon, not an SVG
          fill we can pass through that filter. */}
      <Zap
        className={cn(
          "size-2.5 fill-current transition-[color,filter] duration-300 @dial-captioned/dial:size-3",
          active ? "text-[var(--pace-redlining)]" : "text-[var(--deep)]",
        )}
        style={
          active
            ? {
                filter:
                  "drop-shadow(0 0 3px var(--pace-redlining)) drop-shadow(0 0 6px var(--pace-redlining))",
              }
            : {
                filter:
                  "drop-shadow(0 0.5px 0 rgba(0,0,0,0.55)) drop-shadow(0 -0.35px 0.35px rgba(255,255,255,0.05))",
              }
        }
        aria-label={active ? "Live pace" : "Smooth pace"}
      />
    </span>
  );
}
