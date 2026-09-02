// Generates every image in assets/: the banner, the About card, the Projects
// and achievements card and the Languages card, each in a light and a dark variant.
//
// Text is converted to outlines so the cards render the same on every machine:
// GitHub serves README images through its proxy, so no web font could load anyway.
// Links cannot live inside an image, so README.md wraps the projects card in one <a>.
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
    bio: 'I build products, ship them, and deal with what breaks in production.',
    stack: 'TypeScript  ·  Python  ·  C#  ·  Java  ·  React  ·  Node.js  ·  PostgreSQL',
  },
  about: {
    kicker: 'ABOUT',
    datum: 'On GitHub since December 2017',
    paragraphs: [
      'Computer science student. My first repos here were C# and C++ tools; the recent ones are TypeScript and Python, and one of them is a subscription product in production. AI goes in where it earns its place and stays out where it does not.',
      'Most interested in product engineering, applied AI and software that has to survive contact with real users.',
    ],
  },
  projects: {
    kicker: 'PROJECTS AND ACHIEVEMENTS',
    items: [
      {
        title: 'WorthScout',
        icon: 'tag',
        badge: 'IN PRODUCTION',
        oneLiner: 'SaaS for resellers: photograph an item, get a resale assessment against live market data, then list it.',
        metaLeft: 'React  ·  TypeScript  ·  Fastify  ·  PostgreSQL  ·  Stripe',
        metaRight: 'worthscout.co.uk',
      },
      {
        title: 'Regen Radar',
        icon: 'trophy',
        accent: true,
        badge: '2ND PLACE  ·  TREEFERA HACKATHON',
        oneLiner: 'Tests a farming change against Sentinel-2 satellite data and control fields. Signal, not proof.',
        metaLeft: 'London Climate Action Week 2026  ·  Python  ·  Jupyter  ·  React  ·  Recharts',
        metaRight: 'Gurnski/Treefera-Hackathon',
      },
      {
        title: 'BSGO Private Server',
        icon: 'server',
        oneLiner: 'Battlestar Galactica Online closed in 2019. Rebuilt on BSGOCore, playable with the original client.',
        metaLeft: '12,250 cards  ·  58 star systems  ·  Java  ·  JavaScript  ·  Python',
        metaRight: 'Gurnski/BSGO-Private-Server',
      },
      {
        title: 'ADRM Engine',
        icon: 'flask',
        oneLiner: 'Backtester for rule-based forex strategies, with an early MetaTrader 5 integration.',
        metaLeft: 'Python  ·  research, not a product',
        metaRight: 'Gurnski/ADRM-Engine',
      },
    ],
  },
  toolbox: {
    kicker: 'LANGUAGES AND TOOLS',
    rows: [
      ['Languages', 'TypeScript  ·  JavaScript  ·  Python  ·  C#  ·  Java  ·  C++  ·  SQL'],
      ['Front end', 'React  ·  Next.js  ·  Vite  ·  Tailwind CSS'],
      ['Back end', 'Node.js  ·  Fastify  ·  PostgreSQL  ·  Prisma  ·  Stripe'],
      ['Testing, ops', 'Playwright  ·  Vitest  ·  Cloudflare  ·  Nginx  ·  Sentry'],
    ],
  },
};

// ---- text helpers -------------------------------------------------------

const KERN = { kerning: true };
const width = (font, str, size, opts = {}) => font.getAdvanceWidth(str, size, { ...KERN, ...opts });
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const plain = (s) => s.replace(/\s+·\s+/g, ', ');

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
  badge: { font: F.monoMed, size: 14, opts: { tracking: 120 } },
  label: { font: F.monoMed, size: 13, opts: { tracking: 120 } },
  body: { font: F.reg, size: 22, lineHeight: 32 },
};

// ---- icons --------------------------------------------------------------

// Stroke icons on a 24-unit grid, drawn by hand so they match each other.
// `dots` are small filled circles as "cx,cy,r;cx,cy,r".
const ICONS = {
  trophy: { d: 'M7 3h10v6.5a5 5 0 0 1-10 0V3z M7 5H5a2 2 0 0 0 0 4h2 M17 5h2a2 2 0 0 1 0 4h-2 M12 14.5V18 M10 21v-3h4v3 M8 21h8' },
  tag: { d: 'M12 3H3v9l8.6 8.6a2 2 0 0 0 2.8 0l6.2-6.2a2 2 0 0 0 0-2.8L12 3z', dots: '7.5,7.5,1.25' },
  server: { d: 'M4 5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z M4 15a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z', dots: '7.5,7,1.1;7.5,17,1.1' },
  flask: { d: 'M9.5 3h5 M10 3v5.5L4.8 18.5A1.5 1.5 0 0 0 6.1 21h11.8a1.5 1.5 0 0 0 1.3-2.5L14 8.5V3 M7.2 15h9.6' },
};

