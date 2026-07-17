// The shared "explainer" region: one description slot that any indicator on
// the page can take over on hover. The radial gauge feeds it the hovered
// zone; the profitability light feeds it Anthropic's state; future indicators
// will feed it their own. Each hover pushes an override; leaving clears it back
// to the page's fallback content. This is the reason it lives in context rather
// than local state: many widgets, one description panel.

import { AnimatePresence, domAnimation, LazyMotion, m } from "motion/react";
import { createContext, type ReactNode, useContext, useState } from "react";
import type { ShimmerTone } from "../shimmer-text";

export interface ExplainerContent {
  title: string;
  description: string;
  // Turbo/Nitro tint the title with a colored shimmer; omit for the plain pulse.
  tone?: ShimmerTone;
}

interface ExplainerStore {
  override: ExplainerContent | null;
  setOverride: (content: ExplainerContent | null) => void;
}

const ExplainerCtx = createContext<ExplainerStore | null>(null);

export function ExplainerProvider({ children }: { children: ReactNode }) {
  const [override, setOverride] = useState<ExplainerContent | null>(null);
  return (
    <ExplainerCtx.Provider value={{ override, setOverride }}>{children}</ExplainerCtx.Provider>
  );
}

export function useExplainer(): ExplainerStore {
  const ctx = useContext(ExplainerCtx);
  if (!ctx) throw new Error("useExplainer must be used within ExplainerProvider");
  return ctx;
}

/** Hover handlers that hold `content` in the panel while the pointer is over. */
export function useExplainerHover(content: ExplainerContent) {
  const { setOverride } = useExplainer();
  return {
    onMouseEnter: () => setOverride(content),
    onMouseLeave: () => setOverride(null),
  };
}

// The block swaps out (exit, then enter) whenever the active content changes.
const line = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 550, damping: 32 },
  },
  exit: { opacity: 0, y: -8, transition: { duration: 0.12 } },
} as const;

// Tailwind's scanner needs the full class name as a static string literal, so
// this threshold lives only in the class below, not as an interpolated
// constant; keep the two in sync by hand if it ever needs to move.
//
// It's set against the "stack" container's TOTAL height, not the explainer's
// own - its siblings (the fuel gauge and token footer; tabs live outside the
// stack, see gauge-stack.tsx) plus their gaps already claim ~130px before this
// panel gets anything (the fuel gauge's arc + readout alone is ~80px), so the
// floor sits above that (the description clamps to 3 lines, ~78px) to leave it
// real room instead of clipping mid-line against the panel's overflow-hidden.
// Hidden below 170px of stack height.

/**
 * The single description panel. Shows the active override, else the fallback.
 * Always rendered - visibility is pure CSS, driven by the "stack" named
 * container's own height (see index.css / gauge-stack.tsx), so it degrades
 * from shown to fully hidden as its region shrinks, with no layout prop and
 * no measurement flash.
 */
export function ExplainerPanel({ fallback }: { fallback: ExplainerContent }) {
  const { override } = useExplainer();
  const { description } = override ?? fallback;
  return (
    <LazyMotion features={domAnimation}>
      <div className="hidden mx-auto w-full text-balance px-4 text-center font-[Helvetica,Arial,sans-serif] [@container_stack_(min-height:150px)]:block landscape:mx-0 landscape:px-0 landscape:text-left">
        <AnimatePresence mode="wait" initial={false}>
          <m.p
            key={description}
            variants={line}
            initial="initial"
            animate="animate"
            exit="exit"
            className="text-xs leading-normal text-muted-strong line-clamp-3 h-[3lh]"
          >
            {description}
          </m.p>
        </AnimatePresence>
      </div>
    </LazyMotion>
  );
}
