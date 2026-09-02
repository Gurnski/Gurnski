// Generates every image in assets/: the banner, one card per project and the
// languages card, each in a light and a dark variant.
//
// Text is converted to outlines so the cards render the same on every machine:
// GitHub serves README images through its proxy, so no web font could load anyway.
// Links cannot live inside an image, so README.md wraps each project card in <a>.
//
// To regenerate after changing the words in `copy` below:
//   npm i opentype.js@1.3.4
//   put these four files in tools/fonts/ (IBM Plex, SIL Open Font License):
//     https://github.com/IBM/plex/raw/master/packages/plex-sans/fonts/complete/ttf/IBMPlexSans-SemiBold.ttf
//     https://github.com/IBM/plex/raw/master/packages/plex-sans/fonts/complete/ttf/IBMPlexSans-Regular.ttf
//     https://github.com/google/fonts/raw/main/ofl/ibmplexmono/IBMPlexMono-Medium.ttf
//     https://github.com/google/fonts/raw/main/ofl/ibmplexmono/IBMPlexMono-Regular.ttf
//   node tools/make-cards.js
const opentype = require('opentype.js');
const fs = require('fs');
const path = require('path');

const FONTS = path.join(__dirname, 'fonts');
const OUT = path.join(__dirname, '..', 'assets');
fs.mkdirSync(OUT, { recursive: true });

const load = (name) => opentype.loadSync(path.join(FONTS, name));
const F = {
  semi: load('IBMPlexSans-SemiBold.ttf'),
  reg: load('IBMPlexSans-Regular.ttf'),
  monoMed: load('IBMPlexMono-Medium.ttf'),
  mono: load('IBMPlexMono-Regular.ttf'),
};

const W = 1200, PAD = 64, R = 12, INNER = W - PAD * 2;

const themes = {
  dark: {
    bg: '#0d1117', border: '#30363d', primary: '#e6edf3', body: '#b1bac4', secondary: '#8b949e',
    dots: '#3d444d', dotsOpacity: 0.9, accent: '#f0883e',
  },
  light: {
    bg: '#ffffff', border: '#d0d7de', primary: '#1f2328', body: '#424a53', secondary: '#656d76',
    dots: '#c8d0d8', dotsOpacity: 1, accent: '#bc4c00',
  },
};

// Everything a reader sees is in this object. README.md repeats it as alt text.
const copy = {
  banner: {
    kicker: 'SOFTWARE DEVELOPER  ·  CORNWALL, UK',
    name: 'Daniel Rea',
    bio: 'Computer science student and developer. I build products, ship them, and deal with what breaks in production, with applied AI where it solves a real problem.',
    stack: 'TypeScript  ·  Python  ·  C#  ·  Java  ·  React  ·  Node.js  ·  PostgreSQL',
  },
  projects: [
    {
      slug: 'worthscout',
      kicker: '01  ·  SAAS, IN PRODUCTION',
      link: 'worthscout.co.uk',
      title: 'WorthScout',
      body: 'Photograph an item and get a structured resale assessment, check it against live market data, move it into inventory, prepare the listing, and pay by subscription. The source is private; the worthscout-public repo shows how it fits together.',
      stack: 'React  ·  TypeScript  ·  Fastify  ·  PostgreSQL  ·  Prisma  ·  Stripe',
    },
    {
      slug: 'regen-radar',
      kicker: '02  ·  HACKATHON, SECOND PLACE',
      link: 'github.com/Gurnski/Treefera-Hackathon',
      title: 'Regen Radar',
      body: "Built at Treefera's hackathon during London Climate Action Week 2026. Tests whether a change in farming practice shows up in Sentinel-2 satellite data by comparing a field with nearby controls. The answer came back as a score with a confidence attached rather than a verdict, because the controls improved too.",
      stack: 'Python  ·  Jupyter  ·  React  ·  TypeScript  ·  Recharts',
    },
    {
      slug: 'bsgo',
      kicker: '03  ·  GAME SERVER, OPEN SOURCE',
      link: 'github.com/Gurnski/BSGO-Private-Server',
      title: 'BSGO Private Server',
      body: "Battlestar Galactica Online closed in 2019 and its game data was never published. This rebuilds it: a generator that emits 12,250 cards across 58 star systems and checks each one against the server's own source, on top of the open-source BSGOCore server with persistence, protocol and combat fixes. Playable end to end with the original client.",
      stack: 'Java  ·  JavaScript  ·  Python',
    },
  ],
  toolbox: {
    kicker: 'LANGUAGES AND TOOLS',
    rows: [
      ['Languages', 'TypeScript  ·  JavaScript  ·  Python  ·  C#  ·  Java  ·  C++  ·  SQL'],
      ['Front end', 'React  ·  Next.js  ·  Vite  ·  Tailwind CSS'],
      ['Back end', 'Node.js  ·  Fastify  ·  PostgreSQL  ·  Prisma  ·  Stripe'],
      ['Testing, ops', 'Playwright  ·  Vitest  ·  Cloudflare  ·  Nginx  ·  Sentry'],
    ],
    closing: 'Most interested in product engineering, applied AI and software that has to survive contact with real users.',
  },
};

