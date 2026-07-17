// The fuel-pump warning light shared by both fuel gauge shapes: the portrait arc
// pins it over the first tick (fuel-arc.tsx), the landscape row seats it inline
// to the left of the bar (index.tsx). It reddens + pulses as the tank nears dry.

import { Fuel } from "lucide-react";
import { cn } from "@/lib/utils";

export function FuelIcon({ dry }: { dry: boolean }) {
  return (
    <Fuel
      className={cn("size-3 shrink-0 transition-colors duration-500", dry && "animate-pulse")}
      style={{
        color: dry ? "var(--destructive)" : "var(--muted-foreground)",
        filter: dry ? "drop-shadow(0 0 4px var(--destructive))" : undefined,
      }}
      aria-hidden
    />
  );
}
