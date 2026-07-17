// The specimen catalog for the design-system Responsive gallery: a dense,
// ordered sweep of panel shapes, clustered by orientation family so the layout
// tiers can be found empirically (where does portrait want to shed text? where
// does landscape stop being viable?) rather than guessed from thresholds.
//
// Each cluster sweeps one family continuously (portrait: width asc then height;
// landscape: height asc then width; square: side asc) so the layout morph reads
// left-to-right and any natural break reveals itself. Dimensions are raw px, the
// panel's own box - exactly what the container queries measure.

export type WH = [width: number, height: number];

export interface SizeCluster {
  title: string;
  hint: string;
  sizes: WH[];
}

// Portrait: taller than wide. Swept from the narrowest slivers to a big panel,
// widening in bands; two-to-four heights per width to see the vertical reveal.
const PORTRAIT: SizeCluster = {
  title: "Portrait",
  hint: "taller than wide · width ↑ →",
  sizes: [
    [90, 240],
    [90, 400],
    [120, 180],
    [120, 260],
    [120, 360],
    [120, 460],
    [150, 200],
    [150, 300],
    [150, 420],
    [150, 500],
    [180, 240],
    [180, 340],
    [180, 460],
    [210, 280],
    [210, 400],
    [210, 500],
    [250, 320],
    [250, 440],
    [300, 360],
    [300, 480],
    [340, 420],
    [340, 500],
    [400, 480],
  ],
};

// Landscape: wider than tall. Swept from the flattest pills up to near-square,
// heightening in bands; widths per band to see when the row becomes viable.
const LANDSCAPE: SizeCluster = {
  title: "Landscape",
  hint: "wider than tall · height ↑ →",
  sizes: [
    [340, 70],
    [420, 75],
    [500, 80],
    [340, 100],
    [420, 110],
    [500, 125],
    [300, 150],
    [360, 150],
    [440, 160],
    [520, 170],
    [320, 200],
    [400, 210],
    [480, 230],
    [340, 250],
    [440, 255],
    [300, 270],
    [360, 290],
    [420, 300],
  ],
};

// Square-ish: width ≈ height, from below the OS minimum up. The diagonal the two
// families meet on - useful for checking neither claims a shape it can't fill.
const SQUARE: SizeCluster = {
  title: "Square & bare",
  hint: "side ↑ →",
  sizes: [
    [80, 80],
    [110, 110],
    [140, 140],
    [170, 170],
    [200, 200],
    [240, 240],
    [300, 300],
  ],
};

export const SIZE_CLUSTERS: SizeCluster[] = [PORTRAIT, LANDSCAPE, SQUARE];
