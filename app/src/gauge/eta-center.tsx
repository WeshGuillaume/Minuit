// The gauge center. The tick fill already carries the % position, so the center
// shows raw throughput (tok/h) by default and swaps to the time readout on click.
// The chosen readout is persisted (localStorage) so it survives an app reload.
//
// tok/h animates its digits with <NumberFlow>; every other readout (the time
// values, and the region range on gauge hover) slides through AnimatePresence
// popLayout instead — a discrete swap rather than a rolling count.
//
// The time readout RESPECTS the reset horizon, unlike a naive "hours to cap": that
// number is meaningless when it exceeds the time left in the window (you can't do
// 39h of work before a 5h window resets). So by default we count down to the
// RESET; only when the projection actually breaches the cap before then do we
// show the ETA to the cap — and even then bounded by the time to reset.
//
// Honest fallback: with no live signal the % itself is unreliable, so we show
// "—" rather than invent a number. The alert caption flags an estimate that
// leans on the instant rather than calibrated history.

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { GaugeReport } from '@core/types'
import { NumberFlow } from '@/components/ui/number-flow'
import { cn } from '@/lib/utils'
import { formatEta } from './format'

const etaReadout = (report: GaugeReport): { value: string; caption: string } => {
  if (!report.signalAvailable) return { value: '—', caption: 'no signal' }

  const willBreach = report.projectedPct >= 100 && Number.isFinite(report.hoursLeft)
  if (willBreach) {
    const eta = Math.min(report.hoursLeft, report.hoursUntilReset)
    return {
      value: formatEta(eta),
      caption: report.calibrated ? 'to cap' : 'est. to cap',
    }
  }
  return { value: formatEta(report.hoursUntilReset), caption: 'to reset' }
}

const spring = { type: 'spring', stiffness: 550, damping: 32 } as const
const RATE_FORMAT: Intl.NumberFormatOptions = { notation: 'compact', maximumFractionDigits: 1 }

const MODE_STORAGE_KEY = 'cc-gauge:center-mode'
type Mode = 'rate' | 'eta'

const loadMode = (): Mode =>
  localStorage.getItem(MODE_STORAGE_KEY) === 'eta' ? 'eta' : 'rate'

// The stacked value/caption column: each swaps with popLayout so the pair stays
// vertically packed as one slides out and the next slides in.
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

const VALUE_CLASS = 'text-2xl font-normal tabular-nums text-foreground'

function CenterReadout({ mode, report }: { mode: Mode; report: GaugeReport }) {
  const rate = report.tokens.perHour
  if (mode === 'rate') {
    return rate > 0 ? (
      <NumberFlow value={rate} format={RATE_FORMAT} className={VALUE_CLASS} />
    ) : (
      <PopValue value="—" className={VALUE_CLASS} />
    )
  }
  return <PopValue value={etaReadout(report).value} className={VALUE_CLASS} />
}

const captionOf = (mode: Mode, report: GaugeReport): string =>
  mode === 'rate' ? 'tok/h' : etaReadout(report).caption

// The center while a gauge region is hovered: the zone's percent range. Both the
// leaving and arriving range stack in the SAME grid cell, so they crossfade in
// place (overlapping — no wait-gap) without the width change reflowing them
// left/right the way popLayout did.
export function RegionRange({ low, high }: { low: number; high: number }) {
  const label = `${Math.round(low)}–${Math.round(high)}%`
  return (
    <span className="grid place-items-center [&>*]:[grid-area:1/1]">
      <AnimatePresence initial={false}>
        <motion.span
          key={label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={spring}
          className={cn('whitespace-nowrap', VALUE_CLASS)}
        >
          {label}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

export function EtaCenter({ report }: { report: GaugeReport }) {
  const [mode, setMode] = useState<Mode>(loadMode)

  const toggle = () => {
    const next: Mode = mode === 'rate' ? 'eta' : 'rate'
    localStorage.setItem(MODE_STORAGE_KEY, next)
    setMode(next)
  }

  return (
    <span
      className="pointer-events-auto flex cursor-pointer flex-col items-center leading-none"
      onClick={toggle}
    >
      <CenterReadout mode={mode} report={report} />
      <PopValue
        value={captionOf(mode, report)}
        className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
      />
    </span>
  )
}
