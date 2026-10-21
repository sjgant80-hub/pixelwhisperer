#!/usr/bin/env node
// kards-font.mjs - write the PixelWhisperer UI font from the one glyph table (kards/ui.mjs GLYPHS, built on kardart.mjs FONT).
//   node tools/kards-font.mjs            write kards/fonts/PixelWhisperer.ttf and kards/fonts/pixelwhisperer.css
//   node tools/kards-font.mjs --check    exit 1 unless the committed files are exactly what the glyph table makes now (CI runs this)
import { GLYPHS } from '../kards/ui.mjs';
import { ttfOf } from '../kards/ttf.mjs';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

export const NOTICE = 'PixelWhisperer: the 5x9 pixel font of PixelWhisperer Kards, built by Kar. MIT licence. Powered by the Konomi architecture, created by Thomas Frumkin.';
export const CSS = `/* PixelWhisperer: the 5 x 9 pixel font the DIGI cards are drawn in, as a real font (kards/fonts/PixelWhisperer.ttf).
   Use it at font-size 9px x k (9px, 18px, 27px, 36px ...): one glyph pixel is then exactly k CSS pixels.
   Line height is one em (9 pixels: 7 above the baseline, 2 below); every glyph advances 6 pixels (monospaced). */
@font-face {
  font-family: 'PixelWhisperer';
  src: url('PixelWhisperer.ttf') format('truetype');
  font-display: block;
}
.pw { font-family: 'PixelWhisperer', monospace; line-height: 1; font-kerning: none; font-variant-ligatures: none; -webkit-font-smoothing: none; font-smooth: never; }
.pw-1 { font-size: 9px; } .pw-2 { font-size: 18px; } .pw-3 { font-size: 27px; } .pw-4 { font-size: 36px; }
`;
/** -> Map of file name -> bytes */
export function fontFiles() {
  const r = ttfOf(GLYPHS, { family: 'PixelWhisperer', version: '1.000', notice: NOTICE });
  if (!r.ok) throw new Error(r.why);
  return new Map([['PixelWhisperer.ttf', r.ttf], ['pixelwhisperer.css', new TextEncoder().encode(CSS)]]);
}

if (process.argv[1] && process.argv[1].endsWith('kards-font.mjs')) {
  const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'kards', 'fonts'), files = fontFiles();
  if (process.argv.includes('--check')) {
    const bad = [...files].filter(([name, bytes]) => !existsSync(join(out, name)) || !Buffer.from(bytes).equals(readFileSync(join(out, name)))).map(([name]) => name);
    if (bad.length) { console.log('FONT DRIFT - not what the glyph table makes now: ' + bad.join(', ')); process.exit(1); }
    console.log('FONT OK - ' + files.size + ' files are exactly what the glyph table makes');
  } else {
    mkdirSync(out, { recursive: true });
    for (const [name, bytes] of files) writeFileSync(join(out, name), bytes);
    console.log('wrote ' + [...files.keys()].join(', ') + ' into ' + out + ' (' + files.get('PixelWhisperer.ttf').length + ' bytes of font)');
  }
}
