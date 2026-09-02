// Generates assets/banner-light.svg and assets/banner-dark.svg.
//
// Text is converted to outlines so the banner renders the same on every machine:
// GitHub serves README images through its proxy, so no web font could load anyway.
//
// To regenerate after changing the words in `copy` below:
//   npm i opentype.js@1.3.4
//   put these four files in tools/fonts/ (IBM Plex, SIL Open Font License):
//     https://github.com/IBM/plex/raw/master/packages/plex-sans/fonts/complete/ttf/IBMPlexSans-SemiBold.ttf
//     https://github.com/IBM/plex/raw/master/packages/plex-sans/fonts/complete/ttf/IBMPlexSans-Regular.ttf
//     https://github.com/google/fonts/raw/main/ofl/ibmplexmono/IBMPlexMono-Medium.ttf
//     https://github.com/google/fonts/raw/main/ofl/ibmplexmono/IBMPlexMono-Regular.ttf
//   node tools/make-banner.js
const opentype = require('opentype.js');
const fs = require('fs');
const path = require('path');

const FONTS = path.join(__dirname, 'fonts');
const OUT = process.argv[2] || path.join(__dirname, '..', 'assets');
fs.mkdirSync(OUT, { recursive: true });

const sansSemi = opentype.loadSync(path.join(FONTS, 'IBMPlexSans-SemiBold.ttf'));
const sansReg = opentype.loadSync(path.join(FONTS, 'IBMPlexSans-Regular.ttf'));
const monoMed = opentype.loadSync(path.join(FONTS, 'IBMPlexMono-Medium.ttf'));
const monoReg = opentype.loadSync(path.join(FONTS, 'IBMPlexMono-Regular.ttf'));

const W = 1200, H = 300, PAD = 64, R = 12;

const themes = {
  dark: {
    bg: '#0d1117', border: '#30363d', primary: '#e6edf3', secondary: '#8b949e',
    dots: '#3d444d', accent: '#f0883e', sparkBase: '#484f58', dotsOpacity: 0.9,
  },
  light: {
    bg: '#ffffff', border: '#d0d7de', primary: '#1f2328', secondary: '#656d76',
    dots: '#c8d0d8', accent: '#bc4c00', sparkBase: '#afb8c1', dotsOpacity: 1,
  },
};

const copy = {
  kicker: 'SOFTWARE DEVELOPER  ·  CORNWALL, UK',
  name: 'Daniel Rea',
  tagline: 'Builds and ships products, then deals with what breaks in production.',
  stack: 'TypeScript  ·  React  ·  Node.js  ·  PostgreSQL  ·  applied AI',
};

function glyphs(font, str, x, y, size, opts = {}) {
  return font.getPath(str, x, y, size, { kerning: true, ...opts }).toPathData(2);
}
function width(font, str, size, opts = {}) {
  return font.getAdvanceWidth(str, size, { kerning: true, ...opts });
}

// Sparkline, top right. Abstract, but it is the shape of the work:
// a time series read against its neighbours (Regen Radar) and price signals (WorthScout).
const spark = [
  [828, 146], [866, 128], [904, 136], [942, 104], [980, 114],
  [1018, 86], [1056, 96], [1096, 64], [1136, 72],
];
const sparkD = spark.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ');
const sparkLen = spark.reduce((acc, p, i) => i ? acc + Math.hypot(p[0] - spark[i - 1][0], p[1] - spark[i - 1][1]) : 0, 0);
const [endX, endY] = spark[spark.length - 1];

const KICKER_Y = 72, NAME_Y = 154, TAG_Y = 202, RULE_Y = 232, STACK_Y = 263;

const layout = {
  kicker: { font: monoMed, size: 14, tracking: 140 },
  name: { font: sansSemi, size: 78 },
  tagline: { font: sansReg, size: 27 },
  stack: { font: monoReg, size: 14, tracking: 20 },
};

// Refuse to emit anything that would run off the card.
for (const [key, l] of Object.entries(layout)) {
  const w = width(l.font, copy[key], l.size, { tracking: l.tracking });
  const limit = W - PAD * 2;
  if (w > limit) throw new Error(`${key} is ${Math.round(w)}px wide, limit ${limit}px`);
  console.log(`${key.padEnd(8)} ${Math.round(w)}px`);
}

