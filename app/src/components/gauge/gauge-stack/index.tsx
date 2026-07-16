// The text pieces beside/below the dial, placed via CSS Grid (see
// gauge-page.tsx) so they can visually relocate between arrangements without
// duplicating markup: `GaugeTabsSlot` always sits above the dial in the
// default column arrangement and beside it (top of the text column) in the
// row arrangement; `GaugeStack` holds the rest (usage bar, token footer,
// explainer) and always sits below/beside the dial to match.
//
// Both establish a "stack" named container (the tabs' own icon/label swap and
// the explainer's full/title/hidden swap query it for their own width/height),
// and both reveal under the SAME three conditions, so the visible tabs are
// never out of sync with the rest of the text:
//   • portrait/square capable — width and height both clear 170px, enough for
//     the normal column arrangement;
//   • row capable — width clears 340px (the same floor gauge-page.tsx switches
//     direction on) even if height is much shorter, since a row only needs a
//     couple of compact lines, not a tall column;
//   • narrow-but-tall capable — width is below the portrait floor (no room for
//     the full column) but height is generous, so at least tabs and a bare
//     usage bar (no label row — see raw-usage-bar.tsx/token-footer.tsx, which
//     hide their own text/rows below 170px of THIS container's own width) fit
//     rather than going fully bare just because of a narrow width.
// Below all three, there's no room for anything but the bare dial
// (gauge-page.tsx lets it fill the space this frees up). Their alignment
// (centered vs left-anchored) and grid placement follow the "panel"
// container's own row condition — kept in lockstep with gauge-page.tsx's
// direction switch.
//
// Tailwind needs each class as a static string literal (no JS-interpolated
// breakpoints), so the conditions below are spelled out in full rather than
// built from a shared constant — keep them in sync with gauge-page.tsx and
// explainer.tsx/token-footer.tsx by hand.
//
// Both are full-width/height grid cells that center or left-anchor their
// CONTENT via an internal flex alignment — never `justify-self`/`self-*` on
// the cell itself. A container-type:size|inline-size element can't fall back
// to content-based sizing (that's what containment means), so leaving it to
// size itself via `justify-self` (which needs exactly that fallback) silently
// collapses it; sizing the cell to the grid track instead and aligning its
// child internally sidesteps the conflict entirely.

import type { ReactNode } from "react";

const REVEAL =
  "[@container_panel_(min-width:170px)_and_(min-height:170px)]:flex [@container_panel_(min-width:340px)_and_(min-height:90px)]:flex [@container_panel_(min-width:110px)_and_(min-height:130px)]:flex";

export function GaugeTabsSlot({ children }: { children: ReactNode }) {
  return (
    <div
      // pointer-events-auto: the grid parent is pointer-events-none (so its
      // own gaps stay draggable — see gauge-page.tsx), so each interactive
      // child has to opt back in individually to keep its own content
      // clickable.
      className={`@container/stack [container-type:inline-size] pointer-events-auto hidden col-start-1 row-start-1 w-full justify-center ${REVEAL} [@container_panel_(max-height:260px)_and_(min-width:340px)]:col-start-2 [@container_panel_(max-height:260px)_and_(min-width:340px)]:justify-start`}
    >
      {/* The tab pill has its own chrome (a rounded p-0.5 wrapper plus each
          button's own px-2) — about 10px between the pill's edge and the
          icon/label inside. Left-aligned (row mode), that reads as visibly
          indented against the flush-left usage bar below it; this outdents
          the pill so the ICON lines up with "Usage", not the pill's edge. */}
      <div className="[@container_panel_(max-height:260px)_and_(min-width:340px)]:-ml-2.5">
        {children}
      </div>
    </div>
  );
}

export function GaugeStack({ children }: { children: ReactNode }) {
  return (
    <div
      // justify-center, not justify-start: the "rest" grid row is a leftover-
      // absorbing `1fr` track (see gauge-page.tsx — it can't be `auto`
      // without breaking container-type:size), so there's often real slack
      // above and below this box's actual content. Centering splits that
      // slack evenly (a bit above, a bit below); anchoring it to one end
      // dumps all of it on the other, which read as "too much space" under
      // whichever child ends up last (the title, or the dial in row mode).
      className={`@container/stack [container-type:size] pointer-events-auto hidden col-start-1 row-start-3 h-full w-full min-h-0 min-w-0 flex-col items-center justify-center gap-3 overflow-hidden ${REVEAL} [@container_panel_(max-height:260px)_and_(min-width:340px)]:col-start-2 [@container_panel_(max-height:260px)_and_(min-width:340px)]:row-start-2 [@container_panel_(max-height:260px)_and_(min-width:340px)]:items-start`}
    >
      {children}
    </div>
  );
}
