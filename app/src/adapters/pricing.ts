// Load pricing: the bundled default, shallow-merged with an optional personal
// override at `~/.cc-gauge/pricing.json` (edited when Anthropic changes plans or
// rates). A missing or malformed override silently keeps the default.

import type { Pricing } from '@core/types';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { gaugePath } from './paths';
import { DEFAULT_PRICING } from './pricing.default';

export const loadPricing = async (): Promise<Pricing> => {
  try {
    const override = JSON.parse(await readTextFile(await gaugePath('pricing.json')));
    return { ...DEFAULT_PRICING, ...(override as Partial<Pricing>) };
  } catch {
    return DEFAULT_PRICING;
  }
};
