#!/usr/bin/env node
/*
 * Fails if a hex color literal or a Tailwind arbitrary color class shows up in
 * app source outside index.css. Biome has no built-in rule for this, so it's
 * a standalone check wired into `pnpm lint`. Color values belong in index.css
 * as `--*` custom properties; components/logic reference them by name (see
 * components/ui/pace-zone-colors.ts and core/track/segments.ts's colorToken).
 */

import { globSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const HEX_LITERAL = /#[0-9a-fA-F]{3,8}\b/;
const ARBITRARY_HEX_CLASS = /\[#[0-9a-fA-F]/;

const files = globSync("src/**/*.{ts,tsx}", { cwd: ROOT }).filter(
  (f) => !f.endsWith(".test.ts") && !f.endsWith(".test.tsx"),
);

const offenders = [];
for (const file of files) {
  const text = readFileSync(join(ROOT, file), "utf8");
  text.split("\n").forEach((line, i) => {
    if (HEX_LITERAL.test(line) || ARBITRARY_HEX_CLASS.test(line)) {
      offenders.push(`${file}:${i + 1}: ${line.trim()}`);
    }
  });
}

if (offenders.length > 0) {
  console.error("Raw hex colors found outside index.css — use a --* token instead:\n");
  for (const o of offenders) console.error(`  ${o}`);
  console.error(
    "\nAdd a semantic token to src/index.css and reference it (Tailwind class, var(), or a colorToken resolver like components/ui/pace-zone-colors.ts).",
  );
  process.exit(1);
}
