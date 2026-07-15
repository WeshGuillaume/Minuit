// Opt-in Axis-2 recovery: shown only when the live signal is unavailable (most
// often an expired Keychain token). One click runs the OAuth refresh, then asks
// the page to reload its report. This is the sole user-facing path that writes
// credentials — nothing here fires without an explicit click.

import { useState } from 'react'
import { refreshCredentials, type RefreshResult } from '../adapters/refresh'
import { readCredentials } from '../adapters/credentials'
import { probeAndCache } from '../adapters/usage-api'
import { parseUsage } from '../adapters/usage-parse'

const ERRORS: Record<Exclude<RefreshResult, 'ok'>, string> = {
  'no-token': 'Aucun token à rafraîchir',
  'refresh-failed': 'Échec du refresh (endpoint ou refresh token)',
  'write-failed': 'Écriture Keychain refusée',
}

export function SignalRefresh({ onRefreshed }: { onRefreshed: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    setBusy(true)
    setError(null)
    try {
      const result = await refreshCredentials()
      if (result !== 'ok') {
        setError(ERRORS[result])
        return
      }
      // Token refreshed. Make exactly ONE usage call (which warms the cache) so
      // the reload reuses it instead of hitting the endpoint again back-to-back.
      const creds = await readCredentials()
      const probe = creds ? await probeAndCache(creds) : null
      if (probe?.ok && parseUsage(probe.body, Date.now()).length > 0) onRefreshed()
      else setError(`Token OK · usage ${probe?.status ?? probe?.error ?? '—'}`)
    } catch (e) {
      console.error('[cc-gauge refresh] threw', e)
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-3 flex flex-col items-center gap-1">
      <span className="text-xs text-muted-foreground">Signal indisponible</span>
      <button
        onClick={run}
        disabled={busy}
        className="text-xs font-semibold text-foreground/90 underline underline-offset-4 outline-none disabled:opacity-50"
      >
        {busy ? 'Rafraîchissement…' : 'Rafraîchir le token'}
      </button>
      {error && <span className="text-[10px] text-red-400">{error}</span>}
    </div>
  )
}
