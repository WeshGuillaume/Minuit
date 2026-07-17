// The gauge page: the window select and the SPEEDOMETER, a radial dial whose
// needle reads your live pace (rate ÷ the rate that kisses the cap at reset),
// with an analog fuel gauge underneath as the reality anchor (the tank drains
// as usage climbs toward the cap).
//
// Responsiveness is pure CSS container queries against the panel's own box
// (named "panel" below), via a CSS Grid whose template and item placement
// both switch on the same conditions:
//   • past a width-and-height floor (with a separate, looser floor for wide-
//     but-short panels, see gauge-stack.tsx), the tabs and the usage/footer/
//     explainer stack hide entirely and the bare dial fills the space;
//   • otherwise the default is a COLUMN - tabs, then dial, then the rest -
//     which suits the portrait and square shapes this window is normally
//     resized to;
//   • only once the panel is BOTH short and clearly wide (landscape) does it
//     switch to a ROW: the dial docks left (spanning both grid rows), and
//     tabs + the rest stack in a column beside it. A merely short-but-square
//     panel stays a column and just sheds text, rather than forcing a row
//     layout onto a shape that doesn't have the width for it.
// Grid (rather than flex) is what lets the tabs visually relocate - above the
// dial in one arrangement, beside it in the other - without duplicating
// markup: only their grid-area assignment changes, not their DOM position.
//
// The breakpoints themselves (reveal / full / footered / landscape / flat)
// are defined ONCE as @custom-variant in index.css and consumed by name here
// and in gauge-stack.tsx / token-footer.tsx / speedo-dial.tsx / explainer.tsx,
// so the placement/alignment switches stay in lockstep without hand-syncing a
// literal `[@container_panel_(…)]` string across five files. `landscape` is
// this file's row switch; `reveal` gates the grid's padding/gap.
//
// Each piece owns its own finer-grained degradation against its own box (see
// gauge-stack.tsx, speedo-dial.tsx) - nothing here measures or branches on
// size in JS, it only places. All numbers come from the pure core via useReport.

import { ZONES } from "@core/track/zones";
import type { GaugeReport, ToolId, WindowKey } from "@core/types";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { DemoPicker } from "../components/gauge/demo-picker";
import {
  type ExplainerContent,
  ExplainerPanel,
  ExplainerProvider,
} from "../components/gauge/explainer";
import { FuelGauge } from "../components/gauge/fuel-gauge";
import { GaugeStack, GaugeTabsSlot } from "../components/gauge/gauge-stack";
import { GaugeModeProvider } from "../components/gauge/modes/context";
import { SignalRefresh } from "../components/gauge/signal-refresh";
import { SpeedoDial } from "../components/gauge/speedo-dial";
import { TokenFooter } from "../components/gauge/token-footer";
import { useReport } from "../components/gauge/use-report";
import { WindowSize } from "../components/gauge/window-size";
import { WindowTabs } from "../components/gauge/window-tabs";
import { zoneTone } from "../components/gauge/zone-tone";

const ZONE_BY_ID = Object.fromEntries(ZONES.map((z) => [z.id, z]));
const WINDOW_STORAGE_KEY = "minuit:window";

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
      <DemoPicker onChange={reload} />
    </main>
  );
}

