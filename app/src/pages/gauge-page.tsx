// The gauge page: the window select and the SPEEDOMETER, a radial dial whose
// needle reads your live pace (rate ÷ the rate that kisses the cap at reset),
// with a ghost marker for your habitual pace and a raw-usage bar underneath as
// the reality anchor.
//
// Responsiveness is pure CSS container queries against the panel's own box
// (named "panel" below), via a CSS Grid whose template and item placement
// both switch on the same conditions:
//   • past a width-and-height floor (with a separate, looser floor for wide-
//     but-short panels — see gauge-stack.tsx), the tabs and the usage/footer/
//     explainer stack hide entirely and the bare dial fills the space;
//   • otherwise the default is a COLUMN — tabs, then dial, then the rest —
//     which suits the portrait and square shapes this window is normally
//     resized to;
//   • only once the panel is BOTH short and clearly wide (landscape) does it
//     switch to a ROW: the dial docks left (spanning both grid rows), and
//     tabs + the rest stack in a column beside it. A merely short-but-square
//     panel stays a column and just sheds text, rather than forcing a row
//     layout onto a shape that doesn't have the width for it.
// Grid (rather than flex) is what lets the tabs visually relocate — above the
// dial in one arrangement, beside it in the other — without duplicating
// markup: only their grid-area assignment changes, not their DOM position.
//
// The "row" condition is repeated verbatim in gauge-stack.tsx, explainer.tsx
// and token-footer.tsx (their placement/alignment must switch in lockstep
// with this file's grid template) — keep them in sync by hand; Tailwind needs
// the full class as a static string, so it can't be a shared constant.
//
// Each piece owns its own finer-grained degradation against its own box (see
// gauge-stack.tsx, speedo-dial.tsx) — nothing here measures or branches on
// size in JS, it only places. All numbers come from the pure core via useReport.

import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { GaugeReport, ToolId, WindowKey } from "@core/types";
import { SEGMENTS } from "@core/track/segments";
import {
  ExplainerProvider,
  ExplainerPanel,
  type ExplainerContent,
} from "../gauge/explainer";
import { useReport } from "../gauge/use-report";
import { SignalRefresh } from "../gauge/signal-refresh";
import { WindowSize } from "../gauge/window-size";
import { WindowTabs } from "../gauge/window-tabs";
import { TokenFooter } from "../gauge/token-footer";
import { RawUsageBar } from "../gauge/raw-usage-bar";
import { SpeedoDial } from "../gauge/speedo-dial";
import { GaugeStack, GaugeTabsSlot } from "../gauge/gauge-stack";

const SEGMENT_BY_ID = Object.fromEntries(SEGMENTS.map((s) => [s.id, s]));
const WINDOW_STORAGE_KEY = "cc-gauge:window";

const loadWindow = (): WindowKey => {
  const saved = localStorage.getItem(WINDOW_STORAGE_KEY);
  return saved === "five_hour" || saved === "seven_day" ? saved : "seven_day";
};

export default function GaugePage() {
  return (
    <ExplainerProvider>
      <GaugeView />
    </ExplainerProvider>
  );
}

function GaugeView() {
  const tool: ToolId = "claude";
  const [window, setWindow] = useState<WindowKey>(loadWindow);
  const { report, refreshing, reload } = useReport(tool, window);

  return (
    <main className="flex h-full w-full flex-col gap-2">
      <div
        data-tauri-drag-region
        className="fixed inset-x-0 top-0 z-50 h-4 cursor-grab"
      >
        <div className="mx-auto h-0.5 w-10 translate-y-2 rounded-full bg-white/30" />
      </div>
      <WindowSize />

      {report ? (
        <GaugeContent
          report={report}
          refreshing={refreshing}
          onRefreshed={reload}
          window={window}
          setWindow={setWindow}
        />
      ) : (
        <GaugeLoading />
      )}
    </main>
  );
}

function GaugeLoading() {
  return (
    <div className="flex w-full flex-1 items-center justify-center text-muted-foreground">
      <Loader2 className="size-6 animate-spin" />
    </div>
  );
}

function RefreshDot({ show }: { show: boolean }) {
  return (
    <div
      className={`absolute right-3 top-3 z-10 transition-opacity duration-300 ${
        show ? "opacity-100" : "opacity-0"
      }`}
    >
      <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
    </div>
  );
}

