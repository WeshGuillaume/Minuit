// Screenshot control overlay. Always mounted, invisible until demo mode is armed.
//
//   ⌘/Ctrl + Shift + D  toggle demo mode on/off
//   1..6                jump to a zone (Underfarming → Capped)
//   H                   hide/show this bar (keep the scenario) for a clean shot
//   Esc                 leave demo mode (back to live data)
//
// Switching a scenario writes localStorage and calls onChange (useReport.reload),
// so the live render pipeline repaints from demoReport() — see demo.ts / source.ts.

import { useCallback, useEffect, useState } from 'react'
import { SEGMENTS } from '@core/track/segments'
import { SCENARIOS, readDemoScenario, writeDemoScenario } from './demo'

const ZONE_COLOR = Object.fromEntries(SEGMENTS.map((s) => [s.id, s.color]))
const DEFAULT_ID = 'maxxing'

export function DemoPicker({ onChange }: { onChange: () => void }) {
  const [activeId, setActiveId] = useState<string | null>(() => readDemoScenario())
  const [hidden, setHidden] = useState(false)

  const select = useCallback(
    (id: string | null) => {
      writeDemoScenario(id)
      setActiveId(id)
      onChange()
    },
    [onChange],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'd' && e.shiftKey && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        select(readDemoScenario() ? null : DEFAULT_ID)
        return
      }
      if (!readDemoScenario()) return
      if (e.key === 'Escape') return select(null)
      if (e.key.toLowerCase() === 'h') return setHidden((h) => !h)
      const scenario = SCENARIOS.find((s) => s.key === e.key)
      if (scenario) select(scenario.id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [select])

  if (!activeId || hidden) return null

  return (
    <div className="fixed inset-x-0 bottom-2 z-[100] flex justify-center px-2">
      <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/70 px-1.5 py-1 backdrop-blur">
        {SCENARIOS.map((s) => {
          const on = s.id === activeId
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => select(s.id)}
              title={`${s.key} · ${s.label}`}
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                on ? 'text-black' : 'text-white/60 hover:text-white'
              }`}
              style={on ? { background: ZONE_COLOR[s.zone] } : undefined}
            >
              {s.label}
            </button>
          )
        })}
        <span className="px-1 text-[9px] text-white/30">H hide · Esc live</span>
      </div>
    </div>
  )
}
