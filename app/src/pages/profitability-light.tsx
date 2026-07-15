// Axis-1 verdict as a dashboard warning light, not a gauge. Anthropic being
// "profitable" vs "at a loss" is a binary state — so we light the Claude Code
// mark orange while Anthropic still profits and red once the profitability ratio
// crosses break-even. The light carries no text of its own: hovering it takes
// over the shared explainer panel with the state AND the real consumption value.

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { GaugeReport } from "@core/types";
import { useExplainerHover, type ExplainerContent } from "../gauge/explainer";

const usd = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value < 100 ? 2 : 0,
  }).format(value);

const explain = (
  report: GaugeReport,
  profitable: boolean,
): ExplainerContent => ({
  title: profitable ? "Anthropic in the green" : "Anthropic at a loss",
  description: `Real value farmed: ${usd(report.apiValue)}`,
});

const spring = { type: "spring", stiffness: 550, damping: 34 } as const;

export function ProfitabilityLight({ report }: { report: GaugeReport }) {
  const profitable = report.ratio < report.breakEvenRatio;
  const hover = useExplainerHover(explain(report, profitable));
  const [over, setOver] = useState(false);

  return (
    <span
      className={`relative flex cursor-default items-center justify-center rounded-full px-2.5 py-1 text-[11px] tabular-nums transition-colors ${
        over ? "text-foreground" : "text-muted-foreground"
      }`}
      onMouseEnter={() => {
        hover.onMouseEnter();
        setOver(true);
      }}
      onMouseLeave={() => {
        hover.onMouseLeave();
        setOver(false);
      }}
    >
      <AnimatePresence>
        {over && (
          <motion.span
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={spring}
            className="absolute inset-0 -z-10 rounded-full bg-white/10"
          />
        )}
      </AnimatePresence>
      {usd(report.apiValue)}
    </span>
  );
}