export function GaugeContent({
  report,
  refreshing,
  onRefreshed,
  window,
  setWindow,
}: {
  report: GaugeReport;
  refreshing: boolean;
  onRefreshed: () => void;
  window: WindowKey;
  setWindow: (next: WindowKey) => void;
}) {
  const changeWindow = (next: WindowKey) => {
    localStorage.setItem(WINDOW_STORAGE_KEY, next);
    setWindow(next);
  };

  const fallback: ExplainerContent = {
    title: SEGMENT_BY_ID[report.zone].label,
    description: SEGMENT_BY_ID[report.zone].description,
  };

  return (
    <div className="relative flex flex-1 @container/panel overflow-hidden border-b bg-[#252525] drop-shadow-xl [container-type:size]">
      <RefreshDot show={refreshing} />
      {!report.signalAvailable && <SignalRefresh onRefreshed={onRefreshed} />}

      {/* CSS Grid, not flex: tabs need to visually relocate — above the dial
          in the default column arrangement, beside it (top of the text
          column) in the row one — which only a genuine reflow (grid area
          reassignment) gives without duplicating markup. Column: tabs / dial
          / rest, stacked. Row: dial spans both rows on the left; tabs and
          rest stack in the right column. */}
      {/* The grid's own padding/gap is minimal by default (bare: just the
          dial — no drag-handle clearance or row spacing to worry about) and
          only grows to pt-6/px-3/pb-3/gap-3 once the stack actually reveals
          (the SAME two conditions as gauge-stack.tsx's REVEAL) — that's when
          tabs are actually there to crowd the drag handle and rows to space
          apart. Keeping it minimal in bare mode matters: the dial's own
          bare-mode formula below has to subtract this same overhead to avoid
          overflowing the panel, and the bigger padding meant for a full
          tabs/dial/rest column left barely anything for the dial at the
          smallest sizes (e.g. 150×150). */}
      {/* The "rest" row MUST stay `1fr`, not `auto`: GaugeStack has
          container-type:size (needed so the explainer can query its height),
          and a size-contained box reports a zero content size to its grid
          track — an `auto` track sizing off that content collapses to zero.
          `1fr` sizes from leftover space instead, sidestepping the content
          query entirely. Any slack this leaves is split evenly by
          GaugeStack's own justify-center (see gauge-stack.tsx), not dumped
          in one spot after the last visible child. */}
      <div className="grid h-full w-full grid-cols-1 grid-rows-[auto_auto_1fr] gap-0 p-1 [@container_panel_(min-width:170px)_and_(min-height:170px)]:gap-3 [@container_panel_(min-width:170px)_and_(min-height:170px)]:px-3 [@container_panel_(min-width:170px)_and_(min-height:170px)]:pb-3 [@container_panel_(min-width:170px)_and_(min-height:170px)]:pt-6 [@container_panel_(min-width:340px)_and_(min-height:90px)]:gap-3 [@container_panel_(min-width:340px)_and_(min-height:90px)]:px-3 [@container_panel_(min-width:340px)_and_(min-height:90px)]:pb-3 [@container_panel_(min-width:340px)_and_(min-height:90px)]:pt-6 [@container_panel_(max-height:260px)_and_(min-width:340px)]:grid-cols-[auto_1fr] [@container_panel_(max-height:260px)_and_(min-width:340px)]:grid-rows-[auto_1fr]">
        <GaugeTabsSlot>
          <WindowTabs value={window} onChange={changeWindow} />
        </GaugeTabsSlot>
        <SpeedoDial
          report={report}
          onRefreshed={onRefreshed}
          // Default assumes bare (no stack to share room with): fill the
          // panel, minus this grid's own (bare-sized) overhead — 8px of
          // horizontal padding (p-1 both sides), 8px of vertical (p-1 both
          // sides, gap-0 so the two row gaps cost nothing) — capped. cqw/cqh
          // read the PANEL's box, not this grid's, so that overhead has to be
          // subtracted explicitly or the dial computes bigger than the room
          // actually left for it and overflows past the panel's own edge.
          // Once the portrait/square floor clears (gauge-stack.tsx's REVEAL,
          // first path) the grid's own padding/gap grows too (see above), and
          // the stack shows below it, so this reserves ~90px of height for
          // it. Once the panel goes row instead, bound by height and reserve
          // ~140px of width for the stack beside it. `place-self-center`
          // centers it within its grid cell on whichever axis it doesn't fill.
          className="col-start-1 row-start-2 w-[min(calc(100cqw_-_8px),calc(100cqh_-_8px),216px)] place-self-center [@container_panel_(min-width:170px)_and_(min-height:170px)]:w-[min(90cqw,calc(100cqh_-_90px),216px)] [@container_panel_(max-height:260px)_and_(min-width:340px)]:col-start-1 [@container_panel_(max-height:260px)_and_(min-width:340px)]:row-start-1 [@container_panel_(max-height:260px)_and_(min-width:340px)]:row-span-2 [@container_panel_(max-height:260px)_and_(min-width:340px)]:w-[min(calc(100cqw_-_140px),100cqh,216px)]"
        />
        <GaugeStack>
          <RawUsageBar report={report} />
          <TokenFooter report={report} />
          <ExplainerPanel fallback={fallback} />
        </GaugeStack>
      </div>
    </div>
  );
}
