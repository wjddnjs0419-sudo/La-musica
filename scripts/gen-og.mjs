import sharp from "sharp";
import { writeFileSync } from "node:fs";

const STRIPES = 7;
const offsets = Array.from(
  { length: STRIPES },
  (_, i) => -23 + (46 / (STRIPES - 1)) * i,
);
const ribbonPath = (o) =>
  `M${40 + o} 210 L${40 + o} 118 A${44 - o} ${44 - o} 0 0 1 ${128 - o} 118 L${128 - o} 162 A${44 + o} ${44 + o} 0 0 0 ${216 + o} 162 L${216 + o} 118 A${44 - o} ${44 - o} 0 0 1 ${304 - o} 118 L${304 - o} 210`;

// OG canvas 1200x630. Logo group scaled & centered, text below.
const W = 1200, H = 630;
const paths = offsets
  .map(
    (o) =>
      `<path d="${ribbonPath(o)}" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`,
  )
  .join("");

// logo viewBox "3 31 338 199" -> width 338 height 199. Scale to ~280 wide.
const scale = 280 / 338;
const logoW = 338 * scale;
const logoX = (W - logoW) / 2;
const logoY = 200;

const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="#05070d"/>
  <g transform="translate(${logoX} ${logoY}) scale(${scale}) translate(-3 -31)">${paths}</g>
  <text x="${W / 2}" y="490" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="84" fill="#ffffff" letter-spacing="2">La musica</text>
</svg>`;

writeFileSync("scripts/og-preview.svg", svg);
await sharp(Buffer.from(svg)).png().toFile("scripts/og-preview.png");
console.log("done");
