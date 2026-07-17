// The text pieces beside/below the dial, placed via CSS Grid (see
// gauge-page.tsx) so they can visually relocate between arrangements without
// duplicating markup: `GaugeTabsSlot` always sits above the dial in the
// default column arrangement and beside it (top of the text column) in the
// row arrangement; `GaugeStack` holds the rest (usage bar, token footer,
// explainer) and always sits below/beside the dial to match.
//
// Both establish a "stack" named container (the tabs' own icon/label swap and
// the explainer's full/title/hidden swap query it for their own width/height),
// but they reveal on DIFFERENT rungs, in the product's priority order (fuel
// gauge above tabs, see index.css): `GaugeStack` (the fuel gauge, then footer +
// explainer at their own higher floors) reveals on `reveal`, while
// `GaugeTabsSlot` reveals only on `tabbed`, one rung up. So a panel with room
// for the dial + fuel but not the tab row shows the fuel and drops the tabs -
// never the reverse. Below `reveal`, there's no room for anything but the bare
// dial (gauge-page.tsx lets it fill the space this frees up). Their alignment
// (centered vs left-anchored) and grid placement follow the panel's own
// `landscape` rung - kept in lockstep with gauge-page.tsx's direction switch.
//
// Every breakpoint (reveal / tabbed / landscape / flat) is a named
// @custom-variant defined once in index.css, so the conditions here read as
// words and stay in lockstep with gauge-page.tsx and token-footer.tsx by
// construction, not by hand-synced literal strings.
//
// Both are full-width/height grid cells that center or left-anchor their
// CONTENT via an internal flex alignment - never `justify-self`/`self-*` on
// the cell itself. A container-type:size|inline-size element can't fall back
// to content-based sizing (that's what containment means), so leaving it to
// size itself via `justify-self` (which needs exactly that fallback) silently
// collapses it; sizing the cell to the grid track instead and aligning its
// child internally sidesteps the conflict entirely.

import type { ReactNode } from "react";

// The two rungs, defined in index.css. `reveal` is the fuel-gauge floor (dial +
// fuel); `tabbed` sits one rung above it (room for the window tabs too). Tabs
// query `tabbed`, the rest of the stack queries `reveal`, so a panel with room
// for the fuel but not the tab row shows the fuel and drops the tabs — the
// product's priority order (fuel above tabs), not a shared all-or-nothing floor.

export function GaugeTabsSlot({ children }: { children: ReactNode }) {
  return (
    <div
      // pointer-events-auto: the grid parent is pointer-events-none (so its
      // own gaps stay draggable (see gauge-page.tsx), so each interactive
      // child has to opt back in individually to keep its own content
      // clickable.
      className="@container/stack [container-type:inline-size] pointer-events-auto hidden col-start-1 row-start-1 w-full justify-center tabbed:flex landscape:col-start-2 landscape:justify-start"
    >
      {/* The tab pill has its own chrome (a rounded p-0.5 wrapper plus each
          button's own px-2) - about 10px between the pill's edge and the
          icon/label inside. Left-aligned (row mode), that reads as visibly
          indented against the flush-left usage bar below it; this outdents
          the pill so the ICON lines up with "Usage", not the pill's edge. */}
      <div className="landscape:-ml-2.5">{children}</div>
    </div>
  );
}

export function GaugeStack({ children }: { children: ReactNode }) {
  return (
    <div
      // justify-start, not justify-center: the "rest" grid row is a leftover-
      // absorbing `1fr` track (see gauge-page.tsx; it can't be `auto` without
      // breaking container-type:size), so its height often exceeds this box's
      // actual content - centering split that slack evenly (a bit above, a bit
      // below), but "above" reads as a gap stranding the fuel gauge away from
      // the dial it's anchoring, which only gets more visible the fewer
      // children show (token-footer.tsx/speedo-dial.tsx's own height cutoffs
      // hide progressively more before this row's height budget ever does).
      // Anchoring to the top instead keeps the fuel gauge grounded directly
      // under the dial at every size, dumping any slack at the bottom instead.
      // In landscape the fuel sits BESIDE the dial (its own column, not under
      // it), so there's no "stranded above the dial" gap to avoid - it centers
      // vertically instead (justify-center), and cancels the flat pull-up below
      // (mt-0! - `flat` is defined after `landscape`, so it needs the !).
      //
      // Below the $ badge's own hide threshold (max-height:379px, see
      // speedo-dial.tsx), a fixed -mt pulls this row up over BOTH the grid's
      // own 12px row gap AND whatever's left of the dial's own bottom crop
      // slack (speedo-dial.tsx tightens that crop too, but a fixed overlap
      // here doesn't depend on that guess being pixel-perfect) - deliberately
      // a bit more than either alone, so the fuel gauge sits flush under the
      // dial regardless of small variances, rather than tuning two separate
      // numbers to cancel out exactly.
      className="@container/stack [container-type:size] pointer-events-auto hidden col-start-1 row-start-3 h-full w-full min-h-0 min-w-0 flex-col items-center justify-start gap-3 overflow-hidden reveal:flex landscape:col-start-2 landscape:row-start-2 landscape:mt-0! landscape:items-start landscape:justify-center flat:-mt-2"
    >
      {children}
    </div>
  );
}
