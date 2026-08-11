// Generator obrazków startowych iOS (apple-touch-startup-image).
//
// Uruchamiany RĘCZNIE, wynik jest commitowany — nie chcemy natywnej binarki
// sharp w zależnościach apps/web ani generowania przy każdym buildzie.
//
// Działa z dowolnego cwd — sharp i katalog wyjściowy rozwiązywane są względem
// lokalizacji tego pliku, nie process.cwd(). Można więc uruchomić zarówno:
//   node apps/web/scripts/generate-splash-screens.mjs   (z korzenia repo)
// jak i:
//   pnpm --filter cosmo-server exec node ../web/scripts/generate-splash-screens.mjs
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Ścieżka wyjściowa MUSI pochodzić z import.meta.url (lokalizacji tego pliku),
// nie z process.cwd() — skrypt bywa uruchamiany z innego katalogu (cosmo-app/),
// więc cwd nie zawsze wskazuje na apps/web/public/splash.
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(SCRIPT_DIR, '..', 'public', 'splash');

// `sharp` żyje wyłącznie w node_modules workspace'u cosmo-server. Rozwiązujemy
// go po ścieżce względem lokalizacji tego pliku (SCRIPT_DIR), a nie
// process.cwd() — dzięki temu skrypt działa niezależnie od katalogu, z którego
// go uruchomiono.
const require = createRequire(path.join(SCRIPT_DIR, '../../server/package.json'));
const sharpEntry = require.resolve('sharp');
const { default: sharp } = await import(pathToFileURL(sharpEntry).href);

const BG = '#1A3828';
const CREAM = '#F4F9F5';
const OAK = '#C4965A';
const MINK = '#5A7A62';

// Monogram — te same kształty co w public/favicon.svg i w splashu w index.html.
const MARK_LETTER =
  'M18 47V17h14.5c8 0 13 3.8 13 10 0 3.7-2 6.5-5.4 7.8 4.2 1.1 6.4 4 6.4 8.1C46.5 50 41 54 32.2 54H25v-7h7.2c4.3 0 6.7-1.5 6.7-4.5S36.6 38 32.2 38H25v9h-7Zm7-16h7c3.8 0 5.8-1.3 5.8-3.9 0-2.5-2-3.7-5.8-3.7h-7V31Z';
const MARK_LEAF = 'M43 10c5 5 5.2 11.1.5 16.3-5.4-3.7-6-9.4-.5-16.3Z';

// Tylko portret — manifest.json wymusza orientation: portrait.
const DEVICES = [
  { name: 'iphone-se1', width: 640, height: 1136 },
  { name: 'iphone-8', width: 750, height: 1334 },
  { name: 'iphone-8-plus', width: 1242, height: 2208 },
  { name: 'iphone-xr', width: 828, height: 1792 },
  { name: 'iphone-x', width: 1125, height: 2436 },
  { name: 'iphone-xs-max', width: 1242, height: 2688 },
  { name: 'iphone-12', width: 1170, height: 2532 },
  { name: 'iphone-12-pro-max', width: 1284, height: 2778 },
  { name: 'iphone-14-pro', width: 1179, height: 2556 },
  { name: 'iphone-14-pro-max', width: 1290, height: 2796 },
  { name: 'ipad-9-7', width: 1536, height: 2048 },
  { name: 'ipad-10-5', width: 1668, height: 2224 },
  { name: 'ipad-11', width: 1668, height: 2388 },
  { name: 'ipad-pro-12-9', width: 2048, height: 2732 },
  { name: 'iphone-16-pro', width: 1206, height: 2622 },
  { name: 'iphone-16-pro-max', width: 1320, height: 2868 },
  { name: 'ipad-10th', width: 1640, height: 2360 },
  { name: 'ipad-mini-6', width: 1488, height: 2266 },
  { name: 'ipad-pro-11-m4', width: 1668, height: 2420 },
  { name: 'ipad-pro-13-m4', width: 2064, height: 2752 },
];

function buildSvg(width, height) {
  const short = Math.min(width, height);
  const mark = Math.round(short * 0.24);
  const nameSize = Math.round(short * 0.075);
  const subSize = Math.round(short * 0.032);
  const cx = width / 2;
  const cy = height / 2;
  const markTop = cy - mark * 1.05;
  const nameBaseline = cy + mark * 0.55;
  const subBaseline = nameBaseline + subSize * 2.4;

  // Georgia/Helvetica zamiast Playfair/DM Sans — sharp renderuje tekst przez
  // fonty systemowe, a webfontów projektu nie ma w systemie. Georgia jest
  // wizualnie bliska Playfair Display i to ten sam fallback co w index.html.
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${BG}"/>
  <g transform="translate(${cx - mark / 2} ${markTop}) scale(${mark / 64})">
    <path d="${MARK_LETTER}" fill="${CREAM}"/>
    <path d="${MARK_LEAF}" fill="${OAK}"/>
  </g>
  <text x="${cx}" y="${nameBaseline}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="bold" font-size="${nameSize}" fill="${CREAM}">BeskidStudio</text>
  <text x="${cx}" y="${subBaseline}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="${subSize}" letter-spacing="${(subSize * 0.16).toFixed(2)}" fill="${MINK}">BY WIKTORIA ĆWIK</text>
</svg>`);
}

await mkdir(OUT_DIR, { recursive: true });

for (const device of DEVICES) {
  const file = path.join(OUT_DIR, `${device.name}.png`);
  await sharp(buildSvg(device.width, device.height))
    .png({ compressionLevel: 9 })
    .toFile(file);
  console.log(`✓ ${device.name}.png  ${device.width}×${device.height}`);
}

console.log(`\nGotowe: ${DEVICES.length} plików w ${OUT_DIR}`);
