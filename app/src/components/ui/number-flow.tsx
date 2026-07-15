// Thin React binding over NumberFlow's vanilla custom element (barvian's
// `number-flow`). Importing the package auto-registers `<number-flow>`; we just
// forward the value through `.update()` — the first call seeds, later calls
// animate the digit transition. Kept vanilla on purpose: no React wrapper weight.

import "number-flow";
import * as React from "react";

interface NumberFlowElement extends HTMLElement {
  update(value: number): void;
  format: Intl.NumberFormatOptions;
  numberSuffix: string;
  numberPrefix: string;
}

interface NumberFlowProps {
  value: number;
  suffix?: string;
  prefix?: string;
  format?: Intl.NumberFormatOptions;
  className?: string;
}

export function NumberFlow({
  value,
  suffix = "",
  prefix = "",
  format,
  className,
}: NumberFlowProps) {
  const ref = React.useRef<NumberFlowElement>(null);

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (format) el.format = format;
    el.numberSuffix = suffix;
    el.numberPrefix = prefix;
    el.update(value);
  }, [value, suffix, prefix, format]);

  return React.createElement("number-flow", { ref, className });
}
