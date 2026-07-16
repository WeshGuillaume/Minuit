// The reality anchor under the speedometer: the raw usage percent the OAuth
// signal reports, exactly the number Claude Code's /usage shows. The speedo says
// how FAST you're going; this bar says WHERE you are. Decoupling the two is the
// whole point: they no longer paraphrase each other. When the signal is down it
// reads "no signal" rather than inventing a 0%.

import type { GaugeReport } from "@core/types";
import { formatEta } from "./format";

// The bar tracks proximity to the cap (green → amber → red), independent of the
// pace zones above it: you can be redlining on speed while still low on usage.
const barColor = (pct: number): string =>
  pct >= 100 ? "#ef4444" : pct >= 85 ? "#f59e0b" : "#22c55e";

export function RawUsageBar({ report }: { report: GaugeReport }) {
  const { currentPct, signalAvailable, hoursUntilReset } = report;
  const pct = Math.max(0, Math.min(100, currentPct));
  return (
    <div className="w-full px-4 [@container_panel_(max-height:260px)_and_(min-width:340px)]:px-0">
      <div className="mb-1 flex items-baseline justify-between text-[10px] text-muted-foreground">
        <span className="tracking-wide">Usage</span>
        <span className="tabular-nums">
          {signalAvailable ? `${Math.round(currentPct)}%` : "no signal"}
          <span className="ml-2 text-muted-foreground/70">
            Reset {formatEta(hoursUntilReset)}
          </span>
        </span>
      </div>
      <div className="h-px w-full overflow-hidden rounded-full bg-white/10 [@container_panel_(max-height:260px)_and_(min-width:340px)]:h-2">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{
            width: `${signalAvailable ? pct : 0}%`,
            background: barColor(currentPct),
          }}
        />
      </div>
    </div>
  );
}
