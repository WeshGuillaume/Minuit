import { describe, expect, it } from "vitest";
import type { UsageEvent } from "../types";
import { windowBreakdown } from "./window-breakdown";

const H = 3_600_000;

const ev = (over: Partial<UsageEvent>): UsageEvent => ({
  uuid: String(Math.random()),
  timestamp: 0,
  model: "claude-opus-4-8",
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite5m: 0,
  cacheWrite1h: 0,
  ...over,
});

describe("windowBreakdown", () => {
  it("sums each tier and totals across them", () => {
    const b = windowBreakdown([
      ev({ input: 100, cacheRead: 900 }),
      ev({ output: 50 }),
      ev({ cacheWrite5m: 200, cacheWrite1h: 100 }),
    ]);
    expect(b.input).toBe(100);
    expect(b.output).toBe(50);
    expect(b.cacheRead).toBe(900);
    expect(b.cacheWrite5m).toBe(200);
    expect(b.cacheWrite1h).toBe(100);
    expect(b.total).toBe(1350);
  });

  it("rates FRESH throughput (excl. cacheRead) over ACTIVE hours", () => {
    // Two turns in hour 0, one in hour 1 → 2 active hours, not 3 turns nor 2h span.
    // cacheRead is huge but excluded from the rate; it still counts toward total.
    const b = windowBreakdown([
      ev({ timestamp: 0, input: 400, cacheRead: 10_000 }),
      ev({ timestamp: H / 2, input: 200 }),
      ev({ timestamp: H, input: 750 }),
    ]);
    expect(b.total).toBe(11_350); // includes cacheRead
    expect(b.perHour).toBe(675); // (1350 fresh) / 2 active hours — cacheRead excluded
  });

  it("counts cache CREATION as a miss, not a hit, in the denominator", () => {
    // 900 read, 100 fresh input, 100 written to cache (cold) → 900 / 1100.
    const b = windowBreakdown([ev({ input: 100, cacheRead: 900, cacheWrite5m: 100 })]);
    expect(b.cacheHitRate).toBeCloseTo(0.818, 3);
  });

  it("is all-zero for an empty window, with no division by zero", () => {
    const b = windowBreakdown([]);
    expect(b.total).toBe(0);
    expect(b.perHour).toBe(0);
    expect(b.cacheHitRate).toBe(0);
  });
});
