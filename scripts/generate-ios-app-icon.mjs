/**
 * Renders apps/mobile/src/assets/icon.png (1024×1024) from dentveerse-mark.svg.
 *
 * Default: mark only on transparent canvas (no cream/white box) — like full-bleed
 * brand icons. Set ICON_BG=#FAF9F7 to bake a solid background instead.
 *
 * Run (needs sharp): SHARP_PKG=/path/to/sharp node scripts/generate-ios-app-icon.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const svgPath = join(root, 'apps/web/public/dentveerse-mark.svg');
const outPath = join(root, 'apps/mobile/src/assets/icon.png');

const SIZE = 1024;
/** ~92% — large mark, small inset for iOS squircle clip. */
const MARK_SCALE = Number(process.env.ICON_MARK_SCALE ?? 0.92);
const markSize = Math.round(SIZE * MARK_SCALE);
const BACKGROUND = process.env.ICON_BG?.trim();

const require = createRequire(import.meta.url);
const sharp = require(process.env.SHARP_PKG ?? 'sharp');
const svg = readFileSync(svgPath);

const markPng = await sharp(svg)
  .resize(markSize, markSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

if (BACKGROUND) {
  const icon = await sharp({
    create: { width: SIZE, height: SIZE, channels: 3, background: BACKGROUND },
  })
    .composite([{ input: markPng, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toBuffer();
  await sharp(icon).toFile(outPath);
} else {
  await sharp({
    create: {
      width: SIZE,
      height: SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: markPng, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(outPath);
}

console.log(
  `Wrote ${outPath} (${SIZE}×${SIZE}, mark ${markSize}px, bg=${BACKGROUND ?? 'transparent'})`
);