// ---- text helpers -------------------------------------------------------

const KERN = { kerning: true };
const width = (font, str, size, opts = {}) => font.getAdvanceWidth(str, size, { ...KERN, ...opts });
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

// Each glyph's outline is written once per file, in font units, and placed with
// <use>. A paragraph as raw paths costs about 200 KB; this way it costs about 60.
const fontKey = new Map([[F.semi, 's'], [F.reg, 'r'], [F.monoMed, 'm'], [F.mono, 'n']]);
let glyphDefs = new Map();
const r1 = (n) => Math.round(n * 10) / 10;

function text(font, str, x, y, size, fill, opts = {}) {
  const key = fontKey.get(font);
  const scale = +(size / font.unitsPerEm).toFixed(5);
  const uses = [];
  font.forEachGlyph(str, x, y, size, { ...KERN, ...opts }, (glyph, gx, gy) => {
    if (glyph.path.commands.length === 0) return; // a space draws nothing
    const id = `${key}${glyph.index}`;
    if (!glyphDefs.has(id)) glyphDefs.set(id, glyph.getPath(0, 0, font.unitsPerEm).toPathData(0));
    uses.push(`<use href="#${id}" transform="translate(${r1(gx)} ${r1(gy)}) scale(${scale})"/>`);
  });
  return `<g fill="${fill}">${uses.join('')}</g>`;
}
function textRight(font, str, xRight, y, size, fill, opts = {}) {
  return text(font, str, xRight - width(font, str, size, opts), y, size, fill, opts);
}
function wrap(font, str, size, maxWidth, opts = {}) {
  const lines = [];
  let line = '';
  for (const word of str.split(' ')) {
    const candidate = line ? `${line} ${word}` : word;
    if (!line || width(font, candidate, size, opts) <= maxWidth) line = candidate;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
}
// Refuse to emit anything that would run off the card.
function fits(label, font, str, size, opts = {}, limit = INNER) {
  const w = width(font, str, size, opts);
  if (w > limit) throw new Error(`${label} is ${Math.round(w)}px wide, limit ${limit}px`);
}

const style = {
  kicker: { font: F.monoMed, size: 14, opts: { tracking: 140 } },
  link: { font: F.mono, size: 14, opts: { tracking: 20 } },
  stack: { font: F.mono, size: 14, opts: { tracking: 20 } },
  label: { font: F.monoMed, size: 13, opts: { tracking: 120 } },
  body: { font: F.reg, size: 22, lineHeight: 32 },
};

// ---- card frame ---------------------------------------------------------

function frame({ H, c, title, desc, defs = '', css = '', under = '', body }) {
  const glyphs = [...glyphDefs].map(([id, d]) => `<path id="${id}" d="${d}"/>`).join('\n    ');
  glyphDefs = new Map(); // the next card starts its own table
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t d">
  <title id="t">${esc(title)}</title>
  <desc id="d">${esc(desc)}</desc>${css ? `\n  <style>${css}</style>` : ''}
  <defs>
    <clipPath id="card"><rect x="0" y="0" width="${W}" height="${H}" rx="${R}"/></clipPath>${defs}
    ${glyphs}
  </defs>
  <g clip-path="url(#card)">
    <rect x="0" y="0" width="${W}" height="${H}" fill="${c.bg}"/>${under}
  </g>
${body}
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="${R}" fill="none" stroke="${c.border}"/>
</svg>
`;
}

function rule(c, y) {
  return `  <line x1="${PAD}" y1="${y}" x2="${W - PAD}" y2="${y}" stroke="${c.border}" stroke-width="1"/>`;
}

// ---- the banner ---------------------------------------------------------

// Sparkline, top right. Abstract, but it is the shape of the work:
// a time series read against its neighbours (Regen Radar) and price signals (WorthScout).
const spark = [
  [828, 146], [866, 128], [904, 136], [942, 104], [980, 114],
  [1018, 86], [1056, 96], [1096, 64], [1136, 72],
];
const sparkD = spark.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ');
const sparkLen = Math.ceil(spark.reduce((acc, p, i) => (i ? acc + Math.hypot(p[0] - spark[i - 1][0], p[1] - spark[i - 1][1]) : 0), 0));
const [endX, endY] = spark[spark.length - 1];

function banner(c) {
  const b = copy.banner;
  const bio = wrap(style.body.font, b.bio, 24, INNER);
  if (bio.length > 2) throw new Error(`banner bio wraps to ${bio.length} lines; two is the most the card holds`);
  fits('banner kicker', style.kicker.font, b.kicker, style.kicker.size, style.kicker.opts);
  fits('banner stack', style.stack.font, b.stack, style.stack.size, style.stack.opts);

  const KICKER_Y = 72, NAME_Y = 154, BIO_Y = 202, BIO_LH = 33;
  const RULE_Y = BIO_Y + (bio.length - 1) * BIO_LH + 30;
  const STACK_Y = RULE_Y + 31;
  const H = STACK_Y + 37;
  const ruleLen = 120;

  const css = `
    .rule { stroke-dasharray: ${ruleLen}; stroke-dashoffset: ${ruleLen}; animation: draw 0.9s cubic-bezier(0.2, 0.7, 0.2, 1) 0.15s forwards; }
    .spark { stroke-dasharray: ${sparkLen}; stroke-dashoffset: ${sparkLen}; animation: draw 1.6s cubic-bezier(0.3, 0.6, 0.2, 1) 0.3s forwards; }
    .end { opacity: 0; animation: fade 0.4s ease-out 1.75s forwards; }
    @keyframes draw { to { stroke-dashoffset: 0; } }
    @keyframes fade { to { opacity: 1; } }
    @media (prefers-reduced-motion: reduce) {
      .rule, .spark { animation: none; stroke-dashoffset: 0; }
      .end { animation: none; opacity: 1; }
    }
  `;
  const defs = `
    <pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse">
      <circle cx="12" cy="12" r="1.4" fill="${c.dots}" opacity="${c.dotsOpacity}"/>
    </pattern>
    <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0.42" stop-color="#fff" stop-opacity="0"/>
      <stop offset="0.72" stop-color="#fff" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#fff" stop-opacity="1"/>
    </linearGradient>
    <mask id="dotmask"><rect x="0" y="0" width="${W}" height="${H}" fill="url(#fade)"/></mask>`;
  const under = `
    <rect x="0" y="0" width="${W}" height="${H}" fill="url(#dots)" mask="url(#dotmask)"/>`;

  const body = [
    `  <path class="spark" d="${sparkD}" fill="none" stroke="${c.accent}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`,
    `  <g class="end"><circle cx="${endX}" cy="${endY}" r="9" fill="${c.accent}" opacity="0.18"/><circle cx="${endX}" cy="${endY}" r="4" fill="${c.accent}"/></g>`,
    '  ' + text(style.kicker.font, b.kicker, PAD, KICKER_Y, style.kicker.size, c.accent, style.kicker.opts),
    '  ' + text(F.semi, b.name, PAD - 4, NAME_Y, 78, c.primary),
    ...bio.map((line, i) => '  ' + text(style.body.font, line, PAD, BIO_Y + i * BIO_LH, 24, c.body)),
    rule(c, RULE_Y),
    `  <line class="rule" x1="${PAD}" y1="${RULE_Y}" x2="${PAD + ruleLen}" y2="${RULE_Y}" stroke="${c.accent}" stroke-width="2"/>`,
    '  ' + text(style.stack.font, b.stack, PAD, STACK_Y, style.stack.size, c.secondary, style.stack.opts),
  ].join('\n');

  return frame({
    H, c, css, defs, under, body,
    title: b.name,
    desc: `${b.kicker.replace(/\s+·\s+/g, ', ')}. ${b.bio} ${b.stack.replace(/\s+·\s+/g, ', ')}.`,
  });
}

