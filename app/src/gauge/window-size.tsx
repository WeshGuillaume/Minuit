// Dev-only live readout of the webview's logical size, tracked via the browser
// `resize` event. Renders nothing in a production build (`import.meta.env.DEV`),
// so it costs nothing to ship. Pinned top-right (traffic lights own top-left).

import { useEffect, useState } from "react";

const read = () => ({ w: window.innerWidth, h: window.innerHeight });

export function WindowSize() {
  const [size, setSize] = useState(read);

  useEffect(() => {
    const onResize = () => setSize(read());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (!import.meta.env.DEV) return null;

  return (
    <span className="pointer-events-none fixed right-2 top-1.5 z-50 text-[11px] font-medium tabular-nums text-muted-foreground">
      {size.w} × {size.h}
    </span>
  );
}
