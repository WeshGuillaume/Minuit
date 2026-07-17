// The gauge center: the big number + its caption, cycling on click through the
// pace smoothings (live ↔ smooth). The mode is shared state: the scale ticks
// re-label in lockstep (see modes/context.tsx, speedo-dial.tsx), so this only
// renders the current mode's readout and delegates the cycle to the context.
//
// The value swaps through AnimatePresence; the sub-label carries a slow
// letter-by-letter shimmer (ShimmerText). Honest fallback: no live signal (or a
// hit cap / idle burn) shows a dash from the mode itself, not a fake number.

import type { GaugeReport } from "@core/types";
import { RefreshCw } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { NumberFlow } from "@/components/ui/number-flow";
import { cn } from "@/lib/utils";
import { LiveIndicator } from "../live-indicator";
import { useGaugeMode } from "../modes/context";
import { ShimmerText, type ShimmerTone } from "../shimmer-text";
import { useSignalRefresh } from "../use-signal-refresh";
import { zoneTone } from "../zone-tone";

const spring = { type: "spring", stiffness: 550, damping: 32 } as const;
// Never hidden, just ever smaller: text-xs below dial-interactive (the
// smallest dials this ever renders at), stepping up through dial-captioned
// once there's room to match a caption underneath it again.
const VALUE_CLASS =
  "text-xs font-normal tabular-nums text-foreground @dial-interactive/dial:text-lg @dial-captioned/dial:text-2xl";

// The pace multiple is always shown to one decimal; NumberFlow rolls the digits
// on every recompute AND on the live↔smooth mode swap.
const PACE_FORMAT: Intl.NumberFormatOptions = {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
};

// Mode-swap slide, with the shimmering text inside so the label stays alive. The
// layout class rides the swap wrapper (the flex item); the letters inherit its
// colour/size/tracking and only add the shimmer.
function ShimmerValue({
  value,
  className,
  tone,
}: {
  value: string;
  className: string;
  tone: ShimmerTone;
}) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={value}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={spring}
        className={cn("inline-block", className)}
      >
        <ShimmerText text={value} tone={tone} />
      </motion.span>
    </AnimatePresence>
  );
}

// The center while a gauge region is hovered: that zone's pace range, with the
// zone's own name shimmering underneath (Maxxing, Redlining, …).
export function RegionRange({
  low,
  high,
  name,
  tone,
}: {
  low: number;
  high: number;
  name: string;
  tone: ShimmerTone;
}) {
  const label = `${low.toFixed(2)}–${high.toFixed(2)}×`;
  return (
    <span className="flex flex-col items-center leading-none">
      <span className="grid place-items-center [&>*]:[grid-area:1/1]">
        <AnimatePresence initial={false}>
          <motion.span
            key={label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={spring}
            className={cn(
              "whitespace-nowrap text-sm font-normal tabular-nums text-foreground @dial-captioned/dial:text-base",
            )}
          >
            {label}
          </motion.span>
        </AnimatePresence>
      </span>
      <ShimmerValue
        value={name}
        tone={tone}
        className="mt-1 hidden whitespace-nowrap text-[10px] font-medium uppercase tracking-wide text-muted-foreground @dial-captioned/dial:block"
      />
    </span>
  );
}

// No live signal: the pace is meaningless, so the center IS the recovery button.
// One click runs the OAuth refresh + re-probe; spins while busy, reds out on error.
function SignalCenter({ onRefreshed }: { onRefreshed?: () => void }) {
  const { run, busy, error } = useSignalRefresh(onRefreshed);
  return (
    <button
      type="button"
      onClick={run}
      disabled={busy}
      className="pointer-events-auto flex cursor-pointer flex-col items-center gap-1.5 leading-none outline-none disabled:cursor-default"
    >
      <RefreshCw className={cn("size-5 text-foreground/90", busy && "animate-spin")} />
      <span
        className={cn(
          "text-[10px] font-medium uppercase tracking-wide",
          error ? "text-red-400" : "text-muted-foreground",
        )}
      >
        {busy ? "refresh…" : (error ?? "no signal · retry")}
      </span>
    </button>
  );
}

export function GaugeCenter({
  report,
  onRefreshed,
}: {
  report: GaugeReport;
  onRefreshed?: () => void;
}) {
  const { mode, cycle } = useGaugeMode();

  if (!report.signalAvailable) return <SignalCenter onRefreshed={onRefreshed} />;

  return (
    <button
      type="button"
      className="pointer-events-auto flex cursor-pointer flex-col items-center leading-none border-none bg-transparent p-0"
      onClick={cycle}
    >
      {mode.id === "live" && (
        // Kept at every dial size (it shrinks rather than hides on small dials,
        // see live-indicator.tsx): the live cue matters most exactly where the
        // dial is small and glanceable, so it stays even when the caption drops.
        <span className="mb-0.5 flex">
          <LiveIndicator />
        </span>
      )}
      <NumberFlow
        value={mode.centerNumber(report)}
        suffix={mode.centerSuffix}
        format={PACE_FORMAT}
        className={VALUE_CLASS}
      />
      <ShimmerValue
        value={mode.centerCaption(report)}
        tone={zoneTone(mode.zone(report))}
        className="mt-2.5 hidden text-[10px] font-medium uppercase tracking-wide text-muted-foreground @dial-captioned/dial:block"
      />
    </button>
  );
}
