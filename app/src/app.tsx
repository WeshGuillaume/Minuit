// Tiny dependency-free hash router: the gauge page, plus an empty Design System
// page for developing/showcasing components. New pages = one more branch here.

import { useEffect, useState } from "react";
import { UpdateBanner } from "./components/update-banner";
import DesignSystem from "./pages/design-system";
import GaugePage from "./pages/gauge-page";

const useHashRoute = (): string => {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return hash;
};

export default function App() {
  const route = useHashRoute();
  return (
    <>
      {route === "#/design" ? <DesignSystem /> : <GaugePage />}
      <UpdateBanner />
    </>
  );
}