// ---- a project card -----------------------------------------------------

function project(c, p) {
  const link = `${p.link} →`;
  fits(`${p.slug} stack`, style.stack.font, p.stack, style.stack.size, style.stack.opts);
  fits(`${p.slug} kicker`, style.kicker.font, p.kicker, style.kicker.size, style.kicker.opts, INNER - width(style.link.font, link, style.link.size, style.link.opts) - 40);
  const lines = wrap(style.body.font, p.body, style.body.size, INNER);

  const KICKER_Y = 66, TITLE_Y = 118, BODY_Y = 166;
  const RULE_Y = BODY_Y + (lines.length - 1) * style.body.lineHeight + 30;
  const STACK_Y = RULE_Y + 31;
  const H = STACK_Y + 36;

  const body = [
    '  ' + text(style.kicker.font, p.kicker, PAD, KICKER_Y, style.kicker.size, c.accent, style.kicker.opts),
    '  ' + textRight(style.link.font, link, W - PAD, KICKER_Y, style.link.size, c.secondary, style.link.opts),
    '  ' + text(F.semi, p.title, PAD - 2, TITLE_Y, 36, c.primary),
    ...lines.map((line, i) => '  ' + text(style.body.font, line, PAD, BODY_Y + i * style.body.lineHeight, style.body.size, c.body)),
    rule(c, RULE_Y),
    '  ' + text(style.stack.font, p.stack, PAD, STACK_Y, style.stack.size, c.secondary, style.stack.opts),
  ].join('\n');

  return frame({ H, c, body, title: p.title, desc: `${p.kicker.replace(/^\d+\s+·\s+/, '')}. ${p.body} ${p.stack.replace(/\s+·\s+/g, ', ')}. ${p.link}` });
}

