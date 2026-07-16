// The token mix, small, under the gauge: input / output / cache. Cache is shown
// as HIT RATE, not volume — it is the one actionable lever on cost and the anchor
// the future cache coach hangs off. Each stat feeds the shared explainer on hover,
// same idiom as the profitability light.
//
// Hovering a stat slides a shared rounded-full pill (motion layoutId) onto it, so
// the highlighted stat is unmistakable as the pointer moves across the row.

import { MessageCircle, Sparkles, Database } from 'lucide-react'
import { useState, type ComponentType } from 'react'
import { motion } from 'motion/react'
import type { GaugeReport } from '@core/types'
import { formatTokens, formatPct01 } from './format'
import { useExplainerHover } from './explainer'

interface Stat {
  key: string
  icon: ComponentType<{ className?: string }>
  value: string
  title: string
  description: string
}

const HIGHLIGHT_ID = 'token-footer-highlight'
const spring = { type: 'spring', stiffness: 550, damping: 34 } as const

const stats = ({ tokens }: GaugeReport): Stat[] => [
  {
    key: 'input',
    icon: MessageCircle,
    value: formatTokens(tokens.input),
    title: 'Input',
    description: `${formatTokens(tokens.input)} tokens sent (uncached)`,
  },
  {
    key: 'output',
    icon: Sparkles,
    value: formatTokens(tokens.output),
    title: 'Output',
    description: `${formatTokens(tokens.output)} tokens generated`,
  },
  {
    key: 'cache',
    icon: Database,
    value: formatPct01(tokens.cacheHitRate),
    title: 'Cache hit rate',
    description: `${formatPct01(tokens.cacheHitRate)} of reads served from cache`,
  },
]

// The pill lives in whichever stat is `parked` (the last one hovered) and only
// its opacity is driven by `visible`. Because it never unmounts while it stays in
// place, leaving a stat fades it out in-place; moving to another stat re-homes it
// (same layoutId) and slides — one pill on screen at all times, so no cross-fade
// overlap flash.
function FooterStat({
  icon: Icon,
  value,
  title,
  description,
  parked,
  visible,
  onHover,
}: Omit<Stat, 'key'> & {
  parked: boolean
  visible: boolean
  onHover: (over: boolean) => void
}) {
  const hover = useExplainerHover({ title, description })
  return (
    <span
      className={`relative flex cursor-default items-center gap-1 rounded-full px-2.5 py-1 transition-colors ${
        visible ? 'text-foreground' : 'text-muted-foreground'
      }`}
      onMouseEnter={() => {
        hover.onMouseEnter()
        onHover(true)
      }}
      onMouseLeave={() => {
        hover.onMouseLeave()
        onHover(false)
      }}
    >
      {parked && (
        <motion.span
          layoutId={HIGHLIGHT_ID}
          initial={false}
          animate={{ opacity: visible ? 1 : 0 }}
          transition={{ layout: spring, opacity: { duration: 0.15 } }}
          className="absolute inset-0 -z-10 rounded-full bg-white/10"
        />
      )}
      <Icon className="size-3" />
      <span className="text-[11px] tabular-nums">{value}</span>
    </span>
  )
}

export function TokenFooter({ report }: { report: GaugeReport }) {
  const [hovered, setHovered] = useState<string | null>(null)
  const [home, setHome] = useState<string | null>(null)
  return (
    // Each stat is its own rounded-full px-2.5 pill (for the hover highlight),
    // so left-aligned (row mode) the row reads 10px indented against the
    // flush-left usage bar above it — the same pill-padding mismatch the tabs
    // have (see gauge-stack.tsx), fixed the same way: outdent the whole row.
    //
    // Shown only under the panel's two FULL-content reveal paths (portrait or
    // row-capable) — NOT gauge-stack.tsx's narrow-but-tall "minimal" path,
    // which shows only tabs and a bare usage bar, no room for a third row of
    // stats. Querying the panel directly (not a "stack" width threshold)
    // avoids an ambiguous overlap: stack width is panel width minus padding,
    // so a merely-170px-wide portrait panel (full reveal) and a 165px-wide
    // minimal one land at nearly the same stack width.
    <div className="hidden items-center justify-center gap-1 [@container_panel_(min-width:170px)_and_(min-height:170px)]:flex [@container_panel_(min-width:340px)_and_(min-height:90px)]:flex [@container_panel_(max-height:260px)_and_(min-width:340px)]:-ml-2.5 [@container_panel_(max-height:260px)_and_(min-width:340px)]:justify-start">
      {stats(report).map(({ key, ...stat }) => (
        <FooterStat
          key={key}
          {...stat}
          parked={home === key}
          visible={hovered === key}
          onHover={(over) => {
            if (over) {
              setHovered(key)
              setHome(key)
            } else {
              setHovered((h) => (h === key ? null : h))
            }
          }}
        />
      ))}
    </div>
  )
}
