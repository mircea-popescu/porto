// Generează setul de iconițe Porto din SVG-ul „cat în streak ring”, vectorial.
// Sursa unică → toate PNG-urile. Rulează cu: npm run icons
//
// Compoziția (aprobată): pisica gingerie (ochi închiși fericit) într-un inel alb,
// pe gradientul „ember”. Stopurile ember oglindesc src/constants/theme.ts
// (gradients.ember) ca iconița să se potrivească cu logo-ul/butoanele din app.
//
// Toate desenele sunt în spațiul viewBox 200×200; resvg le redă la orice dimensiune.

import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets', 'images');

const EMBER = (id) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">` +
  `<stop offset="0" stop-color="#FF7A59"/>` +
  `<stop offset="0.52" stop-color="#FF4D6D"/>` +
  `<stop offset="1" stop-color="#7C5CFF"/></linearGradient>`;

// Fața pisicii (ginger, ochi închiși „content”), spațiu 200×200 centrat.
const CAT_GINGER = `
  <path d="M58 70 L46 26 L94 56 Z" fill="#F2933A"/>
  <path d="M142 70 L154 26 L106 56 Z" fill="#F2933A"/>
  <path d="M64 64 L56 40 L84 58 Z" fill="#F7C39B"/>
  <path d="M136 64 L144 40 L116 58 Z" fill="#F7C39B"/>
  <path d="M100 48 C64 48 48 76 48 108 C48 146 70 162 100 162 C130 162 152 146 152 108 C152 76 136 48 100 48 Z" fill="#F2933A"/>
  <path d="M100 58 L100 80 M86 60 L82 82 M114 60 L118 82" stroke="#C96A1E" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path d="M100 104 C78 104 68 126 74 146 C80 158 92 162 100 162 C108 162 120 158 126 146 C132 126 122 104 100 104 Z" fill="#FBEFE3"/>
  <path d="M68 94 Q80 82 92 94 M108 94 Q120 82 132 94" stroke="#2B2018" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path d="M100 116 L91 107 L109 107 Z" fill="#E98BA0"/>
  <path d="M100 116 L100 124 M100 124 Q90 132 85 128 M100 124 Q110 132 115 128" stroke="#C96A1E" stroke-width="3" fill="none" stroke-linecap="round"/>
`;

// Siluetă albă (cap + urechi) pentru varianta monochrome (themed icon Android).
const CAT_WHITE = `
  <path d="M58 70 L46 26 L94 56 Z" fill="#FFFFFF"/>
  <path d="M142 70 L154 26 L106 56 Z" fill="#FFFFFF"/>
  <path d="M100 48 C64 48 48 76 48 108 C48 146 70 162 100 162 C130 162 152 146 152 108 C152 76 136 48 100 48 Z" fill="#FFFFFF"/>
`;

// Inel de progres alb la ~75%: pistă slabă (sfertul rămas) + arc plin pornit din vârf.
// Circumferință 2π·70 ≈ 439.8; 75% ≈ 330.
const ringWhite =
  `<circle cx="100" cy="100" r="70" fill="none" stroke="#FFFFFF" stroke-width="13" opacity="0.3"/>` +
  `<circle cx="100" cy="100" r="70" fill="none" stroke="#FFFFFF" stroke-width="13" stroke-linecap="round" ` +
  `stroke-dasharray="330 440" transform="rotate(-90 100 100)"/>`;

// Inel + pisică, în spațiul 200×200 (pisica scalată ca să încapă în inel).
const catInRing = (cat) => `${ringWhite}<g transform="translate(40,40) scale(0.6)">${cat}</g>`;

const svg = (inner, defs = '') =>
  `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">${defs}${inner}</svg>`;

// Variante.
const iconFull = svg(
  `<rect width="200" height="200" fill="url(#e)"/>${catInRing(CAT_GINGER)}`,
  `<defs>${EMBER('e')}</defs>`,
);
const background = svg(`<rect width="200" height="200" fill="url(#e)"/>`, `<defs>${EMBER('e')}</defs>`);
// Foreground & monochrome: conținut în zona sigură (~66% central), pe transparent.
const foreground = svg(`<g transform="translate(34,34) scale(0.66)">${catInRing(CAT_GINGER)}</g>`);
const monochrome = svg(
  `<g transform="translate(34,34) scale(0.66)">${ringWhite}<g transform="translate(40,40) scale(0.6)">${CAT_WHITE}</g></g>`,
);
// Splash: pisica gingerie în inel, transparent, ușor încadrată (apare pe fundal ember).
const splash = svg(`<g transform="translate(14,14) scale(0.86)">${catInRing(CAT_GINGER)}</g>`);

const TARGETS = [
  { svg: iconFull, width: 1024, out: 'icon.png' },
  { svg: iconFull, width: 48, out: 'favicon.png' },
  { svg: foreground, width: 512, out: 'android-icon-foreground.png' },
  { svg: background, width: 512, out: 'android-icon-background.png' },
  { svg: monochrome, width: 432, out: 'android-icon-monochrome.png' },
  { svg: splash, width: 512, out: 'splash-icon.png' },
];

mkdirSync(OUT, { recursive: true });
for (const t of TARGETS) {
  const png = new Resvg(t.svg, { fitTo: { mode: 'width', value: t.width } }).render().asPng();
  writeFileSync(join(OUT, t.out), png);
  console.log(`✓ ${t.out} (${t.width}px, ${png.length} bytes)`);
}
console.log('Gata.');