function GaugeLoading() {
  return (
    <div className="relative flex w-full flex-1 items-center justify-center text-muted-foreground">
      {/* No panel/tabs to react to yet - just keep the window grabbable while
          the first report loads. */}
      <div data-tauri-drag-region className="absolute inset-0 cursor-grab active:cursor-grabbing" />
      <Loader2 className="pointer-events-none size-6 animate-spin" />
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
    title: ZONE_BY_ID[report.zone].label,
    description: ZONE_BY_ID[report.zone].description,
    tone: zoneTone(report.zone),
  };

  return (
    <GaugeModeProvider>
      <div className="relative flex flex-1 @container/panel overflow-hidden border-b bg-background drop-shadow-xl [container-type:size]">
        {/* The whole panel is the drag region, in every state - not just bare
          mode or a thin top strip. Negative z keeps it BELOW the grid's
          in-flow content in paint order (which also drives hit-testing), so
          it only catches clicks that fall through to empty space: gaps,
          padding, the dial's own open arc - never the tabs, ticks, footer
          stats, or explainer text sitting above it. */}
        <div
          data-tauri-drag-region
          className="absolute inset-0 -z-10 cursor-grab active:cursor-grabbing"
        />
        <RefreshDot show={refreshing} />
        {!report.signalAvailable && <SignalRefresh onRefreshed={onRefreshed} />}

        {/* CSS Grid, not flex: tabs need to visually relocate - above the dial
          in the default column arrangement, beside it (top of the text
          column) in the row one, which only a genuine reflow (grid area
          reassignment) gives without duplicating markup. Column: tabs / dial
          / rest, stacked. Row: dial spans both rows on the left; tabs and
          rest stack in the right column. */}
        {/* The grid's own padding/gap is minimal by default (bare: just the
          dial - no drag-handle clearance or row spacing to worry about) and
          only grows to pt-6/px-3/pb-3/gap-3 once the stack actually reveals
          (the SAME three conditions as gauge-stack.tsx's REVEAL - portrait,
          row-capable, and narrow-but-tall), that's when tabs are actually
          there to crowd the drag handle and rows to space apart. Keeping it
          minimal in bare mode matters: the dial's own bare-mode formula below
          has to subtract this same overhead to avoid overflowing the panel,
          and the bigger padding meant for a full tabs/dial/rest column left
          barely anything for the dial at the smallest sizes (e.g. 150×150). */}
        {/* The "rest" row MUST stay `1fr`, not `auto`: GaugeStack has
          container-type:size (needed so the explainer can query its height),
          and a size-contained box reports a zero content size to its grid
          track - an `auto` track sizing off that content collapses to zero.
          `1fr` sizes from leftover space instead, sidestepping the content
          query entirely. Any slack this leaves is split evenly by
          GaugeStack's own justify-center (see gauge-stack.tsx), not dumped
          in one spot after the last visible child. */}
        {/* pointer-events-none, unconditionally - not just in bare mode: lets
          clicks in any EMPTY part of the grid (gaps, padding) fall through to
          the drag overlay behind it, so the window stays grabbable in the
          gaps even once the stack reveals. Making the grid itself auto again
          under the reveal conditions (an earlier attempt) fixed clicking the
          tabs/dial/footer, but it also re-claimed every blank pixel of the
          grid's OWN box for hit-testing, leaving nothing left to drag by.
          GaugeTabsSlot and GaugeStack restore pointer-events-auto themselves
          (their plain buttons/text have no pointer-events of their own to
          fall back on); SpeedoDial doesn't need to, RadialGauge already
          manages its own granularly (see its className comment). */}
        <div className="grid h-full w-full grid-cols-1 grid-rows-[auto_auto_1fr] gap-0 p-1 pointer-events-none reveal:gap-3 reveal:px-2 reveal:pb-3 reveal:pt-3 tabbed:px-3 tabbed:pt-6 landscape:grid-cols-[auto_1fr] landscape:grid-rows-[auto_1fr] landscape:pt-2 landscape:pb-2">
          <GaugeTabsSlot>
            <WindowTabs value={window} onChange={changeWindow} />
          </GaugeTabsSlot>
          <SpeedoDial
            report={report}
            onRefreshed={onRefreshed}
            // Default assumes bare (no stack to share room with): fill the
            // panel, minus this grid's own (bare-sized) overhead - 8px of
            // horizontal padding (p-1 both sides), 8px of vertical (p-1 both
            // sides, gap-0 so the two row gaps cost nothing) - capped. cqw/cqh
            // read the PANEL's box, not this grid's, so that overhead has to be
            // subtracted explicitly or the dial computes bigger than the room
            // actually left for it and overflows past the panel's own edge.
            //
            // Once `reveal` clears (the fuel gauge shows below the dial, but
            // not yet the tab row - see index.css / gauge-stack.tsx), this
            // reserves ~82px of height for that fuel gauge. Once `tabbed`
            // clears too (the tab row is back, above the dial), it reserves
            // ~130px - tabs on top AND fuel below. Once the panel goes row
            // instead, reserve ~110px of WIDTH for the tabs + horizontal fuel
            // bar (fuel-bar.tsx) docked beside it - a flat bar needs far less
            // room than the portrait arc, which is why the dial can stay large
            // here. The `landscape` width is forced (`!`): it must beat the
            // `tabbed` column reserve (100cqh − 130px, meaningless once the
            // stack sits BESIDE the dial, not below), and Tailwind's ordering of
            // two same-property arbitrary utilities isn't guaranteed by
            // definition order once their value strings change.
            // `place-self-center` centers the dial within its grid cell on
            // whichever axis it doesn't fill.
            //
            // No pointer-events-auto here (unlike GaugeTabsSlot/GaugeStack):
            // RadialGauge already manages pointer-events granularly inside
            // itself (ticks set their own inline value; the center/badge
            // wrappers are pointer-events-none with only their actual
            // clickable content opting into auto) - none of it depends on this
            // outer box being auto. Making this whole box auto reclaimed its
            // entire square footprint for hit-testing, including the empty
            // corners around the circular ring, which is exactly the area
            // meant to stay draggable.
            className="col-start-1 row-start-2 w-[min(calc(100cqw_-_8px),calc(100cqh_-_8px),216px)] place-self-center reveal:w-[min(90cqw,calc(100cqh_-_82px),216px)] tabbed:w-[min(90cqw,calc(100cqh_-_140px),216px)] landscape:col-start-1 landscape:row-start-1 landscape:row-span-2 landscape:w-[min(calc(100cqw_-_110px),calc(100cqh_-_16px),216px)]!"
          />
          <GaugeStack>
            <FuelGauge report={report} />
            {/* Footer + explainer anchored to the BOTTOM of the stack (mt-auto),
              not floating right under the fuel gauge: in a tall column the fuel
              stays grounded under the dial while these two sink to the panel's
              base, so shrinking the height closes the gap BETWEEN them instead
              of stranding a big empty margin below them. In a row they sit in
              the centered column beside the dial, so the pull-to-bottom is off. */}
            <div className="mt-auto flex w-full flex-col items-center gap-3 landscape:mt-0 landscape:items-start">
              <TokenFooter report={report} />
              <ExplainerPanel fallback={fallback} />
            </div>
          </GaugeStack>
        </div>
      </div>
    </GaugeModeProvider>
  );
}
