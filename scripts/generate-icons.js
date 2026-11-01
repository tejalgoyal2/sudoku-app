// Draws the logo and writes every icon the app needs. The logo is two cells of a row: a 6 that
// was given (outlined) and a 7 you just placed (filled amber). Yes, 67.
// It sits on near-black on purpose: iOS makes its own dark and tinted versions of web-app icons
// and keeps the light shapes, so light-on-dark artwork looks the same in every mode.
// Digits are Figtree ExtraBold outlines (centred, cap height 100), so the SVG needs no font.
import sharp from "sharp";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "icons");
mkdirSync(outDir, { recursive: true });

const GLYPHS = {
  "6": "M0.6 51.7L0.6 51.7Q-9.4 51.7-16.6 48.1Q-23.7 44.6-28.3 38.3Q-32.9 32-35.1 23.6Q-37.3 15.3-37.3 5.6L-37.3 5.6Q-37.3-5.3-35.1-15.6Q-32.9-25.9-27.9-34.0Q-23.0-42.1-14.9-46.9Q-6.9-51.7 4.7-51.7L4.7-51.7Q12.9-51.7 20.4-49.4Q28-47.1 34.1-42.9L34.1-42.9L23-26.0Q18.6-29.0 13.6-30.4Q8.6-31.7 4.7-31.7L4.7-31.7Q-4.7-31.7-10.4-23.1Q-16.1-14.4-16.0 4.6L-16.0 4.6L-20.6 1.9Q-17.3-5.6-10.7-10.1Q-4.1-14.7 4.9-14.7L4.9-14.7Q14.4-14.7 21.7-10.1Q29-5.6 33.1 2.1Q37.3 9.9 37.3 19.4L37.3 19.4Q37.3 28.7 32.8 36.0Q28.3 43.3 20.1 47.5Q11.9 51.7 0.6 51.7ZM0.7 32.4L0.7 32.4Q4.6 32.4 7.7 30.6Q10.9 28.7 12.6 25.5Q14.4 22.3 14.4 18.3L14.4 18.3Q14.4 14.1 12.6 10.9Q10.9 7.6 7.7 5.6Q4.6 3.7 0.7 3.7L0.7 3.7Q-3.3 3.7-6.5 5.6Q-9.7 7.6-11.6 10.9Q-13.4 14.1-13.4 18.3L-13.4 18.3Q-13.4 22.3-11.6 25.5Q-9.7 28.7-6.5 30.6Q-3.3 32.4 0.7 32.4Z",
  "7": "M-0.6 50.0L-26.1 50.0L10.6-28.9L-36.1-28.9L-36.1-50.0L36.1-50.0L36.1-33.4L-0.6 50.0Z",
};
export const COLORS = { bg: "#141413", cream: "#F3F0E8", amber: "#F2B84B", onAmber: "#1B1406" };
const digit = (d, cx, cy, h, fill) => `<path transform="translate(${cx} ${cy}) scale(${h / 100})" d="${GLYPHS[d]}" fill="${fill}"/>`;

// `k` scales the two cells (1 fills ~70% of the width); `radius` rounds the canvas (0 = full bleed).
export function logoSvg({ k = 1, radius = 115 } = {}) {
  const t = 172 * k, g = 18 * k, sw = 10 * k, r = 33 * k, h = 96 * k;
  const x0 = 256 - t - g / 2, x1 = x0 + t + g, y = 256 - t / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${radius}" fill="${COLORS.bg}"/>
  <rect x="${x0 + sw / 2}" y="${y + sw / 2}" width="${t - sw}" height="${t - sw}" rx="${r - sw / 2}" fill="none" stroke="${COLORS.cream}" stroke-width="${sw}"/>
  <rect x="${x1}" y="${y}" width="${t}" height="${t}" rx="${r}" fill="${COLORS.amber}"/>
  ${digit("6", x0 + t / 2, 256, h, COLORS.cream)}
  ${digit("7", x1 + t / 2, 256, h, COLORS.onAmber)}
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
await png(logoSvg({ radius: 0, k: 0.82 }), 512, "maskable-512.png");

console.log("Icons written to public/ and public/icons/");
