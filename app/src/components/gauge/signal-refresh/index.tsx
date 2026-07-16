// Opt-in Axis-2 recovery banner, shown when the live signal is unavailable (most
// often an expired Keychain token). One click runs the OAuth refresh + re-probe
// via useSignalRefresh, then reloads. The gauge center offers the same action
// inline (see SignalCenter); this is the fuller banner variant with the error text.

import { useSignalRefresh } from "../use-signal-refresh";

export function SignalRefresh({ onRefreshed }: { onRefreshed: () => void }) {
  const { run, busy, error } = useSignalRefresh(onRefreshed);

  return (
    <div className="mt-3 flex flex-col items-center gap-1">
      <span className="text-xs text-muted-foreground">Signal unavailable</span>
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="text-xs font-semibold text-foreground/90 underline underline-offset-4 outline-none disabled:opacity-50"
      >
        {busy ? "Refreshing…" : "Refresh token"}
      </button>
      {error && <span className="text-[10px] text-red-400">{error}</span>}
    </div>
  );
}
