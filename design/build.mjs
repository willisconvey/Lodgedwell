#!/usr/bin/env node
/**
 * Lodgedwell design-system builder.
 *
 *   node design/build.mjs
 *
 * Reads the REAL site stylesheet (public/assets/css/styles.css) and the logo
 * SVGs, plus the section snippets in design/sections/*.html, and writes:
 *
 *   design/build/*.dc.html + canvas.json   → Claude Design canvas artboards
 *                                            (seed them with the `design` skill,
 *                                            see design/README.md)
 *   design-system/                          → sync-ready bundle for claude.ai/design
 *                                            (DesignSync / /design-sync)
 *
 * Both outputs are generated. Edit design/sections/*.html, styles.css or the
 * files in design/static/, then re-run this script.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, copyFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const css = readFileSync(join(root, 'public/assets/css/styles.css'), 'utf8');
const imgDir = join(root, 'public/assets/img');
const images = ['lodgedwell-horizontal.svg', 'lodgedwell-reversed.svg', 'lodgedwell-icon.svg', 'favicon.svg'];

const FONTS = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400..800;1,400..800&family=Public+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=IBM+Plex+Mono:wght@400;500;600&display=swap';
const EXTRA_CSS = `
html, body { margin: 0; background: #FAF6EF; }
a:hover { color: #164C3B; }
.reveal { opacity: 1; transform: none; }
.ds-label { display: flex; align-items: baseline; gap: 12px; margin: 0 0 18px; padding-bottom: 10px; border-bottom: 1px solid #E4DCCF; }
.ds-label b { font: 600 12px/1 'Public Sans', system-ui, sans-serif; letter-spacing: .08em; text-transform: uppercase; color: #1E5C4A; }
.ds-label span { font: 500 12px/1.4 'IBM Plex Mono', ui-monospace, Menlo, monospace; color: #75857E; }
`;

// ---- sections -------------------------------------------------------------
const secDir = join(here, 'sections');
const sections = readdirSync(secDir).filter((f) => f.endsWith('.html')).sort().map((f) => {
  const src = readFileSync(join(secDir, f), 'utf8');
  const m = src.match(/^<!--\s*@section\s+(.*?)\s*-->\s*\n/);
  if (!m) throw new Error(`${f}: missing @section header`);
  const meta = {};
  for (const [, k, v] of m[1].matchAll(/(\w+)="([^"]*)"/g)) meta[k] = v;
  const [w, h] = meta.viewport.split('x').map(Number);
  const body = src.slice(m[0].length).trim();
  if (body.includes('{{')) throw new Error(`${f}: "{{" is a template hole in .dc.html — remove it`);
  return { id: f.replace(/\.html$/, ''), file: f, ...meta, w, h, body };
});
const byId = Object.fromEntries(sections.map((s) => [s.id.replace(/^\d+-/, ''), s]));
const pick = (...ids) => ids.map((id) => { if (!byId[id]) throw new Error(`unknown section ${id}`); return byId[id]; });

// ---- artboards ------------------------------------------------------------
const ARTBOARDS = [
  { name: 'Main',       title: 'Brand and colour', w: 1200, padded: true,  secs: pick('brand-logo', 'colors-neutrals', 'colors-green', 'colors-accent', 'colors-roles') },
  { name: 'Typography', title: 'Typography',        w: 1200, padded: true,  secs: pick('type-faces', 'type-scale', 'spacing') },
  { name: 'Components', title: 'Components',        w: 1200, padded: true,  secs: pick('buttons', 'pills-tabs', 'cards', 'lists-forms') },
  { name: 'Sections',   title: 'Page sections',     w: 1200, padded: true,  secs: pick('pricing', 'bands') },
  { name: 'Website',    title: 'Site chrome (desktop)', w: 1440, padded: false, secs: pick('header', 'hero', 'footer') },
  { name: 'Mobile',     title: 'Site chrome (mobile)',  w: 390,  padded: false, secs: pick('header', 'hero', 'footer') },
];

const imgRef = (body, prefix) => body.replace(/@@img\//g, prefix);

function artboardHtml(ab) {
  const parts = ab.secs.map((s) => ab.padded
    ? `<section style="padding: 40px 40px 12px;">\n<div class="ds-label"><b>${s.group}</b><span>${s.name} · ${s.subtitle}</span></div>\n${imgRef(s.body, '')}\n</section>`
    : imgRef(s.body, ''));
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <link rel="stylesheet" href="${FONTS}">
  <style>
${css}
${EXTRA_CSS}
  </style>
</helmet>
<div style="background: #FAF6EF; min-height: 100%;">
${parts.join('\n')}
</div>
</x-dc>
</body>
</html>
`;
}

function artboardHeight(ab) {
  if (!ab.padded) {
    // full-bleed: sum of section viewport heights; mobile stacks much taller
    const base = ab.secs.reduce((n, s) => n + s.h, 0);
    return ab.w < 600 ? Math.round(base * 2.35) : Math.round(base * 1.05) + 40;
  }
  return Math.round(ab.secs.reduce((n, s) => n + s.h + 100, 0) * 1.05) + 40;
}

const buildDir = join(here, 'build');
rmSync(buildDir, { recursive: true, force: true });
mkdirSync(buildDir, { recursive: true });

const layout = [];
let x = 0, y = 0, rowH = 0;
const GAP_X = 120, GAP_Y = 160, ROW_MAX = 3;
ARTBOARDS.forEach((ab, i) => {
  const h = artboardHeight(ab);
  if (i && i % ROW_MAX === 0) { x = 0; y += rowH + GAP_Y; rowH = 0; }
  layout.push({ file: `${ab.name}.dc.html`, title: ab.title, x, y, w: ab.w, h });
  x += ab.w + GAP_X; rowH = Math.max(rowH, h);
  writeFileSync(join(buildDir, `${ab.name}.dc.html`), artboardHtml(ab));
});
const canvas = {
  artboards: layout,
  annotations: [
    { id: 'how-to-use', x: 0, y: -170, w: 560, text: 'Lodgedwell design system — generated from the live site stylesheet (lodgedwell-astro/public/assets/css/styles.css) and the real logo files.\nSource of truth is the code: edit styles.css or design/sections/*.html, run `node design/build.mjs`, then re-seed this canvas (design/README.md).' },
  ],
  launch: { view: 'canvas' },
};
writeFileSync(join(buildDir, 'canvas.json'), JSON.stringify(canvas, null, 2));

// ---- design-system bundle ---------------------------------------------------
const dsDir = join(root, 'design-system');
rmSync(dsDir, { recursive: true, force: true });
for (const d of ['tokens', 'assets', 'guidelines', 'components', 'ui_kits/website']) mkdirSync(join(dsDir, d), { recursive: true });
writeFileSync(join(dsDir, 'styles.css'), css);
const rootBlock = css.match(/:root\s*\{[\s\S]*?\n\}/);
writeFileSync(join(dsDir, 'tokens/tokens.css'), `/* Lodgedwell — design tokens (extracted from public/assets/css/styles.css by design/build.mjs; do not hand-edit) */\n${rootBlock ? rootBlock[0] : ''}\n`);
for (const f of images) copyFileSync(join(imgDir, f), join(dsDir, 'assets', f));
for (const f of readdirSync(join(here, 'static'))) copyFileSync(join(here, 'static', f), join(dsDir, f));

const GROUP_DIR = { Brand: 'guidelines', Colors: 'guidelines', Type: 'guidelines', Spacing: 'guidelines', Components: 'components', Sections: 'components', Website: 'ui_kits/website' };
function card({ group, name, subtitle, viewport, bodies, padded }) {
  const dir = GROUP_DIR[group];
  const rel = dir.includes('/') ? '../..' : '..';
  return `<!-- @dsCard group="${group}" viewport="${viewport}" name="${name}" subtitle="${subtitle}" -->
