// Dev-only prototype of the EthicalAds text placement, a mini textual banner
// pinned to the bottom of the window. It mirrors the real `data-ea-type="text"`
// DOM (a body link + the "Ads by EthicalAds" callout) so the placement and
// styling match what the live client will render, but ships sample copy and
// never touches the network. Gated behind `import.meta.env.DEV`, so production
// builds render nothing until we wire the real client (see note at bottom).

// A handful of sample ads so the banner isn't visually frozen while iterating.
const SAMPLE_ADS = [
  {
    body: "Ship faster with Acme CI: parallel builds, zero config.",
    cta: "Start free",
    href: "https://example.com/acme",
  },
  {
    body: "Postgres that scales itself. Try Nova, no ops required.",
    cta: "Learn more",
    href: "https://example.com/nova",
  },
  {
    body: "Type-safe env vars across your whole stack with Vault.dev.",
    cta: "Get started",
    href: "https://example.com/vault",
  },
] as const;

// Rotate by day so a given dev session sees a stable ad, not a flicker on every
// render. (No Math.random, keeps the render deterministic.)
const pickAd = () => SAMPLE_ADS[Math.floor(Date.now() / 86_400_000) % SAMPLE_ADS.length];

export function AdBanner() {
  if (!import.meta.env.DEV) return null;

  const ad = pickAd();
  return (
    <aside
      title="EthicalAds placeholder (dev only)"
      className="mt-auto px-4 pb-0.5 text-center text-[11px] leading-snug text-muted-foreground"
    >
      <a
        href={ad.href}
        target="_blank"
        rel="noreferrer sponsored"
        className="hover:text-foreground transition-colors"
      >
        {ad.body} <span className="text-foreground/80 underline underline-offset-2">{ad.cta}</span>
      </a>{" "}
      <span className="text-[9px] uppercase tracking-wide text-muted-foreground/60">
        Ads by EthicalAds
      </span>
    </aside>
  );
}

// To go live later: load `https://media.ethicalads.io/media/client/ethicalads.min.js`
// (manual mode, `data-ea-manual`), render `<div data-ea-publisher="<id>"
// data-ea-type="text">`, and call `window.ethicalads.load()` on mount, then
// drop the DEV gate. See CLAUDE.md discussion for the Tauri origin caveat.
