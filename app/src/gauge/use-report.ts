// Async bridge from the page to loadReport: re-runs whenever tool/window change,
// ignores stale results if they change mid-flight. It seeds from the last cached
// report (localStorage) so a cold start paints the previous gauge immediately
// while the fresh scan runs, exposing `refreshing` so the page can show a small
// spinner instead of a blank loader. While the app stays open it also re-polls
// on a fixed interval — the 180s usage cache is the hard floor on how often the
// network is actually touched, so this interval matches it.

import { useEffect, useState } from 'react'
import type { GaugeReport, ToolId, WindowKey } from '@core/types'
import { loadReport } from './source'
import { readCachedReport, writeCachedReport } from './report-cache'

const REFRESH_MS = 180_000 // 3 min — the endpoint's safe polling floor

export interface ReportState {
  report: GaugeReport | null
  refreshing: boolean
  reload: () => void
}

export const useReport = (tool: ToolId, window: WindowKey): ReportState => {
  const [report, setReport] = useState<GaugeReport | null>(() =>
    readCachedReport(tool, window),
  )
  const [refreshing, setRefreshing] = useState(true)
  const [nonce, setNonce] = useState(0)

  // On a tool/window switch, show that pair's cached report right away so the
  // gauge never flashes empty before the fresh load lands.
  useEffect(() => {
    setReport(readCachedReport(tool, window))
  }, [tool, window])

  useEffect(() => {
    let live = true
    setRefreshing(true)
    loadReport(tool, window).then((next) => {
      if (!live) return
      setReport(next)
      writeCachedReport(tool, window, next)
      setRefreshing(false)
    })
    return () => {
      live = false
    }
  }, [tool, window, nonce])

  useEffect(() => {
    const id = setInterval(() => setNonce((n) => n + 1), REFRESH_MS)
    return () => clearInterval(id)
  }, [])

  return { report, refreshing, reload: () => setNonce((n) => n + 1) }
}
