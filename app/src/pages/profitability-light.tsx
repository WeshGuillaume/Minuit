// Axis-1 demoted to a flex badge: how many times over its cost this window's
// subscription has already paid for itself, in API-price terms (e.g. 58×). For
// a heavy user this is a near-constant brag, not a live gauge, so it's a single
// number, not a dial. Hovering it takes over the shared explainer with the state
// and the raw dollars farmed.

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

// 58× reads better than 58.4×; below 10 keep one decimal so 1.4× stays honest.
const fmtRatio = (ratio: number): string =>
  `${ratio >= 10 ? Math.round(ratio) : ratio.toFixed(1)}×`;

const explain = (
  report: GaugeReport,
  profitable: boolean,
): ExplainerContent => ({
  title: profitable ? "Anthropic in the green" : "Anthropic at a loss",
  description: `${usd(report.apiValue)} of API value, ${fmtRatio(report.ratio)} this window's sub cost`,
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