// ---- the languages card -------------------------------------------------

function toolbox(c) {
  const t = copy.toolbox;
  const LABEL_X = PAD, VALUE_X = 262;
  for (const [label, value] of t.rows) {
    fits(`toolbox label ${label}`, style.label.font, label.toUpperCase(), style.label.size, style.label.opts, VALUE_X - LABEL_X - 24);
    fits(`toolbox row ${label}`, style.body.font, value, style.body.size, {}, W - PAD - VALUE_X);
  }
  const closing = wrap(style.body.font, t.closing, style.body.size, INNER);

  const KICKER_Y = 66, ROW_Y = 122, ROW_LH = 42;
  const RULE_Y = ROW_Y + (t.rows.length - 1) * ROW_LH + 36;
  const CLOSE_Y = RULE_Y + 44;
  const H = CLOSE_Y + (closing.length - 1) * style.body.lineHeight + 40;

  const body = [
    '  ' + text(style.kicker.font, t.kicker, PAD, KICKER_Y, style.kicker.size, c.accent, style.kicker.opts),
    ...t.rows.flatMap(([label, value], i) => [
      '  ' + text(style.label.font, label.toUpperCase(), LABEL_X, ROW_Y + i * ROW_LH - 1, style.label.size, c.secondary, style.label.opts),
      '  ' + text(style.body.font, value, VALUE_X, ROW_Y + i * ROW_LH, style.body.size, c.primary),
    ]),
    rule(c, RULE_Y),
    ...closing.map((line, i) => '  ' + text(style.body.font, line, PAD, CLOSE_Y + i * style.body.lineHeight, style.body.size, c.body)),
  ].join('\n');

  return frame({
    H, c, body,
    title: 'Languages and tools',
    desc: `${t.rows.map(([l, v]) => `${l}: ${v.replace(/\s+·\s+/g, ', ')}`).join('. ')}. ${t.closing}`,
  });
}

// ---- write everything ---------------------------------------------------

function write(name, svg) {
  const file = path.join(OUT, `${name}.svg`);
  fs.writeFileSync(file, svg);
  console.log(`${name.padEnd(24)} ${(fs.statSync(file).size / 1024).toFixed(0).padStart(4)} KB`);
}

for (const [name, c] of Object.entries(themes)) {
  write(`banner-${name}`, banner(c));
  for (const p of copy.projects) write(`project-${p.slug}-${name}`, project(c, p));
  write(`toolbox-${name}`, toolbox(c));
}

module.exports = { copy };
