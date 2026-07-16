// Presentation-only formatters for the gauge center + footer. No domain logic:
// they turn already-computed report numbers into short glanceable strings.

/** Hours → a clock/calendar ETA: "45min", "3h05", "3h", "1j19h", "2j". */
export const formatEta = (hours: number): string => {
  if (hours < 1) return `${Math.max(0, Math.round(hours * 60))}min`;
  if (hours < 24) {
    const whole = Math.floor(hours);
    const mins = Math.round((hours - whole) * 60);
    if (mins === 60) return `${whole + 1}h`;
    return mins ? `${whole}h${String(mins).padStart(2, "0")}` : `${whole}h`;
  }
  const days = Math.floor(hours / 24);
  const remH = Math.round(hours - days * 24);
  if (remH === 24) return `${days + 1}j`;
  return remH ? `${days}j${remH}h` : `${days}j`;
};

/** Token count → compact magnitude: "1.2M", "340k", "512". */
export const formatTokens = (n: number): string => {
  const abs = Math.abs(n);
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
  if (abs >= 1e3) return `${Math.round(n / 1e3)}k`;
  return String(Math.round(n));
};

/** 0..1 fraction → whole percent: "78%". */
export const formatPct01 = (x: number): string => `${Math.round(x * 100)}%`;
