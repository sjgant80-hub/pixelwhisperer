#!/usr/bin/env node
// kards-gallery.mjs - write sample cards as PNG files, drawn by kards/kardart.mjs and encoded by kards/kardpng.mjs.
//   node tools/kards-gallery.mjs            write kards/gallery/: a contact sheet of the 12 sample cards per theme, and a hero card per theme
//   node tools/kards-gallery.mjs --all      also write every sample card, each theme, at the DIGI card's size (384 x 560) into kards/gallery/full/
//   node tools/kards-gallery.mjs --check    exit 1 unless the committed files are exactly what the engine draws now (CI runs this)
//   node tools/kards-gallery.mjs --out DIR  write somewhere else
import { paintArt, THEMES } from '../kards/kardart.mjs';
import { pngOf } from '../kards/kardpng.mjs';
import { SAMPLES } from '../kards/samples.mjs';
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
  return files;
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
