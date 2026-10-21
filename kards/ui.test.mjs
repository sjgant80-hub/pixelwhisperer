// ui.test.mjs - the UI kit: one glyph table built on the card font, the dock and action icons, the key identicon, crisp labels.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { GLYPHS, CHARSET, UI_EXTRA, UI_ICONS, DATASET_ICONS, STAR, DOCK, ACTIONS, INVENTORY, GEAR_SLOTS, WORLD_ICONS, FITS, FORM_ICONS, drawable, identicon, paintText } from './ui.mjs';
import { FONT, ICON_ROWS, FORM_ICON_ROWS, STAR_ROWS, GEAR } from './kardart.mjs';
import { violations } from './source-check.mjs';

const sha = (x) => createHash('sha256').update(typeof x === 'string' ? x : Buffer.from(x)).digest('hex');
const refused = (r, why) => { assert.equal(r.ok, false); assert.equal(typeof r.why, 'string'); if (why) assert.match(r.why, why); };
const KEY = 'a3f1' + '0'.repeat(56) + '9c07';

test('the glyph table: the card font, plus every glyph a label needs, a real space, and no currency', () => {
  assert.ok(Object.isFrozen(GLYPHS));
  for (const ch of ": / < > = + % ( ) , ' ’ \" ! ? · × ≤ ≥ → ← ✓ ✗ … _ | [ ]".split(' ')) assert.ok(drawable(ch), 'has ' + ch);
  assert.ok(drawable(' ') && GLYPHS[' '].every((r) => r === '.....'), 'a real space: an empty glyph');
  for (const ch of '$€£¥¢₹₿~') assert.equal(drawable(ch), false, 'no ' + ch);
  assert.equal(CHARSET.length, 95);
  assert.deepEqual(Array.from(CHARSET).sort(), Object.keys(GLYPHS).sort());
  for (let i = 1; i < CHARSET.length; i++) assert.ok(CHARSET.charCodeAt(i) > CHARSET.charCodeAt(i - 1), 'code point order');
  for (const [ch, rows] of Object.entries(GLYPHS)) { assert.ok(Object.isFrozen(rows)); assert.equal(rows.length, 9, ch); for (const r of rows) assert.match(r, /^[.#]{5}$/, ch); }
  const bitmaps = Object.entries(GLYPHS).filter(([ch]) => ch !== ' ').map(([, rows]) => rows.join(''));
  assert.equal(new Set(bitmaps).size, bitmaps.length, 'no two glyphs alike');
  assert.equal(UI_EXTRA.length, 26);
});

test('one source: every card glyph is the card font, cell for cell; the ellipsis is the card id’s', () => {
  for (const e of FONT) {
    const r0 = Number(e[2]), rows = e.slice(4).split('/'), want = Array.from({ length: 9 }, (_, i) => rows[i - r0] || '.....');
    if (e[0] === '~') assert.deepEqual([...GLYPHS['…']], want); else assert.deepEqual([...GLYPHS[e[0]]], want, e[0]);
  }
  assert.equal(DATASET_ICONS, ICON_ROWS);
  assert.equal(STAR, STAR_ROWS);
  assert.equal(sha(JSON.stringify(GLYPHS)), '753260d7b173bef87f2a227a713230d6f463d9b2a8835b9642c1bb919a6e4e0e');   // the published UI font: a change is a new font version
});

test('the icons: the eight dock slots and nine actions, 16 x 16 cells each, every one its own picture', () => {
  assert.deepEqual(DOCK, ['estate', 'base', 'cards', 'evals', 'mint', 'mesh', 'send', 'proof']);
  assert.deepEqual(ACTIONS, ['boot', 'eval', 'train', 'breed', 'skin', 'share', 'verify', 'key', 'lock']);
  assert.deepEqual(INVENTORY, ['slot', 'slot-filled', 'equip']);
  assert.deepEqual(GEAR_SLOTS, ['ally', 'tool', 'voice']);
  assert.deepEqual(WORLD_ICONS, ['inbox', 'fuse', 'next', 'world']);
  assert.deepEqual(Object.keys(UI_ICONS), [...DOCK, ...ACTIONS, ...INVENTORY, ...GEAR_SLOTS, ...WORLD_ICONS], 'the published icons first, the new ones appended');
  for (const [name, rows] of Object.entries({ ...UI_ICONS, ...FORM_ICONS })) {
    assert.ok(Object.isFrozen(rows));
    assert.equal(rows.length, 16, name);
    for (const r of rows) assert.match(r, /^[.#]{16}$/, name);
    const ink = rows.join('').split('#').length - 1;
    assert.ok(ink >= 20 && ink <= 200, name + ' has a shape: ' + ink);
  }
  const all = [...Object.values(UI_ICONS), ...Object.values(ICON_ROWS), ...Object.values(FORM_ICONS)].map((rows) => rows.join(''));
  assert.equal(new Set(all).size, all.length, 'no icon repeats another, a dataset icon or a form icon');
  const pick = (names) => JSON.stringify(Object.fromEntries(names.map((k) => [k, UI_ICONS[k]])));
  assert.equal(sha(pick([...DOCK, ...ACTIONS])), 'f364eec6f34fef6c3995d1aafb48007b6eaafe1164915bd13ee154a1dc89f30c', 'the published dock and action icons, unchanged');
  assert.equal(sha(pick([...INVENTORY, ...GEAR_SLOTS])), 'f2858318ff7f3c35c747048bf9217538cdb80ace92ca767098e696afdfaf69f7', 'the inventory and gear-slot icons');
  assert.equal(sha(pick(WORLD_ICONS)), '1706e2dfc1cbb882c45df3ad9902a21430e338b7c709ea96a28882e1b3bc5c1a', 'the DIGI World icons');
  assert.equal(FORM_ICONS, FORM_ICON_ROWS, 'the form icons are kardart.mjs\x27s own table');
  assert.deepEqual(FITS, { ally: ['node', 'router'], tool: ['app', 'pwa'], voice: ['talker'] });
  for (const [slot, forms] of Object.entries(FITS)) for (const form of forms) assert.equal(GEAR[form], slot, 'one source: kardart.mjs\x27s GEAR');
  assert.ok(Object.isFrozen(FITS) && Object.values(FITS).every(Object.isFrozen));
});

test('identicon: a key’s face, mirrored, bordered, deterministic, different for different keys', () => {
  const a = identicon(KEY), b = identicon(KEY);
  assert.equal(a.ok, true);
  assert.deepEqual(a, b);
  assert.equal(a.size, 10); assert.equal(a.cells.length, 100); assert.equal(a.px.length, 300);
  for (const c of Object.values(a.colors)) assert.match(c, /^#[0-9a-f]{6}$/);
  for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) {
    const v = a.cells[y * 10 + x], edge = x === 0 || y === 0 || x === 9 || y === 9;
    assert.equal(edge, v === 3, 'border');
    assert.equal(v, a.cells[y * 10 + 9 - x], 'mirror');
  }
  assert.equal(identicon(KEY, 32).px.length, 320 * 320 * 3, 'scale 32 is allowed');
  const big = identicon(KEY, 4);
  assert.equal(big.px.length, 40 * 40 * 3);
  for (let y = 0; y < 40; y++) for (let x = 0; x < 40; x++) for (let c = 0; c < 3; c++) assert.equal(big.px[(y * 40 + x) * 3 + c], a.px[((y >> 2) * 10 + (x >> 2)) * 3 + c]);
  const faces = new Set();
  for (let n = 0; n < 1000; n++) { const f = identicon(randomBytes(32).toString('hex')); faces.add(Buffer.from(f.cells).toString('hex') + JSON.stringify(f.colors)); }
  assert.equal(faces.size, 1000);
  for (let bit = 0; bit < 256; bit += 7) {   // every part of the key counts
    const k = Array.from(KEY), i = bit >> 2; k[i] = '0123456789abcdef'[('0123456789abcdef'.indexOf(k[i]) ^ (1 << (bit & 3)))];
    assert.notDeepEqual(identicon(k.join('')), a, 'bit ' + bit);
  }
  assert.equal(sha(identicon(KEY, 3).px), '539081ec1d09dd5f7cd792a0da4ba998644eb66fe636a9604e6d9c8325c628f7');
  for (const k of [null, undefined, 5, '', KEY.toUpperCase(), KEY.slice(1), KEY + '0', 'g'.repeat(64), [KEY], { toString: () => KEY }]) refused(identicon(k), /64 lowercase hex/);
  for (const s of [0, 33, 1.5, '2', NaN, null]) refused(identicon(KEY, s), /scale/);
});

test('paintText: a label as crisp pixels, from the same glyphs, at any whole scale', () => {
  const r = paintText('LV 9', 2, '#ff2bd6');
  assert.equal(r.ok, true); assert.equal(r.w, (4 * 6 - 1) * 2); assert.equal(r.h, 18); assert.equal(r.px.length, r.w * r.h * 4);
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
    const ch = 'LV 9'[Math.floor(x / 12)], col = Math.floor((x % 12) / 2), row = Math.floor(y / 2), on = col < 5 && GLYPHS[ch][row][col] === '#', o = (y * r.w + x) * 4;
    assert.deepEqual([...r.px.subarray(o, o + 4)], on ? [0xff, 0x2b, 0xd6, 255] : [0, 0, 0, 0]);
  }
  const s = paintText('A', 1, '#ffffff', '#000000');
  assert.equal(s.w, 6); assert.equal(s.h, 10);
  assert.deepEqual([...s.px.subarray((7 * 6 + 5) * 4, (7 * 6 + 5) * 4 + 4)], [0, 0, 0, 255], 'the shadow of the last ink (row 6, column 4), one pixel down and right');
  assert.deepEqual([...s.px.subarray(1 * 4, 2 * 4)], [255, 255, 255, 255], 'the glyph over it');
  assert.equal(paintText('', 1).w, 1);
  assert.equal(paintText('x'.repeat(200), 1).ok, true, 'exactly 200 characters is allowed');
  assert.equal(paintText('x', 16).ok, true, 'scale 16 is allowed'); assert.equal(paintText('x', 16).h, 144);
  assert.equal(paintText('x', 1).ok, true, 'scale 1 is allowed');
  for (const [t, k, c, sh] of [['$5', 1, '#ffffff', null], ['x'.repeat(201), 1, '#ffffff', null], ['ok', 0, '#ffffff', null], ['ok', 17, '#ffffff', null], ['ok', 1, '#FFFFFF', null], ['ok', 1, 'white', null], ['ok', 1, '#ffffff', 'black'], [5, 1, '#ffffff', null], ['ok', 1.5, '#ffffff', null]]) refused(paintText(t, k, c, sh));
});

test('the UI kit keeps the kernel rules: integer-only, deterministic, browser-safe, importing only the card engine', () => {
  assert.deepEqual(violations(readFileSync(new URL('./ui.mjs', import.meta.url), 'utf8'), { imports: ['./kardart.mjs'] }), []);
  assert.doesNotThrow(() => { for (const x of [null, undefined, {}, [], 5n, Symbol('s'), { toString() { throw new Error('x'); } }]) { identicon(x); identicon(KEY, x); paintText(x); paintText('a', x); paintText('a', 1, x); drawable(x); } });
});
