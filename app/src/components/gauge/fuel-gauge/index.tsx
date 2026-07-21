// The reality anchor under (portrait) or beside (landscape) the speedometer: a
// mini fuel gauge reading FUEL LEFT before the cap (100 − usage), so it drains
// as you spend - full reads green, near-empty red, the ticks that will drain by
// reset dimmed. Two shapes, one set of figures (fuel-data.ts): a shallow ARC in
// a column (fuel-arc.tsx), a flat horizontal BAR in a row (fuel-bar.tsx). Both
// compositions mount; CSS (`landscape`) shows one.
//
// The two shapes seat the readout differently: the column stacks the percent +
// reset UNDER the arc (and drops them when the row is too short to seat them
// uncropped); the row runs [pump icon · bar · percent] on one line with "Reset"
// under it, all kept - the horizontal bar is thin enough that even a squat
// landscape window has room for its full readout.

import type { GaugeReport } from "@core/types";
import { NumberFlow } from "@/components/ui/number-flow";
import { formatEta } from "../format";
import { useGaugeMode } from "../modes/context";
import { FuelArc } from "./fuel-arc";
import { FuelBar } from "./fuel-bar";
import { type FuelData, fuelData } from "./fuel-data";
import { FuelIcon } from "./fuel-icon";

/** The percent-left number. Small: a supporting figure, not the headline (that's
 * the speedometer). Reads "no signal" rather than a fake level. */
function FuelPercent({
  fuelLeft,
  signalAvailable,
}: {
  fuelLeft: number;
  signalAvailable: boolean;
}) {
  return (
    <span className="whitespace-nowrap text-[10px] text-foreground/55 tabular-nums">
      {signalAvailable ? (
        <NumberFlow value={Math.round(fuelLeft)} suffix="% left" />
      ) : (
        <span className="text-[10px] text-muted-foreground">no signal</span>
      )}
    </span>
  );
}

/** Where the current rate lands usage by reset, with the reset ETA folded into
 * one line ("62% by reset (1j16h)") instead of a separate "Reset …" caption -
 * shorter, and doesn't repeat "reset" twice. Falls back to the plain ETA when
 * there's no signal to project a landing from (never a dash). */
function LandingCaption({
  landingUsagePct,
  hoursUntilReset,
  signalAvailable,
}: {
  landingUsagePct: number;
  hoursUntilReset: number;
  signalAvailable: boolean;
}) {
  const eta = formatEta(hoursUntilReset);
  if (!signalAvailable) {
    return <span className="text-[10px] text-muted-foreground/70">Reset {eta}</span>;
  }
  return (
    <span className="whitespace-nowrap text-[10px] text-muted-foreground/70">
      <NumberFlow value={Math.round(landingUsagePct)} suffix={`% by reset (${eta})`} />
    </span>
  );
}

/** Portrait: the shallow arc, with the percent + reset stacked under it. Both
 * drop together once the column is too short to seat them below the arc. */
function FuelColumn({ data }: { data: FuelData }) {
  return (
    <div className="flex w-full flex-col items-center gap-0.5 landscape:hidden">
      <FuelArc data={data} />
      <div className="flex flex-col items-center gap-0.5 [@container_stack_(max-height:54px)]:hidden">
        <FuelPercent fuelLeft={data.fuelLeft} signalAvailable={data.signalAvailable} />
        <LandingCaption
          landingUsagePct={data.landingUsagePct}
          hoursUntilReset={data.hoursUntilReset}
          signalAvailable={data.signalAvailable}
        />
      </div>
    </div>
  );
}

/** Landscape: pump icon, bar, and percent on one line (the bar flexing to fill
 * between them), with the reset caption under it - a car's fuel gauge laid flat. */
function FuelRow({ data }: { data: FuelData }) {
  return (
    <div className="hidden w-full max-w-[240px] flex-col gap-0.5 landscape:flex">
      <div className="flex items-center gap-1.5">
        <FuelIcon dry={data.dry} />
        <FuelBar data={data} />
        <FuelPercent fuelLeft={data.fuelLeft} signalAvailable={data.signalAvailable} />
      </div>
      <LandingCaption
        landingUsagePct={data.landingUsagePct}
        hoursUntilReset={data.hoursUntilReset}
        signalAvailable={data.signalAvailable}
      />
    </div>
  );
}

export function FuelGauge({ report }: { report: GaugeReport }) {
  // Pairs the fuel projection with whichever pace smoothing is on screen (the
  // dial's live/smooth toggle) — else the fuel gauge could show a landing that
  // disagrees with the needle it sits under.
  const { mode } = useGaugeMode();
  const landingPct = mode.id === "smooth" ? report.smoothLandingPct : report.landingPct;
  const data = fuelData(report, landingPct);
  return (
    <div className="flex w-full flex-col items-center gap-0.5 landscape:items-start">
      <FuelColumn data={data} />
      <FuelRow data={data} />
    </div>
  );
}