// Places an icon with its top-left corner at (x, y), `size` units square.
// pathLength="100" lets one CSS rule draw every icon in, whatever its real length.
function icon(name, x, y, size, color, className = '') {
  const ic = ICONS[name];
  if (!ic) throw new Error(`no icon named ${name}`);
  const s = +(size / 24).toFixed(4);
  const dots = (ic.dots || '').split(';').filter(Boolean).map((t) => {
    const [cx, cy, r] = t.split(',');
    return `<circle class="dot" cx="${cx}" cy="${cy}" r="${r}" fill="${color}" stroke="none"/>`;
  }).join('');
  return `<g${className ? ` class="${className}"` : ''} transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="${color}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="${ic.d}" pathLength="100"/>${dots}</g>`;
}

// ---- card frame ---------------------------------------------------------

// Only the animated classes are listed: a blanket rule would also lift the
// sparkline's soft end ring and the dot grid to full opacity.
const REDUCED_MOTION = `
    @media (prefers-reduced-motion: reduce) {
      .rule, .spark, .ic path { animation: none; stroke-dashoffset: 0; }
      .end, .ic .dot, .badge { animation: none; opacity: 1; }
    }`;

function frame({ H, c, title, desc, defs = '', css = '', under = '', body }) {
  const glyphs = [...glyphDefs].map(([id, d]) => `<path id="${id}" d="${d}"/>`).join('\n    ');
  glyphDefs = new Map(); // the next card starts its own table
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t d">
  <title id="t">${esc(title)}</title>
  <desc id="d">${esc(desc)}</desc>${css ? `\n  <style>${css}${REDUCED_MOTION}\n  </style>` : ''}
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

function rule(c, y, x1 = PAD, x2 = W - PAD) {
  return `  <line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${c.border}" stroke-width="1"/>`;
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
    @keyframes fade { to { opacity: 1; } }`;
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
    desc: `${plain(b.kicker)}. ${b.bio} ${plain(b.stack)}.`,
  });
}

// ---- the About card -----------------------------------------------------

// A kicker, one grey datum and prose on a shorter measure. Nothing moves:
// the page's motion budget is the sparkline and the project icons.
function about(c) {
  const a = copy.about;
  const MEASURE = 840;
  const KICKER_Y = 66, BODY_Y = 118, GAP = 14;
  fits('about datum', style.link.font, a.datum, style.link.size, style.link.opts, INNER - width(style.kicker.font, a.kicker, style.kicker.size, style.kicker.opts) - 40);

  const lines = [];
  let y = BODY_Y;
  for (const p of a.paragraphs) {
    for (const line of wrap(style.body.font, p, style.body.size, MEASURE)) {
      lines.push('  ' + text(style.body.font, line, PAD, y, style.body.size, c.body));
      y += style.body.lineHeight;
    }
    y += GAP;
  }
  const lastBaseline = y - GAP - style.body.lineHeight;
  const H = lastBaseline + 48;

  const body = [
    '  ' + text(style.kicker.font, a.kicker, PAD, KICKER_Y, style.kicker.size, c.accent, style.kicker.opts),
    '  ' + textRight(style.link.font, a.datum, W - PAD, KICKER_Y, style.link.size, c.secondary, style.link.opts),
    ...lines,
  ].join('\n');

  return frame({ H, c, body, title: 'About', desc: `${a.datum}. ${a.paragraphs.join(' ')}` });
}

// ---- the Projects and achievements card ---------------------------------

// Four rows on a spine of icons. The trophy is the only icon in the accent,
// and the two badges are the only accent text, so the eye lands on the two
// facts a reader checks: in production, second place.
function projects(c) {
  const p = copy.projects;
  const TEXT_X = 120, TEXT_W = W - PAD - TEXT_X;
  const KICKER_Y = 66, ROW0_Y = 130, PITCH = 130;
  const delays = [0.15, 0.3, 0.45, 0.6];

  const rows = p.items.map((it, i) => {
    const yT = ROW0_Y + i * PITCH;
    const badgeW = it.badge ? width(style.badge.font, it.badge, style.badge.size, style.badge.opts) + 40 : 0;
    fits(`${it.title} title`, F.semi, it.title, 30, {}, TEXT_W - badgeW);
    fits(`${it.title} one-liner`, style.body.font, it.oneLiner, style.body.size, {}, TEXT_W);
    fits(`${it.title} meta`, style.stack.font, it.metaLeft, style.stack.size, style.stack.opts, TEXT_W - width(style.stack.font, it.metaRight, style.stack.size, style.stack.opts) - 40);
    const colour = it.accent ? c.accent : c.secondary;
    return [
      '  ' + icon(it.icon, PAD, yT - 24, 28, colour, `ic r${i}`),
      '  ' + text(F.semi, it.title, TEXT_X, yT, 30, c.primary),
      it.badge ? `  <g class="badge">${textRight(style.badge.font, it.badge, W - PAD, yT - 1, style.badge.size, c.accent, style.badge.opts)}</g>` : '',
      '  ' + text(style.body.font, it.oneLiner, TEXT_X, yT + 36, style.body.size, c.body),
      '  ' + text(style.stack.font, it.metaLeft, TEXT_X, yT + 66, style.stack.size, c.secondary, style.stack.opts),
      '  ' + textRight(style.stack.font, it.metaRight, W - PAD, yT + 66, style.stack.size, c.secondary, style.stack.opts),
      i < p.items.length - 1 ? rule(c, yT + 91, TEXT_X) : '',
    ].filter(Boolean).join('\n');
  });
  const H = ROW0_Y + (p.items.length - 1) * PITCH + 66 + 44;

  const css = `
    .ic path { stroke-dasharray: 100; stroke-dashoffset: 100; animation: draw 0.7s cubic-bezier(0.2, 0.7, 0.2, 1) forwards; }
    .ic .dot { opacity: 0; animation: fade 0.3s ease-out forwards; }
    ${delays.map((d, i) => `.r${i} path { animation-delay: ${d}s; } .r${i} .dot { animation-delay: ${(d + 0.5).toFixed(2)}s; }`).join('\n    ')}
    .badge { opacity: 0; animation: fade 0.4s ease-out 0.95s forwards; }
    @keyframes draw { to { stroke-dashoffset: 0; } }
    @keyframes fade { to { opacity: 1; } }`;

  const body = [
    '  ' + text(style.kicker.font, p.kicker, PAD, KICKER_Y, style.kicker.size, c.accent, style.kicker.opts),
    ...rows,
  ].join('\n');

  const desc = p.items.map((it) => `${it.title}${it.badge ? ` (${plain(it.badge).toLowerCase()})` : ''}: ${it.oneLiner} ${plain(it.metaLeft)}. ${it.metaRight}.`).join(' ');
  return frame({ H, c, css, body, title: 'Projects and achievements', desc });
}

// ---- the Languages card -------------------------------------------------

function toolbox(c) {
  const t = copy.toolbox;
  const LABEL_X = PAD, VALUE_X = 262;
  for (const [label, value] of t.rows) {
    fits(`toolbox label ${label}`, style.label.font, label.toUpperCase(), style.label.size, style.label.opts, VALUE_X - LABEL_X - 24);
    fits(`toolbox row ${label}`, style.body.font, value, style.body.size, {}, W - PAD - VALUE_X);
  }

  const KICKER_Y = 66, ROW_Y = 122, ROW_LH = 42;
  const H = ROW_Y + (t.rows.length - 1) * ROW_LH + 46;

  const body = [
    '  ' + text(style.kicker.font, t.kicker, PAD, KICKER_Y, style.kicker.size, c.accent, style.kicker.opts),
    ...t.rows.flatMap(([label, value], i) => [
      '  ' + text(style.label.font, label.toUpperCase(), LABEL_X, ROW_Y + i * ROW_LH - 1, style.label.size, c.secondary, style.label.opts),
      '  ' + text(style.body.font, value, VALUE_X, ROW_Y + i * ROW_LH, style.body.size, c.primary),
    ]),
  ].join('\n');

  return frame({
    H, c, body,
    title: 'Languages and tools',
    desc: t.rows.map(([l, v]) => `${l}: ${plain(v)}`).join('. ') + '.',
  });
}

// ---- write everything ---------------------------------------------------

function write(name, svg) {
  const file = path.join(OUT, `${name}.svg`);
  fs.writeFileSync(file, svg);
  console.log(`${name.padEnd(18)} ${(fs.statSync(file).size / 1024).toFixed(0).padStart(4)} KB`);
}

for (const [name, c] of Object.entries(themes)) {
  write(`banner-${name}`, banner(c));
  write(`about-${name}`, about(c));
  write(`projects-${name}`, projects(c));
  write(`toolbox-${name}`, toolbox(c));
}

module.exports = { copy };
