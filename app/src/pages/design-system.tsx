// Canvas to develop and showcase the design system. First specimen: the shadcn
// Button (proves Tailwind + shadcn are wired). Add more component specimens here.

import { RadialGauge } from "@/components/ui/radial-gauge";

export default function DesignSystem() {
  return (
    <main className="flex min-h-screen flex-col">
      <nav className="mb-5 p-6 text-[13px]">
        <a href="#/" className="text-[#66aaff] no-underline hover:underline">
          ← Back to the gauge
        </a>
      </nav>

      <div className="flex flex-1 items-center justify-center p-6">
        <RadialGauge
          value={120}
          min={0}
          max={120}
          scaleLabels={[0, 30, 65, 100, 120]}
          formatLabel={(v) => `${v}%`}
          tickWidth={2}
          tickLength={10}
          glow={0.5}
          className="max-w-80"
        />
      </div>
    </main>
  );
}
