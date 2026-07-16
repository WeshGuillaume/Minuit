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
      {/* Shown only under the panel's two FULL-content reveal paths (portrait
          or row-capable) — NOT gauge-stack.tsx's narrow-but-tall "minimal"
          path, which shows tabs and this bar but nothing else. A width
          threshold on the "stack" container can't tell these apart cleanly:
          stack width is panel width minus padding, so a merely-170px-wide
          portrait panel (full reveal) and a 165px-wide minimal one produce
          near-identical stack widths — the two ranges overlap right at the
          boundary. Querying the panel's own conditions instead has no such
          ambiguity. */}
      <div className="mb-1 hidden items-baseline justify-between text-[10px] text-muted-foreground [@container_panel_(min-width:170px)_and_(min-height:170px)]:flex [@container_panel_(min-width:340px)_and_(min-height:90px)]:flex">
        <span className="tracking-wide">Usage</span>
        <span className="tabular-nums">
          {signalAvailable ? `${Math.round(currentPct)}%` : "no signal"}
          <span className="ml-2 text-muted-foreground/70">
            Reset {formatEta(hoursUntilReset)}
          </span>
        </span>
      </div>
      {/* Thicker whenever the label row above is hidden (minimal mode, no
          text) — a bare bar carries more visual weight on its own than one
          paired with a numeric readout. Also thicker in row mode regardless
          (a separate, earlier request), so the conditions just coexist. */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10 [@container_panel_(min-width:170px)_and_(min-height:170px)]:h-px [@container_panel_(min-width:340px)_and_(min-height:90px)]:h-px [@container_panel_(max-height:260px)_and_(min-width:340px)]:h-2">
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
