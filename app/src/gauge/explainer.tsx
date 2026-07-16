// The shared "explainer" region: one title + description slot that any indicator
// on the page can take over on hover. The radial gauge feeds it the hovered
// zone; the profitability light feeds it Anthropic's state; future indicators
// will feed it their own. Each hover pushes an override; leaving clears it back
// to the page's fallback content. This is the reason it lives in context rather
// than local state — many widgets, one description panel.

import { createContext, useContext, useState, type ReactNode } from "react";
import { LazyMotion, domAnimation, m, AnimatePresence } from "motion/react";

export interface ExplainerContent {
  title: string;
  description: string;
}

interface ExplainerStore {
  override: ExplainerContent | null;
  setOverride: (content: ExplainerContent | null) => void;
}

const ExplainerCtx = createContext<ExplainerStore | null>(null);

export function ExplainerProvider({ children }: { children: ReactNode }) {
  const [override, setOverride] = useState<ExplainerContent | null>(null);
  return (
    <ExplainerCtx.Provider value={{ override, setOverride }}>
      {children}
    </ExplainerCtx.Provider>
  );
}

export function useExplainer(): ExplainerStore {
  const ctx = useContext(ExplainerCtx);
  if (!ctx)
    throw new Error("useExplainer must be used within ExplainerProvider");
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

// Staggered spring: the two lines rise into place one after the other, and the
// whole block swaps out (exit → enter) whenever the active content changes.
const container = {
  animate: { transition: { staggerChildren: 0.07, delayChildren: 0.02 } },
  exit: { transition: { staggerChildren: 0.04, staggerDirection: -1 } },
};
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
// these thresholds live only in the classes below, not as interpolated
// constants — keep the two in sync by hand if they ever need to move.
//
// They're set against the "stack" container's TOTAL height, not the
// explainer's own — its siblings (the usage bar and token footer; tabs live
// outside the stack, see gauge-stack.tsx) plus their gaps already claim
// ~68px before this panel gets anything, so the floors sit above that (title
// line measures ~24px, title+description ~78px) to leave it real room
// instead of clipping mid-line against the panel's overflow-hidden.
// Hidden below 100px of stack height; title-only below 150px.

/**
 * The single description panel. Shows the active override, else the fallback.
 * Always rendered — visibility is pure CSS, driven by the "stack" named
 * container's own height (see index.css / gauge-stack.tsx), so it degrades
 * from full text to title-only to fully hidden as its region shrinks, with no
 * layout prop and no measurement flash.
 */
export function ExplainerPanel({ fallback }: { fallback: ExplainerContent }) {
  const { override } = useExplainer();
  const { title, description } = override ?? fallback;
  return (
    <LazyMotion features={domAnimation}>
      <div className="hidden mx-auto w-full text-balance px-4 text-center font-[Helvetica,Arial,sans-serif] [@container_stack_(min-height:100px)]:block [@container_panel_(max-height:260px)_and_(min-width:340px)]:mx-0 [@container_panel_(max-height:260px)_and_(min-width:340px)]:px-0 [@container_panel_(max-height:260px)_and_(min-width:340px)]:text-left">
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={title + description}
            variants={container}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <m.p
              variants={line}
              className="mb-1 text-sm font-semibold capitalize"
            >
              {title}
            </m.p>
            <m.p
              variants={line}
              className="hidden text-xs leading-normal text-[#aaaaaa] line-clamp-3 h-[3lh] [@container_stack_(min-height:150px)]:block"
            >
              {description}
            </m.p>
          </m.div>
        </AnimatePresence>
      </div>
    </LazyMotion>
  );
}
