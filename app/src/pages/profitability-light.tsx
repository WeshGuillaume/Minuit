// Axis-1 verdict as a dashboard warning light, not a gauge. Anthropic being
// "profitable" vs "at a loss" is a binary state — so we light the Claude Code
// mark orange while Anthropic still profits and red once the profitability ratio
// crosses break-even. The light carries no text of its own: hovering it takes
// over the shared explainer panel with the state AND the real consumption value.

import type { GaugeReport } from "@core/types";
import { cn } from "@/lib/utils";
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

function ClaudeMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      fillRule="evenodd"
      clipRule="evenodd"
      aria-hidden="true"
      className="size-6 mt-1"
    >
      <path d="M20.998 10.949H24v3.102h-3v3.028h-1.487V20H18v-2.921h-1.487V20H15v-2.921H9V20H7.488v-2.921H6V20H4.487v-2.921H3V14.05H0V10.95h3V5h17.998v5.949zM6 10.949h1.488V8.102H6v2.847zm10.51 0H18V8.102h-1.49v2.847z" />
    </svg>
  );
}

export function ProfitabilityLight({ report }: { report: GaugeReport }) {
  const profitable = report.ratio < report.breakEvenRatio;
  const hover = useExplainerHover(explain(report, profitable));

  return (
    <div className="flex cursor-default justify-center" {...hover}>
      <div
        className={cn(
          "grid flex-none place-items-center text-(--glow) ",
          profitable ? "[--glow:#f97316]" : "[--glow:#ef4444]",
        )}
      >
        <ClaudeMark />
      </div>
    </div>
  );
}
