import { describe, expect, it } from "vitest";
import type { ModelPrice, TokenUsage } from "../types";
import { tokenCost } from "./token-cost";

// Opus-like rates (USD / million tokens), deliberately distinct per tier.
const price: ModelPrice = {
  input: 15,
  output: 75,
  cacheRead: 1.5,
  cacheWrite5m: 18.75,
  cacheWrite1h: 30,
};

const zero: TokenUsage = { input: 0, output: 0, cacheRead: 0, cacheWrite5m: 0, cacheWrite1h: 0 };

describe("tokenCost", () => {
  it("prices each tier independently", () => {
    expect(tokenCost({ ...zero, input: 1_000_000 }, price)).toBeCloseTo(15, 10);
    expect(tokenCost({ ...zero, output: 1_000_000 }, price)).toBeCloseTo(75, 10);
    expect(tokenCost({ ...zero, cacheRead: 1_000_000 }, price)).toBeCloseTo(1.5, 10);
  });

  it("distinguishes 5-minute from 1-hour cache writes (different rates)", () => {
    const w5 = tokenCost({ ...zero, cacheWrite5m: 1_000_000 }, price);
    const w1 = tokenCost({ ...zero, cacheWrite1h: 1_000_000 }, price);
    expect(w5).toBeCloseTo(18.75, 10);
    expect(w1).toBeCloseTo(30, 10);
    expect(w5).not.toBeCloseTo(w1, 5);
  });

  it("sums all five tiers", () => {
    const usage: TokenUsage = {
      input: 200_000,
      output: 50_000,
      cacheRead: 1_000_000,
      cacheWrite5m: 100_000,
      cacheWrite1h: 20_000,
    };
    // 0.2*15 + 0.05*75 + 1*1.5 + 0.1*18.75 + 0.02*30
    // = 3 + 3.75 + 1.5 + 1.875 + 0.6 = 10.725
    expect(tokenCost(usage, price)).toBeCloseTo(10.725, 10);
  });

  it("is zero for no tokens", () => {
    expect(tokenCost(zero, price)).toBe(0);
  });
});
