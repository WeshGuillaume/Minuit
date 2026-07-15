// Bannière de mise à jour : discrète, pinnée en bas de la fenêtre. Apparaît
// seulement quand une version est disponible ou en cours de téléchargement.

import { useUpdater } from "@/lib/updater";
import { Button } from "@/components/ui/button";

export function UpdateBanner() {
  const { state, install } = useUpdater();

  if (state.phase === "available") {
    return (
      <Bar>
        <span className="truncate">Version {state.update.version} disponible</span>
        <Button size="xs" onClick={install}>
          Mettre à jour
        </Button>
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
