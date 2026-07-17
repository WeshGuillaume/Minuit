// A slow ambient shimmer that sweeps left→right across a short label, letter by
// letter: each glyph brightens then dims on a stagger, then the wave pauses and
// repeats. Not a one-shot entrance; it keeps the center readout quietly alive.
//
// All glyphs share ONE period (gap + n·stagger) and differ only by their start
// delay, so the wave stays coherent across loops instead of drifting apart.

import { Flame } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

const STAGGER = 0.11; // s between adjacent letters lighting up
const PULSE = 1.2; // s for one letter to brighten and dim back
const GAP = 2.6; // s the wave rests before sweeping again (keeps it "slow")

// The two hot zones sweep through a saturated hue instead of just pulsing
// brightness on the text's own color - a hotter shimmer that reads as "this
// zone is different" at a glance. Turbo runs blue, Nitro runs violet.
export type ShimmerTone = "default" | "turbo" | "nitro";

// Three keyframes (start → mid → start) per tone so the hue eases up and back.
const TONE_COLORS: Record<Exclude<ShimmerTone, "default">, string[]> = {
  turbo: ["var(--shimmer-turbo-start)", "var(--shimmer-turbo-mid)", "var(--shimmer-turbo-start)"],
  nitro: ["var(--shimmer-nitro-start)", "var(--shimmer-nitro-mid)", "var(--shimmer-nitro-start)"],
};

export function ShimmerText({
  text,
  className,
  tone = "default",
}: {
  text: string;
  className?: string;
  tone?: ShimmerTone;
}) {
  const chars = [...text];
  const period = GAP + chars.length * STAGGER;
  const colors = tone === "default" ? null : TONE_COLORS[tone];

  return (
    // Plain inline span (not flex) so the caption's letter-spacing still applies.
    // aria-hidden: purely decorative, the same text is already accessible via
    // ExplainerPanel, so this animated duplicate shouldn't be read twice.
    // Boost tones (Turbo/Nitro) also italicize, to set the hot zones apart from
    // the upright neutral labels beyond just their hue.
    <span className={cn(className, colors && "italic")} aria-hidden>
      {colors && <Flame className="mr-1 inline-block size-[1em] -translate-y-px" style={{ color: colors[0] }} />}
      {chars.map((ch, i) => (
        <motion.span
          // biome-ignore lint/suspicious/noArrayIndexKey: chars is derived fresh from `text` every render, never reordered; index is a stable key here.
          key={`${i}-${ch}`}
          className="inline-block"
          initial={{
            opacity: 0.9,
            filter: "brightness(0.9)",
            color: colors ? colors[0] : undefined,
          }}
          animate={{
            opacity: [0.9, 1, 0.9],
            filter: ["brightness(0.9)", "brightness(1.5)", "brightness(0.9)"],
            ...(colors ? { color: colors } : {}),
          }}
          transition={{
            duration: PULSE,
            times: [0, 0.5, 1],
            ease: "easeInOut",
            repeat: Infinity,
            repeatDelay: period - PULSE,
            delay: i * STAGGER,
          }}
        >
          {ch === " " ? " " : ch}
        </motion.span>
      ))}
    </span>
  );
}
