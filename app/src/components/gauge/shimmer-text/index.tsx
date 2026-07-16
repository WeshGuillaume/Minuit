// A slow ambient shimmer that sweeps left→right across a short label, letter by
// letter: each glyph brightens then dims on a stagger, then the wave pauses and
// repeats. Not a one-shot entrance; it keeps the center readout quietly alive.
//
// All glyphs share ONE period (gap + n·stagger) and differ only by their start
// delay, so the wave stays coherent across loops instead of drifting apart.

import { motion } from "motion/react";

const STAGGER = 0.11; // s between adjacent letters lighting up
const PULSE = 1.2; // s for one letter to brighten and dim back
const GAP = 2.6; // s the wave rests before sweeping again (keeps it "slow")

export function ShimmerText({ text, className }: { text: string; className?: string }) {
  const chars = [...text];
  const period = GAP + chars.length * STAGGER;

  return (
    // Plain inline span (not flex) so the caption's letter-spacing still applies.
    // aria-hidden: purely decorative — the same text is already accessible via
    // ExplainerPanel, so this animated duplicate shouldn't be read twice.
    <span className={className} aria-hidden>
      {chars.map((ch, i) => (
        <motion.span
          // biome-ignore lint/suspicious/noArrayIndexKey: chars is derived fresh from `text` every render, never reordered — index is a stable key here.
          key={`${i}-${ch}`}
          className="inline-block"
          initial={{ opacity: 0.9, filter: "brightness(0.9)" }}
          animate={{
            opacity: [0.9, 1, 0.9],
            filter: ["brightness(0.9)", "brightness(1.5)", "brightness(0.9)"],
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
          {ch === " " ? " " : ch}
        </motion.span>
      ))}
    </span>
  );
}
