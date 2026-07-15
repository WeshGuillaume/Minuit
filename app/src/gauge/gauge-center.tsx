// The gauge center. It toggles on click between two readouts of the same live
// state: the pace multiplier (default: 1.2× over the verdict REDLINING) and raw
// throughput (tok/h). The choice is persisted (localStorage). The time-to-reset
// is deliberately NOT a mode here; it already lives in the usage bar below.
//
// The value swaps through AnimatePresence; the sub-label carries a slow
// letter-by-letter shimmer (ShimmerText). Honest fallback: no live signal (or a
// hit cap, where pace collapses to a meaningless 0×) shows a dash, not a number.

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { GaugeReport } from '@core/types'
import { SEGMENTS } from '@core/track/segments'
import { cn } from '@/lib/utils'
import { ShimmerText } from './shimmer-text'

const ZONE_LABEL = Object.fromEntries(SEGMENTS.map((s) => [s.id, s.label])) as Record<string, string>
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })

type Mode = 'pace' | 'rate'

const MODES: Record<Mode, { value: (r: GaugeReport) => string; caption: (r: GaugeReport) => string }> = {
  pace: {
    value: (r) => (!r.signalAvailable || r.currentPct >= 100 ? '—' : `${r.pace.toFixed(1)}×`),
    caption: (r) => (r.signalAvailable ? ZONE_LABEL[r.zone] : 'no signal'),
  },
  rate: {
    value: (r) => (r.tokens.perHour > 0 ? compact.format(r.tokens.perHour) : '—'),
    caption: () => 'tok/h',
  },
}

const ORDER: Mode[] = ['pace', 'rate']
const nextMode = (m: Mode): Mode => ORDER[(ORDER.indexOf(m) + 1) % ORDER.length]

const MODE_STORAGE_KEY = 'cc-gauge:center-mode'
const loadMode = (): Mode => {
  const saved = localStorage.getItem(MODE_STORAGE_KEY)
  return saved && (ORDER as string[]).includes(saved) ? (saved as Mode) : 'pace'
}

const spring = { type: 'spring', stiffness: 550, damping: 32 } as const
const VALUE_CLASS = 'text-2xl font-normal tabular-nums text-foreground'

function PopValue({ value, className }: { value: string; className: string }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={value}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={spring}
        className={cn('inline-block', className)}
      >
        {value}
      </motion.span>
    </AnimatePresence>
  )
}

// Mode-swap slide, with the shimmering text inside so the label stays alive. The
// layout class rides the swap wrapper (the flex item); the letters inherit its
// colour/size/tracking and only add the shimmer.
function ShimmerValue({ value, className }: { value: string; className: string }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={value}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={spring}
        className={cn('inline-block', className)}
      >
        <ShimmerText text={value} />
      </motion.span>
    </AnimatePresence>
  )
}

// The center while a gauge region is hovered: that zone's pace range.
export function RegionRange({ low, high }: { low: number; high: number }) {
  const label = `${low.toFixed(2)}–${high.toFixed(2)}×`
  return (
    <span className="grid place-items-center [&>*]:[grid-area:1/1]">
      <AnimatePresence initial={false}>
        <motion.span
          key={label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={spring}
          className={cn(
            'whitespace-nowrap text-base font-normal tabular-nums text-foreground',
          )}
        >
          {label}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

export function GaugeCenter({ report }: { report: GaugeReport }) {
  const [mode, setMode] = useState<Mode>(loadMode)

  const toggle = () => {
    const next = nextMode(mode)
    localStorage.setItem(MODE_STORAGE_KEY, next)
    setMode(next)
  }

  const m = MODES[mode]
  return (
    <span
      className="pointer-events-auto flex cursor-pointer flex-col items-center leading-none"
      onClick={toggle}
    >
      <PopValue value={m.value(report)} className={VALUE_CLASS} />
      <ShimmerValue
        value={m.caption(report)}
        className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
      />
    </span>
  )
}