function svg(c) {
  const ruleLen = 120;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t d">
  <title id="t">${copy.name}</title>
  <desc id="d">${copy.kicker.replace(/\s+·\s+/g, ', ')}. ${copy.tagline} ${copy.stack.replace(/\s+·\s+/g, ', ')}.</desc>
  <style>
    .rule { stroke-dasharray: ${ruleLen}; stroke-dashoffset: ${ruleLen}; animation: draw 0.9s cubic-bezier(0.2, 0.7, 0.2, 1) 0.15s forwards; }
    .spark { stroke-dasharray: ${Math.ceil(sparkLen)}; stroke-dashoffset: ${Math.ceil(sparkLen)}; animation: draw 1.6s cubic-bezier(0.3, 0.6, 0.2, 1) 0.3s forwards; }
    .end { opacity: 0; animation: fade 0.4s ease-out 1.75s forwards; }
    @keyframes draw { to { stroke-dashoffset: 0; } }
    @keyframes fade { to { opacity: 1; } }
    @media (prefers-reduced-motion: reduce) {
      .rule, .spark { animation: none; stroke-dashoffset: 0; }
      .end { animation: none; opacity: 1; }
    }
  </style>
  <defs>
    <clipPath id="card"><rect x="0" y="0" width="${W}" height="${H}" rx="${R}"/></clipPath>
    <pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse">
      <circle cx="12" cy="12" r="1.4" fill="${c.dots}" opacity="${c.dotsOpacity}"/>
    </pattern>
    <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0.42" stop-color="#fff" stop-opacity="0"/>
      <stop offset="0.72" stop-color="#fff" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#fff" stop-opacity="1"/>
    </linearGradient>
    <mask id="dotmask"><rect x="0" y="0" width="${W}" height="${H}" fill="url(#fade)"/></mask>
  </defs>

  <g clip-path="url(#card)">
    <rect x="0" y="0" width="${W}" height="${H}" fill="${c.bg}"/>
    <rect x="0" y="0" width="${W}" height="${H}" fill="url(#dots)" mask="url(#dotmask)"/>
  </g>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="${R}" fill="none" stroke="${c.border}"/>

  <!-- sparkline -->
  <path class="spark" d="${sparkD}" fill="none" stroke="${c.accent}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  <g class="end">
    <circle cx="${endX}" cy="${endY}" r="9" fill="${c.accent}" opacity="0.18"/>
    <circle cx="${endX}" cy="${endY}" r="4" fill="${c.accent}"/>
  </g>

  <!-- kicker -->
  <rect x="${PAD}" y="${KICKER_Y - 11}" width="10" height="10" fill="${c.accent}"/>
  <path fill="${c.accent}" d="${glyphs(layout.kicker.font, copy.kicker, PAD + 22, KICKER_Y, layout.kicker.size, { tracking: layout.kicker.tracking })}"/>

  <!-- name and tagline -->
  <path fill="${c.primary}" d="${glyphs(layout.name.font, copy.name, PAD - 4, NAME_Y, layout.name.size)}"/>
  <path fill="${c.secondary}" d="${glyphs(layout.tagline.font, copy.tagline, PAD, TAG_Y, layout.tagline.size)}"/>

  <!-- rule and stack -->
  <line x1="${PAD}" y1="${RULE_Y}" x2="${W - PAD}" y2="${RULE_Y}" stroke="${c.border}" stroke-width="1"/>
  <line class="rule" x1="${PAD}" y1="${RULE_Y}" x2="${PAD + ruleLen}" y2="${RULE_Y}" stroke="${c.accent}" stroke-width="2"/>
  <path fill="${c.secondary}" d="${glyphs(layout.stack.font, copy.stack, PAD, STACK_Y, layout.stack.size, { tracking: layout.stack.tracking })}"/>
</svg>
`;
}

for (const [name, theme] of Object.entries(themes)) {
  const file = path.join(OUT, `banner-${name}.svg`);
  fs.writeFileSync(file, svg(theme));
  console.log(`wrote ${file} (${(fs.statSync(file).size / 1024).toFixed(1)} KB)`);
}
