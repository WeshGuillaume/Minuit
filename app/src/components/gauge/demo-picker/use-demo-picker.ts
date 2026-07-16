import { useCallback, useEffect, useState } from "react";
import { readDemoScenario, SCENARIOS, writeDemoScenario } from "../demo";

const DEFAULT_ID = "maxxing";

/** Demo-mode state + its keyboard shortcuts (toggle, zone jump, hide, escape). */
export function useDemoPicker(onChange: () => void) {
  const [activeId, setActiveId] = useState<string | null>(() => readDemoScenario());
  const [hidden, setHidden] = useState(false);

  const select = useCallback(
    (id: string | null) => {
      writeDemoScenario(id);
      setActiveId(id);
      onChange();
    },
    [onChange],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "d" && e.shiftKey && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        select(readDemoScenario() ? null : DEFAULT_ID);
        return;
      }
      if (!readDemoScenario()) return;
      if (e.key === "Escape") return select(null);
      if (e.key.toLowerCase() === "h") return setHidden((h) => !h);
      const scenario = SCENARIOS.find((s) => s.key === e.key);
      if (scenario) select(scenario.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [select]);

  return { activeId, hidden, select };
}
