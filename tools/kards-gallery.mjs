#!/usr/bin/env node
// kards-gallery.mjs - write sample cards as PNG files, drawn by kards/kardart.mjs and encoded by kards/kardpng.mjs.
//   node tools/kards-gallery.mjs            write kards/gallery/: a contact sheet of the 12 sample cards per theme, a hero card per theme,
//                                          the sample estate per theme and the UI kit sheet (every glyph and icon)
//   node tools/kards-gallery.mjs --all      also write every sample card, each theme, at the DIGI card's size (384 x 560) into kards/gallery/full/
//   node tools/kards-gallery.mjs --check    exit 1 unless the committed files are exactly what the engine draws now (CI runs this)
//   node tools/kards-gallery.mjs --out DIR  write somewhere else
import { paintArt, THEMES } from '../kards/kardart.mjs';
import { pngOf } from '../kards/kardpng.mjs';
import { SAMPLES } from '../kards/samples.mjs';
import { paintEstate } from '../kards/estate.mjs';
import { CHARSET, UI_ICONS, DATASET_ICONS, STAR, DOCK, ACTIONS, paintText } from '../kards/ui.mjs';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const W = 192, H = 280, COLS = 4;   // a contact-sheet tile: the card's own 192 x 280 canvas, 1:1
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** → Map of file name -> PNG bytes, for the contact sheets and hero cards (and every card at full size with all = true). */
export function gallery(all = false) {
  const files = new Map();
  const png = (px, w, h) => { const r = pngOf(px, w, h); if (!r.ok) throw new Error(r.why); return r.png; };
  const draw = (f, theme, w, h) => { const r = paintArt(f, theme, w, h); if (!r.ok) throw new Error(f.title + ': ' + r.why); return r.px; };
  for (const theme of Object.keys(THEMES)) {
    const rows = Math.ceil(SAMPLES.length / COLS), sw = COLS * W, sheet = new Uint8Array(sw * rows * H * 3).fill(16);
    SAMPLES.forEach((f, k) => {
      const px = draw(f, theme, W, H), ox = (k % COLS) * W, oy = Math.floor(k / COLS) * H;
      for (let y = 0; y < H; y++) sheet.set(px.subarray(y * W * 3, (y + 1) * W * 3), ((oy + y) * sw + ox) * 3);
    });
    files.set('sheet-' + theme + '.png', png(sheet, sw, rows * H));
    files.set('hero-' + theme + '.png', png(draw(SAMPLES[4], theme, 384, 560), 384, 560));
    if (all) SAMPLES.forEach((f, k) => files.set('full/' + theme + '-' + String(k + 1).padStart(2, '0') + '-' + slug(f.title) + '.png', png(draw(f, theme, 384, 560), 384, 560)));
  }
  for (const theme of Object.keys(THEMES)) { const r = paintEstate(ESTATE, theme, 480, 320); if (!r.ok) throw new Error(r.why); files.set('estate-' + theme + '.png', png(r.px, 480, 320)); }
  files.set('ui-kit.png', png(...uiSheet()));
  return files;
}

// the sample estate: eight of the sample cards as towers (one a new child), two mesh wires, four tool blocks
export const ESTATE = { cards: SAMPLES.slice(0, 8).map((s, n) => ({ id: s.id, dataset: s.dataset, department: s.department, stage: s.stage, rarity: s.rarity, generation: s.generation, fresh: n === 1 })), wires: [[SAMPLES[0].id, SAMPLES[2].id], [SAMPLES[2].id, SAMPLES[4].id]], tools: 4 };

// the UI kit sheet: every character in the font (as paintText draws it), then every icon at 3x, on the synthwave panel colour
function uiSheet() {
  const W2 = 640, H2 = 300, px = new Uint8Array(W2 * H2 * 3);
  for (let i = 0; i < W2 * H2; i++) px.set([0x12, 0x06, 0x26], i * 3);
  const put = (r, x0, y0) => { for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) { const o = (y * r.w + x) * 4; if (r.px[o + 3]) px.set([r.px[o], r.px[o + 1], r.px[o + 2]], ((y0 + y) * W2 + x0 + x) * 3); } };
  put(paintText('PIXELWHISPERER UI KIT', 2, '#ffd23c', '#4a1480'), 16, 12);
  const chars = Array.from(CHARSET);
  for (let line = 0; line * 48 < chars.length; line++) put(paintText(chars.slice(line * 48, line * 48 + 48).join(''), 2, '#ffffff'), 16, 44 + line * 24);
  const icons = [...DOCK.map((n) => UI_ICONS[n]), ...ACTIONS.map((n) => UI_ICONS[n]), ...Object.values(DATASET_ICONS)];
  icons.forEach((rows, n) => { const x0 = 16 + (n % 12) * 52, y0 = 108 + Math.floor(n / 12) * 56; rows.forEach((row, y) => Array.from(row).forEach((c, x) => { if (c === '#') for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) px.set([0x2b, 0xe8, 0xff], ((y0 + y * 3 + dy) * W2 + x0 + x * 3 + dx) * 3); })); });
  STAR.forEach((row, y) => Array.from(row).forEach((c, x) => { if (c === '#') for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 4; dx++) px.set([0xff, 0xe6, 0x80], ((108 + 2 * 56 + y * 4 + dy) * W2 + 16 + 4 * 52 + x * 4 + dx) * 3); }));
  return [px, W2, H2];
}

if (process.argv[1] && process.argv[1].endsWith('kards-gallery.mjs')) {
  const args = process.argv.slice(2), at = args.indexOf('--out');
  const out = at >= 0 ? args[at + 1] : join(dirname(fileURLToPath(import.meta.url)), '..', 'kards', 'gallery');
  const files = gallery(args.includes('--all'));
  if (args.includes('--check')) {
    const bad = [...files].filter(([name, bytes]) => !existsSync(join(out, name)) || !Buffer.from(bytes).equals(readFileSync(join(out, name)))).map(([name]) => name);
    if (bad.length) { console.log('GALLERY DRIFT - not what the engine draws now: ' + bad.join(', ')); process.exit(1); }
    console.log('GALLERY OK - ' + files.size + ' files are exactly what kardart.mjs draws');
  } else {
    for (const [name, bytes] of files) { mkdirSync(dirname(join(out, name)), { recursive: true }); writeFileSync(join(out, name), bytes); }
    console.log('wrote ' + files.size + ' files into ' + out);
  }
}
