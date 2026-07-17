import { describe, expect, it } from "vitest";
import type { ZoneBound } from "../types";
import { zoneOf } from "./zone-of";
import { ZONES } from "./zones";

// zoneOf is axis-agnostic; synthetic monotonic cut points exercise the walk.
const boundsFrom = (cuts: number[]): ZoneBound[] =>
  ZONES.map((z, i) => ({ id: z.id, low: cuts[i], high: cuts[i + 1] }));
const bounds = boundsFrom([0, 0.33, 0.73, 85, 100, 115, 130]);

describe("zoneOf", () => {
  it("classifies values within each zone", () => {
    expect(zoneOf(0.1, bounds)).toBe("underfarming");
    expect(zoneOf(0.5, bounds)).toBe("coasting");
    expect(zoneOf(40, bounds)).toBe("maxxing");
    expect(zoneOf(90, bounds)).toBe("redlining");
    expect(zoneOf(107, bounds)).toBe("turbo");
    expect(zoneOf(120, bounds)).toBe("nitro");
  });

  it("puts boundary values in the upper zone", () => {
    expect(zoneOf(0.73, bounds)).toBe("maxxing");
    expect(zoneOf(85, bounds)).toBe("redlining");
    expect(zoneOf(100, bounds)).toBe("turbo");
    expect(zoneOf(115, bounds)).toBe("nitro");
  });

  it("treats anything past the far bound as nitro", () => {
    expect(zoneOf(130, bounds)).toBe("nitro");
  });

  it("skips an empty zone", () => {
    const light = boundsFrom([0, 40, 92, 92, 100, 115, 130]); // maxxing empty at 92
    expect(zoneOf(92, light)).toBe("redlining");
  });
});
