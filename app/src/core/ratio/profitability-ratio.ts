// profitabilityRatio: how many times over the window's subscription cost the
// API-equivalent token value is.
//
// Formula:  ratio = apiValue / windowSubCost
//
// Spec decision (strict): the denominator is windowSubCost, NOT elapsedSubShare.
// The track's X axis is percent-of-cap; if the ratio's denominator moved with
// elapsed time, the "at a loss" toggle would slide along the track without any
// consumption, so a fixed visual point would mean two things at two moments.
// windowSubCost keeps the toggle a fixed landmark of the window.
//
// Guard: a non-positive windowSubCost (degenerate config) yields 0, not Infinity.

export const profitabilityRatio = (apiValue: number, windowSubCost: number): number =>
  windowSubCost > 0 ? apiValue / windowSubCost : 0;