<!DOCTYPE html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="${FONTS}">
<link rel="stylesheet" href="${rel}/styles.css">
<style>
html, body { margin: 0; background: #FAF6EF; }
a:hover { color: #164C3B; }
.reveal { opacity: 1; transform: none; }
body { padding: ${padded ? '24px' : '0'}; }
</style>
</head>
<body>
${bodies.map((b) => imgRef(b, `${rel}/assets/`)).join('\n')}
</body>
</html>
`;
}
for (const s of sections) {
  const dir = GROUP_DIR[s.group];
  const slug = s.id.replace(/^\d+-/, '');
  writeFileSync(join(dsDir, dir, `${slug}.html`), card({ ...s, bodies: [s.body], padded: s.group !== 'Website' }));
}
writeFileSync(join(dsDir, 'ui_kits/website/index.html'), card({ group: 'Website', name: 'Marketing site (desktop)', subtitle: 'Header, homepage hero and footer stacked', viewport: '1440x1100', bodies: pick('header', 'hero', 'footer').map((s) => s.body), padded: false }));

console.log(`built ${ARTBOARDS.length} artboards → design/build/, ${sections.length + 1} cards → design-system/`);
for (const l of layout) console.log(`  ${l.file.padEnd(20)} ${l.w}×${l.h} @ ${l.x},${l.y}`);
