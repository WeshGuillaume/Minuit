// A small lightning bolt shown while the dial is in LIVE mode: a cue that the
// needle is the instant, twitchy reading (short readout window), not the smoothed
// average. Hovering it takes over the shared explainer to say so; the surrounding
// center still cycles to the Smooth mode on click.

import { Zap } from "lucide-react";
import { useEffect } from "react";
import { type ExplainerContent, useExplainer } from "../explainer";

const LIVE_EXPLAINER: ExplainerContent = {
  title: "Live pace",
  description:
    "The instant speed over the last ~minute — twitchy, and eases to 0 when you stop. Not the smoothed average; click the center to switch to Smooth.",
};

export function LiveIndicator() {
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
      {/* Amber, lit like the gauge ticks: a wide ambient bloom stacked under a
          tight saturated halo, mirroring the two-contribution neon filter the
          fills use (radial-gauge-filters.tsx). */}
      <Zap
        className="size-2.5 fill-current text-[var(--pace-redlining)] @dial-captioned/dial:size-3"
        style={{
          filter:
            "drop-shadow(0 0 3px var(--pace-redlining)) drop-shadow(0 0 6px var(--pace-redlining))",
        }}
        aria-label="Live pace"
      />
    </span>
  );
}
