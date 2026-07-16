import { useEffect, useRef, useState } from "react";

const read = () => ({ w: window.innerWidth, h: window.innerHeight });
const HIDE_DELAY = 700;

/** Live window size, visible only while actively resizing (debounced hide). */
export function useWindowSize() {
  const [size, setSize] = useState(read);
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const onResize = () => {
      setSize(read());
      setVisible(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setVisible(false), HIDE_DELAY);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      clearTimeout(timer.current);
    };
  }, []);

  return { size, visible };
}
