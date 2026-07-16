import { useState } from "react";
import { type ExplainerContent, useExplainerHover } from "../components/gauge/explainer";

/** Hover state for a badge that also feeds the shared explainer panel. */
export function useProfitabilityHover(content: ExplainerContent) {
  const hover = useExplainerHover(content);
  const [over, setOver] = useState(false);

  const handleEnter = () => {
    hover.onMouseEnter();
    setOver(true);
  };
  const handleLeave = () => {
    hover.onMouseLeave();
    setOver(false);
  };

  return { over, handleEnter, handleLeave };
}
