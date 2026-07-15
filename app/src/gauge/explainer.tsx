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

/** The single description panel. Shows the active override, else the fallback. */
export function ExplainerPanel({ fallback }: { fallback: ExplainerContent }) {
  const { override } = useExplainer();
  const { title, description } = override ?? fallback;
  return (
    <LazyMotion features={domAnimation}>
      <div className="mx-auto text-balance px-4 text-center font-[Helvetica,Arial,sans-serif]">
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
              className="text-xs leading-normal text-[#aaaaaa] line-clamp-3 h-[3lh]"
            >
              {description}
            </m.p>
          </m.div>
        </AnimatePresence>
      </div>
    </LazyMotion>
  );
}
