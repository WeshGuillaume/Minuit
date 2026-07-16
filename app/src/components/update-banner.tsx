// Overlay de mise à jour : plein écran, bloquant, sans possibilité de le fermer.
// Dès qu'une version est détectée, le téléchargement + l'installation démarrent
// automatiquement (voir useUpdater) ; cet écran ne fait qu'en montrer l'avancement.

import { Loader2 } from "lucide-react";
import { useUpdater } from "@/lib/updater";

export function UpdateBanner() {
  const { state } = useUpdater();

  if (state.phase === "downloading") {
    return (
      <Overlay>
        <Loader2 className="size-6 animate-spin text-primary" />
        <span className="text-sm">Mise à jour {state.version}… {Math.round(state.percent * 100)}%</span>
      </Overlay>
    );
  }

  if (state.phase === "relaunching") {
    return (
      <Overlay>
        <Loader2 className="size-6 animate-spin text-primary" />
        <span className="text-sm">Redémarrage…</span>
      </Overlay>
    );
  }

  return null;
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/95 text-foreground backdrop-blur">
      {children}
    </div>
  );
}
