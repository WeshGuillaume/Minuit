// The window switcher at the top of the gauge: a compact segmented control
// whose active highlight glides between tabs via a shared motion layoutId.

import { motion } from "motion/react";
import type { WindowKey } from "@core/types";

export const WINDOWS: { id: WindowKey; label: string }[] = [
  { id: "seven_day", label: "Weekly" },
  { id: "five_hour", label: "5-hour" },
];

export function WindowTabs({
  value,
  onChange,
}: {
  value: WindowKey;
  onChange: (next: WindowKey) => void;
}) {
  return (
    <div className="relative flex gap-1 rounded-full bg-[#1f1f1e] p-0.5">
      {WINDOWS.map((w) => {
        const active = w.id === value;
        return (
          <button
            key={w.id}
            type="button"
            onClick={() => onChange(w.id)}
            className="relative rounded-full px-3 py-1 text-xs font-medium outline-none transition-colors"
          >
            {active && (
              <motion.span
                layoutId="window-tab-highlight"
                className="absolute inset-0 rounded-full bg-white/10"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span
              className={`relative z-10 transition-colors ${
                active ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {w.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
