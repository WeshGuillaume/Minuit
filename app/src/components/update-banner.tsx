// Bannière de mise à jour : discrète, pinnée en bas de la fenêtre. Apparaît
// seulement quand une version est disponible ou en cours de téléchargement.

import { useUpdater } from "@/lib/updater";

export function UpdateBanner() {
  const { state, install } = useUpdater();

  if (state.phase === "available") {
    return (
      <Bar>
        <span className="truncate">Version {state.update.version} disponible</span>
        <button
          onClick={install}
          className="inline-flex h-6 shrink-0 items-center justify-center gap-1 rounded-[min(var(--radius-md),10px)] bg-primary px-2 text-xs font-medium whitespace-nowrap text-primary-foreground transition-all outline-none select-none hover:bg-primary/80 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
        >
          Mettre à jour
        </button>
      </Bar>
    );
  }

  if (state.phase === "downloading") {
    return <Bar>Téléchargement… {Math.round(state.percent * 100)}%</Bar>;
  }

  return null;
}

function Bar({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-between gap-2 border-t border-border bg-background/90 px-3 py-2 text-xs text-foreground backdrop-blur">
      {children}
    </div>
  );
}
