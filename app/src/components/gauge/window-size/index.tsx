// Live WxH readout that surfaces only *while* the window is being resized, then
// fades out shortly after the drag stops. The browser `resize` event fires
// continuously during the drag, so we show on each tick and hide once they stop
// coming (debounced). Pinned top-right - traffic lights own top-left.

import { useWindowSize } from "./use-window-size";

export function WindowSize() {
  const { size, visible } = useWindowSize();

  return (
    <span
      className="pointer-events-none fixed right-2 top-1.5 z-50 text-[11px] font-medium tabular-nums text-muted-foreground transition-opacity duration-200"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {size.w} × {size.h}
    </span>
  );
}
