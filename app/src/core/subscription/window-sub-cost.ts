// windowSubCost — what the subscription costs for ONE WHOLE window.
//
// Formula:  windowSubCost = monthlyUsd × (windowSeconds / (monthDays × 86400))
// with monthDays = 30.44 (average calendar month). This is the fixed reference
// the profitability ratio divides by — a property of the window, NOT of how much
// time has elapsed inside it. See ratio/profitabilityRatio for why that matters.
//
// Examples: max20x ($200) over 7 days → 200·7/30.44 ≈ 46.00 $;
//           max20x over 5 h → 200·(5/24)/30.44 ≈ 1.37 $.

const SECONDS_PER_DAY = 86_400;

export const windowSubCost = (
  monthlyUsd: number,
  windowSeconds: number,
  monthDays = 30.44,
): number => monthlyUsd * (windowSeconds / (monthDays * SECONDS_PER_DAY));
