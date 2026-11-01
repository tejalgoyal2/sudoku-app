// Draws the logo and writes every icon the app needs. The logo is one 3×3 box of the board:
// two printed digits and a blue 9 the player just placed in the selected cell, on the app's blue.
// Digits are Figtree outlines (centred, cap height 100), so the SVG needs no font.
import sharp from "sharp";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "icons");
mkdirSync(outDir, { recursive: true });

const GLYPHS = {
  "9": "M-0.5-51.7L-0.5-51.7Q9.5-51.7 16.6-48.2Q23.8-44.7 28.4-38.4Q32.9-32.1 35.1-23.8Q37.4-15.4 37.4-5.6L37.4-5.6Q37.4 5.3 35.1 15.5Q32.8 25.7 27.9 33.9Q23.1 42.1 15 46.9Q6.9 51.7-4.6 51.7L-4.6 51.7Q-12.8 51.7-20.4 49.4Q-27.9 47.1-34.1 42.9L-34.1 42.9L-23.1 26Q-18.6 29-13.6 30.3Q-8.6 31.6-4.8 31.6L-4.8 31.6Q4.6 31.6 10.4 23Q16.2 14.4 15.9-4.6L15.9-4.6L20.6-1.9Q17.2 5.4 10.7 10.1Q4.2 14.7-4.9 14.7L-4.9 14.7Q-14.4 14.7-21.7 10.1Q-29.1 5.6-33.2-2.2Q-37.4-10.0-37.4-19.4L-37.4-19.4Q-37.4-28.9-32.9-36.1Q-28.4-43.4-20.1-47.6Q-11.8-51.7-0.5-51.7ZM-0.6-32.4L-0.6-32.4Q-4.6-32.4-7.8-30.6Q-10.9-28.7-12.7-25.6Q-14.5-22.4-14.5-18.3L-14.5-18.3Q-14.5-14.3-12.7-10.9Q-10.9-7.6-7.8-5.6Q-4.6-3.7-0.6-3.7L-0.6-3.7Q3.4-3.7 6.5-5.6Q9.6-7.6 11.5-10.9Q13.4-14.3 13.4-18.3L13.4-18.3Q13.4-22.4 11.5-25.6Q9.6-28.7 6.5-30.6Q3.4-32.4-0.6-32.4Z",
  "5": "M-0.1 50.9L-0.1 50.9Q-6.9 50.9-14.1 48.6Q-21.4 46.3-27.1 41.7Q-32.9 37.1-35.6 30.4L-35.6 30.4L-17.8 25.1Q-14.6 29.7-10.3 31.9Q-5.9 34.0-1.2 34.0L-1.2 34.0Q6.2 34.0 10.9 29.5Q15.5 25.0 15.5 17.4L15.5 17.4Q15.5 10.4 11 5.7Q6.5 1-0.9 1L-0.9 1Q-5.4 1-9.1 3.0Q-12.8 5.0-14.8 7.7L-14.8 7.7L-32.4 3.9L-26.4-50.9L30.2-50.9L30.2-33.1L-9.6-33.1L-12.5-9.1Q-8.6-11.3-3.9-12.6Q0.8-14 6.2-13.9L6.2-13.9Q14.4-13.9 21.1-9.9Q27.8-6 31.7 0.8Q35.6 7.6 35.6 16.6L35.6 16.6Q35.6 26.7 31.1 34.4Q26.5 42.1 18.5 46.5Q10.5 50.9-0.1 50.9Z",
  "3": "M0.4 51.7L0.4 51.7Q-8.5 51.7-15.6 49.1Q-22.8 46.4-27.6 41.5Q-32.4 36.6-34.2 29.9L-34.2 29.9L-16.2 24.6Q-15.2 26.3-13.5 28.8Q-11.8 31.3-8.8 33Q-5.8 34.7-0.9 34.7L-0.9 34.7Q6.2 34.7 10.4 30.8Q14.6 26.9 14.6 20.6L14.6 20.6Q14.6 16.3 12.5 13Q10.4 9.7 5.6 7.9Q0.8 6.1-6.9 6.1L-6.9 6.1L-12.9 6.1L-12.9-9.9L-6.9-9.9Q3.1-9.9 7.9-13.3Q12.8-16.7 12.8-22.7L12.8-22.7Q12.8-26.1 11.1-28.9Q9.4-31.6 6.2-33.1Q3.1-34.7-1.1-34.7L-1.1-34.7Q-3.8-34.7-6.6-33.8Q-9.5-32.9-11.9-30.8Q-14.2-28.7-15.6-24.9L-15.6-24.9L-33.4-30.1Q-31.4-37.1-26.4-41.9Q-21.5-46.7-14.6-49.2Q-7.8-51.7-0.5-51.7L-0.5-51.7Q8.8-51.7 16.2-48.2Q23.6-44.7 27.9-38.6Q32.2-32.4 32.2-24.4L32.2-24.4Q32.2-16.6 27.9-11.1Q23.5-5.6 16.2-2.3L16.2-2.3Q24.5 1.6 29.4 7.9Q34.2 14.3 34.2 22.9L34.2 22.9Q34.2 31.9 29.5 38.4Q24.8 44.9 17.1 48.3Q9.4 51.7 0.4 51.7Z",
};
const BLUE = "#2C5BD0", INK = "#1D1D1B";
const digit = (d, cx, cy, h, fill) => `<path transform="translate(${cx} ${cy}) scale(${h / 100})" d="${GLYPHS[d]}" fill="${fill}"/>`;

// `s` is the board's size on a 512 canvas; `radius` rounds the canvas (0 for full-bleed icons).
export function logoSvg({ s = 344, radius = 115 } = {}) {
  const x = (512 - s) / 2, c = s / 3, k = s / 344;
  const lines = [1, 2].map((n) => `<line x1="${x + n * c}" y1="${x}" x2="${x + n * c}" y2="${x + s}"/><line x1="${x}" y1="${x + n * c}" x2="${x + s}" y2="${x + n * c}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${radius}" fill="${BLUE}"/>
  <rect x="${x}" y="${x}" width="${s}" height="${s}" rx="${40 * k}" fill="#FFFFFF"/>
  <rect x="${x + c}" y="${x + c}" width="${c}" height="${c}" fill="#D6E1FA"/>
  <g stroke="${INK}" stroke-opacity="0.14" stroke-width="${6 * k}">${lines}</g>
  ${digit("5", x + c / 2, x + c / 2, 58 * k, INK)}
  ${digit("9", x + 1.5 * c, x + 1.5 * c, 70 * k, BLUE)}
  ${digit("3", x + 2.5 * c, x + 2.5 * c, 58 * k, INK)}
</svg>
`;
}

const png = (svg, size, name) => sharp(Buffer.from(svg)).resize(size, size).png().toFile(join(outDir, name));

// Browser tab and the manifest's regular icons: rounded, transparent corners.
const rounded = logoSvg();
writeFileSync(join(root, "public", "favicon.svg"), rounded);
await png(rounded, 192, "icon-192.png");
await png(rounded, 512, "icon-512.png");
// iOS rounds home-screen icons itself, so it gets a full square.
await png(logoSvg({ radius: 0 }), 180, "apple-touch-icon.png");
// Android crops maskable icons to a circle or squircle: keep the board inside the middle 80%.
await png(logoSvg({ radius: 0, s: 270 }), 512, "maskable-512.png");

console.log("Icons written to public/ and public/icons/");
