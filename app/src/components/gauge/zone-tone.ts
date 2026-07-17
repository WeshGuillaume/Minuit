// Which pace zones get a colored shimmer on their label, and in what hue. The
// two hottest zones stand out: Turbo runs blue, Nitro runs violet; every other
// zone keeps the plain brightness pulse ("default"). Shared by the dial caption,
// the center caption, and the explainer title.

import type { ZoneId } from "@core/types";
import type { ShimmerTone } from "./shimmer-text";

const ZONE_TONE: Partial<Record<ZoneId, ShimmerTone>> = {
  turbo: "turbo",
  nitro: "nitro",
};

/** The shimmer tone for a zone, defaulting to the plain pulse. */
export const zoneTone = (zone: ZoneId): ShimmerTone => ZONE_TONE[zone] ?? "default";
