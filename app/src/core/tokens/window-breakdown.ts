// windowBreakdown: aggregate the five token tiers over a window, plus the two
// derived signals the UI reads directly: throughput (tokens/hour) and cache hit
// rate. Same fold-the-events shape as windowApiValue, but COUNTING tokens rather
// than pricing them (dedup + windowing are already done upstream in the adapter).
//
// perHour is FRESH tokens (everything except cacheRead) over ACTIVE hours:
// distinct clock-hours that carry at least one turn, not wall-clock elapsed, to
// match hoursLeft's "at your working pace" basis (an idle afternoon must not
// dilute the rate). cacheRead is excluded on purpose: it is re-read of already
// cached context (~10× cheaper, not new work) and dwarfs every other tier
// (~96% of `total`), so a total-based rate reads as a meaningless 20M/h. `total`
// still sums every tier for the footer, which shows the tiers apart.
//
// cacheHitRate = cacheRead / (cacheRead + input + cacheWrite): the share of all
// input-side tokens that were served from cache. Cache CREATION tokens belong in
// the denominator; they are input processed cold (a miss that is then stored),
// not a hit; leaving them out pins the rate at ~100%. This is the single biggest
// lever on cost, and the anchor the future cache coach hangs its advice on.

import type { TokenBreakdown, TokenUsage, UsageEvent } from "../types";

const H = 3_600_000; // ms per hour

const ZERO: TokenUsage = { input: 0, output: 0, cacheRead: 0, cacheWrite5m: 0, cacheWrite1h: 0 };

export const windowBreakdown = (events: UsageEvent[]): TokenBreakdown => {
  const sum = events.reduce<TokenUsage>(
    (a, e) => ({
      input: a.input + e.input,
      output: a.output + e.output,
      cacheRead: a.cacheRead + e.cacheRead,
      cacheWrite5m: a.cacheWrite5m + e.cacheWrite5m,
      cacheWrite1h: a.cacheWrite1h + e.cacheWrite1h,
    }),
    ZERO,
  );

  const total = sum.input + sum.output + sum.cacheRead + sum.cacheWrite5m + sum.cacheWrite1h;
  const fresh = total - sum.cacheRead; // input + output + cache creation
  const activeHours = new Set(events.map((e) => Math.floor(e.timestamp / H))).size;
  const cacheDenom = sum.cacheRead + sum.input + sum.cacheWrite5m + sum.cacheWrite1h;

  return {
    ...sum,
    total,
    perHour: activeHours > 0 ? fresh / activeHours : 0,
    cacheHitRate: cacheDenom > 0 ? sum.cacheRead / cacheDenom : 0,
  };
};
