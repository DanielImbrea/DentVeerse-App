/**
 * Renders apps/mobile/src/assets/icon.png (1024×1024) from dentveerse-mark.svg.
 * Run: node scripts/generate-ios-app-icon.mjs
 * Requires: pnpm dlx sharp (installed on the fly if missing).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const svgPath = join(root, 'apps/web/public/dentveerse-mark.svg');
const outPath = join(root, 'apps/mobile/src/assets/icon.png');

const SIZE = 1024;
/** Inset so the mark survives iOS squircle mask (~12% safe zone). */
const MARK_SCALE = 0.76;
const markSize = Math.round(SIZE * MARK_SCALE);
const BACKGROUND = '#FAF9F7';

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const sharp = require(process.env.SHARP_PKG ?? 'sharp');
const svg = readFileSync(svgPath);

const markPng = await sharp(svg)
  .resize(markSize, markSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

const icon = await sharp({
  create: { width: SIZE, height: SIZE, channels: 3, background: BACKGROUND },
})
  .composite([{ input: markPng, gravity: 'center' }])
  .png({ compressionLevel: 9 })
  .toBuffer();

await sharp(icon).toFile(outPath);

console.log(`Wrote ${outPath} (${SIZE}×${SIZE})`);
