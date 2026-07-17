// The token mix, small, under the gauge: input / output / cache. Cache is shown
// as HIT RATE, not volume - it is the one actionable lever on cost and the anchor
// the future cache coach hangs off. Each stat feeds the shared explainer on hover,
// same idiom as the profitability light.
//
// Hovering a stat slides a shared rounded-full pill (motion layoutId) onto it, so
// the highlighted stat is unmistakable as the pointer moves across the row.

import type { GaugeReport } from "@core/types";
import { Database, MessageCircle, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { type ComponentType, useState } from "react";
import { useExplainerHover } from "../explainer";
import { formatPct01, formatTokens } from "../format";

interface Stat {
  key: string;
  icon: ComponentType<{ className?: string }>;
  value: string;
  title: string;
  description: string;
}

const HIGHLIGHT_ID = "token-footer-highlight";
const spring = { type: "spring", stiffness: 550, damping: 34 } as const;

const stats = ({ tokens }: GaugeReport): Stat[] => [
  {
    key: "input",
    icon: MessageCircle,
    value: formatTokens(tokens.input),
    title: "Input",
    description: `${formatTokens(tokens.input)} tokens sent (uncached)`,
  },
  {
    key: "output",
    icon: Sparkles,
    value: formatTokens(tokens.output),
    title: "Output",
    description: `${formatTokens(tokens.output)} tokens generated`,
  },
  {
    key: "cache",
    icon: Database,
    value: formatPct01(tokens.cacheHitRate),
    title: "Cache hit rate",
    description: `${formatPct01(tokens.cacheHitRate)} of reads served from cache`,
  },
];

// The pill lives in whichever stat is `parked` (the last one hovered) and only
// its opacity is driven by `visible`. Because it never unmounts while it stays in
// place, leaving a stat fades it out in-place; moving to another stat re-homes it
// (same layoutId) and slides - one pill on screen at all times, so no cross-fade
// overlap flash.
function FooterStat({
  icon: Icon,
  value,
  title,
  description,
  parked,
  visible,
  onHover,
}: Omit<Stat, "key"> & {
  parked: boolean;
  visible: boolean;
  onHover: (over: boolean) => void;
}) {
  const hover = useExplainerHover({ title, description });

  const handleEnter = () => {
    hover.onMouseEnter();
    onHover(true);
  };
  const handleLeave = () => {
    hover.onMouseLeave();
    onHover(false);
  };

  return (
    <span
      className={`relative flex cursor-default items-center gap-1 rounded-full px-2.5 py-1 transition-colors ${
        visible ? "text-foreground" : "text-muted-foreground"
      }`}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {parked && (
        <motion.span
          layoutId={HIGHLIGHT_ID}
          initial={false}
          animate={{ opacity: visible ? 1 : 0 }}
          transition={{ layout: spring, opacity: { duration: 0.15 } }}
          className="absolute inset-0 -z-10 rounded-full bg-white/10"
        />
      )}
      <Icon className="size-3" />
      <span className="text-[11px] tabular-nums">{value}</span>
    </span>
  );
}

export function TokenFooter({ report }: { report: GaugeReport }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [home, setHome] = useState<string | null>(null);

  const handleHover = (key: string, over: boolean) => {
    if (over) {
      setHovered(key);
      setHome(key);
    } else {
      setHovered((h) => (h === key ? null : h));
    }
  };

  return (
    // Each stat is its own rounded-full px-2.5 pill (for the hover highlight),
    // so left-aligned (row mode) the row reads 10px indented against the
    // flush-left usage bar above it - the same pill-padding mismatch the tabs
    // have (see gauge-stack.tsx), fixed the same way: outdent the whole row.
    //
    // Shown only under the panel's two FULL-content reveal paths (portrait or
    // row-capable) - NOT gauge-stack.tsx's narrow-but-tall "minimal" path,
    // which shows only tabs and a bare usage bar, no room for a third row of
    // stats. Querying the panel directly (not a "stack" width threshold)
    // avoids an ambiguous overlap: stack width is panel width minus padding,
    // so a merely-170px-wide portrait panel (full reveal) and a 165px-wide
    // minimal one land at nearly the same stack width.
    //
    // The portrait floor here is TALLER than the shared REVEAL's 170px
    // (gauge-stack.tsx): measured directly (not guessed) against gauge-page.tsx's
    // actual grid - once panel width clears ~240px the dial locks at its 216px
    // cap, so tabs+dial+padding claim a CONSTANT ~294px of panel height
    // regardless of how much taller the panel gets beyond that; the "rest" row
    // gets only whatever height remains above that 294px floor. The fuel gauge
    // alone (arc + center readout) needs ~77px to render uncropped, so this row
    // can't safely claim any space before panel height clears 294+77=371px -
    // below that, THIS stats row is the one that gives, not the fuel gauge (the
    // reality anchor). Rounded up to 380 for a small buffer. Row mode's own
    // floor is untouched: its "rest" row is a couple of compact lines beside the
    // dial, not stacked above it, so it never competes with the fuel gauge for
    // the same vertical space - but that second condition MUST also cap
    // max-height:260, matching gauge-page.tsx's own row-mode switch exactly:
    // without that cap, a WIDE (≥340) but genuinely TALL portrait panel (column
    // layout, height > 260) also satisfied "width≥340 and height≥90" and re-lit
    // this row despite clearing none of the height reasoning above - the exact
    // bug that let this row (and the $ badge) outlive the fuel gauge's own arc.
    <div className="hidden items-center justify-center gap-1 footered:flex landscape:-ml-2.5 landscape:justify-start">
      {stats(report).map(({ key, ...stat }) => (
        <FooterStat
          key={key}
          {...stat}
          parked={home === key}
          visible={hovered === key}
          onHover={(over) => handleHover(key, over)}
        />
      ))}
    </div>
  );
}
