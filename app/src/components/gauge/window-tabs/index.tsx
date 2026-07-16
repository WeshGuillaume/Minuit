// The window switcher at the top of the gauge: a compact segmented control whose
// active highlight glides between tabs via a shared motion layoutId. Each tab
// renders both its icon and its label; which one shows is decided purely by
// CSS, with no JS boolean and no measurement flash. Two conditions must BOTH
// hold for the label: the tabs' own "stack" container has the width for it,
// AND the panel isn't in a very short row arrangement — plenty of width is
// available there too (the dial doesn't take much of it), but full labels
// read as clutter next to the dial in a squat window, so that shape prefers
// icons even though it could technically fit the text.

import type { WindowKey } from "@core/types";
import { CalendarDays, Clock, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";

interface WindowDef {
  id: WindowKey;
  label: string;
  icon: LucideIcon;
}

const WINDOWS: WindowDef[] = [
  { id: "seven_day", label: "Weekly", icon: CalendarDays },
  { id: "five_hour", label: "5-hour", icon: Clock },
];

const HIGHLIGHT_ID = "window-tab-highlight";
const spring = { type: "spring", stiffness: 400, damping: 32 } as const;

function TabHighlight() {
  return (
    <motion.span
      layoutId={HIGHLIGHT_ID}
      className="absolute inset-0 rounded-full bg-white/10"
      transition={spring}
    />
  );
}

// Tailwind needs each class as one static string literal — a chained variant
// built by interpolating a shared prefix constant never matches anything, so
// "label room" is spelled out in full at each of its three uses below (icon,
// label, button padding) rather than shared as a JS string.

function TabBody({ window }: { window: WindowDef }) {
  const Icon = window.icon;
  return (
    <>
      <Icon
        className="size-3.5 [@container_panel_(min-height:150px)]:[@container_stack_(min-width:200px)]:hidden"
        aria-label={window.label}
      />
      <span className="hidden [@container_panel_(min-height:150px)]:[@container_stack_(min-width:200px)]:inline">
        {window.label}
      </span>
    </>
  );
}

export function WindowTabs({
  value,
  onChange,
}: {
  value: WindowKey;
  onChange: (next: WindowKey) => void;
}) {
  return (
    <div className="relative flex gap-1 rounded-full bg-surface-tabs p-0.5">
      {WINDOWS.map((window) => {
        const active = window.id === value;
        return (
          <button
            key={window.id}
            type="button"
            onClick={() => onChange(window.id)}
            className={`relative flex items-center justify-center rounded-full px-2 py-1 text-xs font-medium outline-none transition-colors [@container_panel_(min-height:150px)]:[@container_stack_(min-width:200px)]:px-3 ${
              active ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            {active && <TabHighlight />}
            <span className="relative z-10 flex items-center justify-center">
              <TabBody window={window} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
