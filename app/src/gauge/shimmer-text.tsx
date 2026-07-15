// A slow ambient shimmer that sweeps left→right across a short label, letter by
// letter: each glyph brightens then dims on a stagger, then the wave pauses and
// repeats. Not a one-shot entrance; it keeps the center readout quietly alive.
//
// All glyphs share ONE period (gap + n·stagger) and differ only by their start
// delay, so the wave stays coherent across loops instead of drifting apart.

import { motion } from 'motion/react'

const STAGGER = 0.11 // s between adjacent letters lighting up
const PULSE = 1.2 // s for one letter to brighten and dim back
const GAP = 2.6 // s the wave rests before sweeping again (keeps it "slow")

export function ShimmerText({ text, className }: { text: string; className?: string }) {
  const chars = [...text]
  const period = GAP + chars.length * STAGGER

  return (
    // Plain inline span (not flex) so the caption's letter-spacing still applies.
    <span className={className} aria-label={text}>
      {chars.map((ch, i) => (
        <motion.span
          key={`${i}-${ch}`}
          aria-hidden
          className="inline-block"
          initial={{ opacity: 0.6, filter: 'brightness(0.75)' }}
          animate={{
            opacity: [0.6, 1, 0.6],
            filter: ['brightness(0.75)', 'brightness(1.5)', 'brightness(0.75)'],
          }}
          transition={{
            duration: PULSE,
            times: [0, 0.5, 1],
            ease: 'easeInOut',
            repeat: Infinity,
            repeatDelay: period - PULSE,
            delay: i * STAGGER,
          }}
        >
          {ch === ' ' ? ' ' : ch}
        </motion.span>
      ))}
    </span>
  )
}
