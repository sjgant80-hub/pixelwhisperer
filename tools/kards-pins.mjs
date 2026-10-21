#!/usr/bin/env node
// kards-pins.mjs — print the pins for a PUBLISHED theme, in the shape kards/kardart.test.mjs embeds them.
//   node tools/kards-pins.mjs [themeId ...]      (no ids: every theme in the registry)
// A published theme is never changed, so this is run ONCE per new theme id (e.g. 'synthwave-v2') and its output pasted into
// the test as a new entry. Never re-run it over an existing theme to make a red test green: a red pin means a published theme
// changed, and a changed theme must be a new id instead.
import { paintArt, spriteOf, THEMES } from '../kards/kardart.mjs';
import { SAMPLES } from '../kards/samples.mjs';
import { corpus, idOf, sha256 } from '../kards/corpus.mjs';
import { createHash } from 'node:crypto';

export const HERO = [0, 1, 2, 3, 4];          // SAMPLES indexes drawn at the DIGI card's size: all five rarities
export const ODD = [[64, 64], [100, 333]];    // sizes that are not an exact 2x of the 192 x 280 canvas
export function pinsFor(theme) {
  const all = createHash('sha256');
  for (const f of corpus(36)) all.update(paintArt(f, theme, 192, 280).px);
  return {
    hero: HERO.map((i) => [SAMPLES[i].id, sha256(paintArt(SAMPLES[i], theme, 384, 560).px)]),
    corpus: all.digest('hex'),
    odd: ODD.map(([w, h]) => sha256(paintArt(SAMPLES[7], theme, w, h).px)),
  };
}
export function spritePin() {
  const all = createHash('sha256');
  for (let i = 0; i < 2000; i++) { const s = spriteOf(idOf('sprite-' + i)); all.update(JSON.stringify(s.g)); all.update(s.v); }
  return all.digest('hex');
}

if (process.argv[1] && process.argv[1].endsWith('kards-pins.mjs')) {
  const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(THEMES);
  const out = {};
  for (const id of ids) { if (!Object.hasOwn(THEMES, id)) { console.error('no such theme: ' + id); process.exit(1); } out[id] = pinsFor(id); }
  console.log(JSON.stringify({ themes: out, sprites: spritePin() }, null, 2));
}
