// activeFactor: how much of a window's remaining wall-clock time counts as
// "active". Work hours (config work.hoursPerDay) only compress MULTI-DAY
// horizons — a weekly cap spans your nights/weekends, so spreading its headroom
// over 8h/day is right. A sub-day window (the rolling 5-hour cap resetting in a
// couple of hours) does NOT span off-hours: you won't sleep before it resets, so
// its headroom is spread over the wall clock (factor 1). Without this, the 5h
// pace reads "underfarming" while the raw-usage projection says you'll cap out —
// the two disagree because only one compressed the hours.

const DAY_SECONDS = 86_400;

export const activeFactor = (windowSeconds: number, workHoursPerDay: number): number =>
  windowSeconds >= DAY_SECONDS ? workHoursPerDay / 24 : 1;
