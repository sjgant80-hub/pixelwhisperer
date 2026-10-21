// kardart.test.mjs — the proof for the card art engine. Run with: node --test kards/kardart.test.mjs
// The witness (witness-kards.mjs) mutates kardart.mjs and these tests must kill every mutant, with nothing baselined.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { THEMES, paintArt, spriteOf, checkFacts, FONT, ICON_ROWS, STAR_ROWS, RAR, DATASETS as KDATASETS, RARITIES as KRARITIES, PIXEL, creatureFront } from './kardart.mjs';
import { SAMPLES } from './samples.mjs';
import { corpus, idOf, sha256, DATASETS, RARITIES, TITLE_CHARS, DEPT_CHARS } from './corpus.mjs';
import { pinsFor, spritePin } from '../tools/kards-pins.mjs';
import { PINS, SPRITES } from './kardart.pins.mjs';

const SRC = readFileSync(new URL('./kardart.mjs', import.meta.url), 'utf8');
const GOOD = SAMPLES[0];
const draw = (f, theme = 'synthwave-v1', w = 192, h = 280) => { const r = paintArt(f, theme, w, h); assert.equal(r.ok, true, r.why); return r.px; };
const same = (a, b) => Buffer.from(a).equals(Buffer.from(b));
const THEME_IDS = Object.keys(THEMES);
const refused = (r, why) => { assert.equal(r.ok, false); assert.equal(typeof r.why, 'string'); assert.ok(r.why.length > 5); if (why) assert.match(r.why, why); };

test('the registry: published themes are frozen, versioned, named, and never call themselves by a trademark', () => {
  assert.deepEqual(THEME_IDS.slice(0, 4), ['synthwave-v1', 'blockcraft-v1', 'lcd-v1', 'memphis-v1']);   // append-only: new themes join at the end
  assert.ok(Object.isFrozen(THEMES));
  for (const [id, t] of Object.entries(THEMES)) {
    assert.equal(t.id, id);
    assert.ok(id.length > 3 && id.indexOf('-v') > 0 && Number.isInteger(Number(id.slice(id.indexOf('-v') + 2))) && Number(id.slice(id.indexOf('-v') + 2)) > 0, id + ' is name-vN');
    assert.ok(Object.isFrozen(t));
    assert.ok(typeof t.name === 'string' && t.name.length > 2 && typeof t.blurb === 'string' && t.blurb.length > 10);
    assert.equal((id + t.name + t.blurb).toLowerCase().includes('mine' + 'craft'), false);
  }
  assert.equal(THEMES['blockcraft-v1'].name, 'Blockcraft');
  assert.equal(THEMES['synthwave-v1'].name, 'Synthwave');
  assert.equal(THEMES['lcd-v1'].name, 'Pocket LCD');
  assert.equal(THEMES['memphis-v1'].name, 'Memphis Pop');
  assert.equal(SRC.toLowerCase().includes('mine' + 'craft'), false);
});

test('published cards re-draw byte for byte: pinned sha256 of the hero cards (384 x 560), a 36-card corpus and odd sizes', () => {
  for (const theme of THEME_IDS) {
    assert.deepEqual(pinsFor(theme), PINS[theme], theme + ' changed: a published theme is never edited, add a new id instead');
  }
});

test('the same facts and theme always give the same bytes, in any order, and a card is not changed by the cards drawn before it', () => {
  const a1 = draw(SAMPLES[2], 'blockcraft-v1'), b = draw(SAMPLES[5], 'synthwave-v1'), a2 = draw(SAMPLES[2], 'blockcraft-v1');
  assert.ok(same(a1, a2));
  assert.equal(same(a1, b), false);
  assert.equal(same(draw(GOOD, 'synthwave-v1'), draw(GOOD, 'blockcraft-v1')), false);   // the re-skin changes the picture
  const frozen = JSON.parse(JSON.stringify(GOOD)); Object.freeze(frozen); Object.freeze(frozen.parents);
  assert.ok(same(draw(frozen), draw(GOOD)));                                              // frozen facts draw the same; and drawing never edits its input
  assert.deepEqual(frozen, GOOD);
});

test('sizes: 384 x 560 is an exact 2x of the 192 x 280 canvas; every size from 64 to 1024 paints; others are refused', () => {
  for (const theme of THEME_IDS) {
    const small = draw(SAMPLES[4], theme, 192, 280), big = draw(SAMPLES[4], theme, 384, 560);
    assert.equal(big.length, 384 * 560 * 3);
    for (const [x, y] of [[0, 0], [383, 559], [100, 301], [255, 17], [3, 558], [380, 2]]) for (let c = 0; c < 3; c++) assert.equal(big[(y * 384 + x) * 3 + c], small[((y >> 1) * 192 + (x >> 1)) * 3 + c]);
    let same2x = true;
    for (let y = 0; y < 560; y++) for (let x = 0; x < 384; x++) for (let c = 0; c < 3; c++) if (big[(y * 384 + x) * 3 + c] !== small[((y >> 1) * 192 + (x >> 1)) * 3 + c]) same2x = false;
    assert.ok(same2x);
  }
  for (const [w, h] of [[64, 64], [1024, 1024], [64, 1024], [1024, 64], [100, 333], [511, 777]]) {
    const r = paintArt(GOOD, 'blockcraft-v1', w, h);
    assert.equal(r.ok, true);
    assert.ok(r.px instanceof Uint8Array);
    assert.equal(r.px.length, w * h * 3);
  }
  for (const [w, h] of [[63, 280], [192, 63], [1025, 280], [192, 1025], [192.5, 280], [192, 280.5], ['192', 280], [192, '280'], [NaN, 280], [192, Infinity], [null, 280], [192, undefined], [-192, 280], [0, 0], [192n, 280], [[192], 280]]) refused(paintArt(GOOD, 'synthwave-v1', w, h), /width and height/);
});

const PAL = {   // the frame's two outer tones per rarity, by theme: common, uncommon, rare, epic, legendary (grey, green, blue, purple, gold)
  shared: { hi: [0xc8ccd6, 0x86ff92, 0x80c4ff, 0xdba2ff, 0xffe680], mid: [0x8a8f9e, 0x36c44c, 0x3a7ee8, 0x9c4ee2, 0xf2b422] },
  'lcd-v1': { hi: [0xd8dccf, 0xc8e078, 0xb8d4ff, 0xe0c8ff, 0xffe890], mid: [0x9aa095, 0x8bac0f, 0x5f8fe8, 0xa06ad8, 0xd09a20] },
  'memphis-v1': { hi: [0x646b79, 0x16a34a, 0x2563eb, 0x9333ea, 0xd97706], mid: [0x9aa3b2, 0x4ade80, 0x60a5fa, 0xc084fc, 0xfbbf24] },
};
test('the card has the facts of the card: the frame is the rarity palette (grey, green, blue, purple, gold) in every theme', () => {
  const r = (c) => c >> 16, g = (c) => (c >> 8) & 255, b = (c) => c & 255;
  for (const theme of THEME_IDS) {
    const { hi: HI, mid: MID } = PAL[theme] || PAL.shared;
    RARITIES.forEach((rarity, i) => {
      const px = draw({ ...GOOD, rarity }, theme, 192, 280), at = (x, y) => (px[(y * 192 + x) * 3] << 16) | (px[(y * 192 + x) * 3 + 1] << 8) | px[(y * 192 + x) * 3 + 2];
      assert.equal(at(2, 140), HI[i], theme + ' ' + rarity);
      assert.equal(at(1, 140), MID[i], theme + ' ' + rarity);
      assert.equal(at(189, 140), HI[i], theme + ' ' + rarity);
      assert.equal(at(190, 140), MID[i], theme + ' ' + rarity);
    });
    assert.ok(Math.abs(r(HI[0]) - g(HI[0])) < 16 && Math.abs(g(HI[0]) - b(HI[0])) < 16, theme + ' grey');
    assert.ok(g(HI[1]) > r(HI[1]) && g(HI[1]) > b(HI[1]), theme + ' green');
    assert.ok(b(HI[2]) > r(HI[2]) && b(HI[2]) > g(HI[2]), theme + ' blue');
    assert.ok(r(HI[3]) > g(HI[3]) && b(HI[3]) > g(HI[3]), theme + ' purple');
    assert.ok(r(HI[4]) > g(HI[4]) && g(HI[4]) > b(HI[4]), theme + ' gold');
  }
});

test('lcd-v1 is a true four-shade screen: every pixel of every card is one of the four shades of its rarity', () => {
  const RAMP = [[0x0f1210, 0x4a5048, 0x9aa095, 0xd8dccf], [0x0f380f, 0x306230, 0x8bac0f, 0xc8e078], [0x08143a, 0x1f3f8f, 0x5f8fe8, 0xb8d4ff], [0x1c0a38, 0x522a8a, 0xa06ad8, 0xe0c8ff], [0x2a1a02, 0x7a4e08, 0xd09a20, 0xffe890]];
  for (const f of corpus(36)) {
    const px = draw(f, 'lcd-v1', 192, 280), seen = new Set();
    for (let i = 0; i < px.length; i += 3) seen.add((px[i] << 16) | (px[i + 1] << 8) | px[i + 2]);
    const ramp = RAMP[RARITIES.indexOf(f.rarity)];
    for (const c of seen) assert.ok(ramp.includes(c), f.title + ' uses a colour outside its ramp: ' + c.toString(16));
    assert.ok(seen.size >= 3, 'a card uses at least three of its four shades: ' + seen.size);
  }
});

test('every theme re-skins the same facts into a different picture, and each keeps its own signature', () => {
  const hashes = THEME_IDS.map((t) => sha256(draw(GOOD, t)));
  assert.equal(new Set(hashes).size, THEME_IDS.length);
  const px = draw(GOOD, 'memphis-v1', 192, 280);
  let ink = 0;
  for (let i = 0; i < px.length; i += 3) if (px[i] === 0x11 && px[i + 1] === 0x11 && px[i + 2] === 0x11) ink++;
  assert.ok(ink > 2000, 'memphis draws its heavy black outlines and checker: ' + ink);
});

// the smallest box holding every logical pixel (at 192 x 280) that two cards do not share
function diffBox(a, b) {
  let x0 = 999, y0 = 999, x1 = -1, y1 = -1;
  for (let y = 0; y < 280; y++) for (let x = 0; x < 192; x++) for (let c = 0; c < 3; c++) if (a[(y * 192 + x) * 3 + c] !== b[(y * 192 + x) * 3 + c]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}
const inside = (box, [x0, y0, x1, y1]) => box && box.x0 >= x0 && box.y0 >= y0 && box.x1 <= x1 && box.y1 <= y1;

test('every fact changes the pixels, and shows where it should', () => {
  for (const theme of THEME_IDS) {
    const base = draw(GOOD, theme), box = (patch) => diffBox(base, draw({ ...GOOD, ...patch }, theme));
    assert.ok(inside(box({ title: 'Churn hunter' }), [8, 6, 183, 21]));                 // title: the plate, and only the plate
    assert.ok(inside(box({ title: '' }), [8, 6, 183, 21]));
    assert.ok(box({ title: 'X' + GOOD.title.slice(1) }));
    assert.ok(inside(box({ stage: 35 }), [12, 183, 175, 200]));                          // stage: the LV text and its bar
    assert.ok(inside(box({ stage: 0 }), [12, 183, 175, 200]));
    assert.ok(inside(box({ stage: 99 }), [12, 183, 175, 200]));
    assert.ok(inside(box({ department: 'retentiom' }), [32, 215, 129, 224]));            // department: its line
    assert.ok(inside(box({ department: '' }), [32, 215, 129, 224]));
    assert.ok(inside(box({ generation: 3 }), [12, 230, 74, 251]));                       // generation: text and tally
    assert.ok(inside(box({ generation: 12 }), [12, 230, 74, 251]));
    assert.ok(inside(box({ generation: 0 }), [12, 230, 74, 251]));
    assert.ok(inside(box({ parents: [GOOD.parents[1], GOOD.parents[0]] }), [122, 226, 176, 251]));   // parents: their chips, order counts
    assert.ok(inside(box({ parents: [GOOD.parents[0]] }), [122, 226, 176, 251]));
    assert.ok(inside(box({ parents: [] }), [122, 226, 176, 251]));
    assert.ok(inside(box({ parents: [GOOD.parents[0], idOf('other')] }), [122, 226, 176, 251]));
    for (const dataset of DATASETS) if (dataset !== GOOD.dataset) assert.ok(inside(box({ dataset }), [12, 204, 82, 221]));   // dataset: icon and name
    for (const rarity of RARITIES) if (rarity !== GOOD.rarity) assert.ok(box({ rarity }));
    for (const at of [0, 7, 8, 15]) assert.ok(box({ id: GOOD.id.slice(0, at) + (GOOD.id[at] === '0' ? '1' : '0') + GOOD.id.slice(at + 1) }));   // id: any digit of it
  }
});

test('all seven dataset icons are different pictures', () => {
  const icons = DATASETS.map((dataset) => {
    const px = draw({ ...GOOD, dataset }), out = [];
    for (let y = 204; y < 220; y++) for (let x = 12; x < 28; x++) out.push(px[(y * 192 + x) * 3], px[(y * 192 + x) * 3 + 1], px[(y * 192 + x) * 3 + 2]);
    return out.join(',');
  });
  assert.equal(new Set(icons).size, 7);
});

test('the id prints as #xxxxxxxx and a barcode of its 64 bits: the last 8 digits show too', () => {
  for (const theme of THEME_IDS) {
    const base = draw(GOOD, theme);
    const box = diffBox(base, draw({ ...GOOD, id: GOOD.id.slice(0, 15) + (GOOD.id[15] === 'a' ? 'b' : 'a') }, theme));
    assert.ok(box);                                                                       // not only the picture: the barcode
    const bar = diffBox(draw({ ...GOOD, id: '0000000000000000' }, theme), draw({ ...GOOD, id: '000000000000000f' }, theme));
    assert.ok(bar);
  }
});

test('garbage and out-of-range facts are refused with a reason, never thrown', () => {
  const bad = (patch, why) => refused(checkFacts({ ...GOOD, ...patch }), why);
  const ok = (patch) => assert.equal(checkFacts({ ...GOOD, ...patch }).ok, true, JSON.stringify(patch));
  for (const x of [null, undefined, 5, 'card', true, [], [GOOD], () => GOOD, 7n]) refused(checkFacts(x), /facts must be an object/);
  refused(checkFacts({}), /id must be/);
  for (const k of Object.keys(GOOD)) { const f = { ...GOOD }; delete f[k]; refused(checkFacts(f)); }   // every fact is required
  assert.deepEqual(checkFacts(GOOD).f, { ...GOOD, di: 0, ri: 2 });                                // read once, copied, with the indexes
  assert.notEqual(checkFacts(GOOD).f.parents, GOOD.parents);
  for (const f of [GOOD, { ...GOOD, stage: 100 }, { ...GOOD, title: '_' }, null, { ...GOOD, parents: [1] }]) assert.equal(paintArt(f, 'synthwave-v1', 64, 64).ok, checkFacts(f).ok);   // the painter asks the same question
  // id
  for (const id of ['', '3f9a1c7e5b208d4', '3f9a1c7e5b208d466', '3F9A1C7E5B208D46', '3f9a1c7e5b208d4g', '3f9a1c7e5b208d4 ', 'xxxxxxxxxxxxxxxx', 3, null, undefined, ['3f9a1c7e5b208d46'], { toString: () => '3f9a1c7e5b208d46' }]) bad({ id }, /id must be/);
  ok({ id: '0000000000000000' }); ok({ id: 'ffffffffffffffff' }); ok({ id: '0123456789abcdef' }); ok({ id: 'fedcba9876543210' });
  // title: at most 24 characters from [A-Za-z0-9 &'.-]
  ok({ title: 'x'.repeat(24) }); ok({ title: '' }); ok({ title: ' ' }); ok({ title: '-' });
  bad({ title: 'x'.repeat(25) }, /title/); bad({ title: ' '.repeat(25) }, /title/);
  for (const ch of TITLE_CHARS) ok({ title: ch + 'a' });
  for (const ch of ['_', '@', '/', '"', '<', '>', '\\', '\n', '\t', 'é', '’', '中', '😀', '~', '#', ',', ':', ';', '!', '?', '(', '*', '%', '+', '=']) { bad({ title: 'a' + ch }, /title/); bad({ title: ch }, /title/); }
  for (const title of [5, null, undefined, ['a'], { length: 2 }, new String('abc')]) bad({ title }, /title/);
  for (let i = 0; i < TITLE_CHARS.length; i += 22) ok({ title: TITLE_CHARS.slice(i, i + 22) });
  // dataset, rarity
  for (const dataset of ['Telco', 'telco ', '', 'cars', 'constructor', '__proto__', 'toString', null, undefined, 0, ['telco']]) bad({ dataset }, /dataset/);
  for (const rarity of ['Common', 'mythic', '', 'constructor', null, undefined, 0, ['rare']]) bad({ rarity }, /rarity/);
  for (const dataset of DATASETS) ok({ dataset });
  for (const rarity of RARITIES) ok({ rarity });
  // department: at most 16 characters from [a-z0-9-]
  ok({ department: 'a'.repeat(16) }); ok({ department: '' }); ok({ department: '-' }); ok({ department: '0' }); ok({ department: 'z9' });
  bad({ department: 'a'.repeat(17) }, /department/);
  for (const ch of DEPT_CHARS) ok({ department: ch + 'a' });
  for (const ch of ['A', 'Z', ' ', '_', '.', '&', "'", '/', '@', 'é']) bad({ department: 'a' + ch }, /department/);
  for (const department of [5, null, undefined, ['a'], new String('ab')]) bad({ department }, /department/);
  // stage, generation: whole numbers 0..99
  for (const key of ['stage', 'generation']) {
    for (const n of [0, 1, 50, 98, 99]) ok({ [key]: n });
    for (const n of [-1, 100, 101, 1.5, 0.5, 98.99, NaN, Infinity, -Infinity, '5', '', null, undefined, true, [5], 5n, { valueOf: () => 5 }]) bad({ [key]: n }, new RegExp(key));
  }
  // parents: an array of at most 2 ids
  ok({ parents: [] }); ok({ parents: [GOOD.id] }); ok({ parents: [GOOD.id, GOOD.id] });
  bad({ parents: [GOOD.id, GOOD.id, GOOD.id] }, /parents/);
  for (const parents of [null, undefined, GOOD.id, {}, { length: 0 }, 'ab', 0]) bad({ parents }, /parents/);
  for (const parents of [[''], ['nope'], [GOOD.id.toUpperCase()], [GOOD.id, ''], [GOOD.id, 5], [5], [null], [undefined], [GOOD.id.slice(1)], [GOOD.id + '0'], [[GOOD.id]], [GOOD.id, { x: 1 }]]) bad({ parents }, /parent/);
  const sparse = [GOOD.id, GOOD.id]; delete sparse[0];
  bad({ parents: sparse }, /parent/);
  const holes = new Array(2); holes[1] = GOOD.id;
  bad({ parents: holes }, /parent/);
  // theme
  for (const t of ['', 'synthwave', 'synthwave-v2', 'Synthwave-v1', 'blockcraft-v1 ', '__proto__', 'constructor', 'toString', 'hasOwnProperty', null, undefined, 5, ['synthwave-v1'], {}, () => 'synthwave-v1']) refused(paintArt(GOOD, t, 192, 280), /unknown theme/);
  // extra keys are ignored: a bigger object (e.g. a whole card record) can be passed as it is
  assert.equal(checkFacts({ ...GOOD, note: 'x', extra: { a: 1 }, 5: 6 }).ok, true);
  assert.ok(same(draw({ ...GOOD, note: 'x', extra: { a: 1 }, 5: 6 }), draw(GOOD)));
});

test('never throws: hostile values in every position come back as a refusal', () => {
  const circular = {}; circular.self = circular;
  const toxicGetter = { get id() { throw new Error('toxic id'); }, get title() { throw new Error('toxic title'); } };
  const toxicProxy = new Proxy({}, { get() { throw new Error('toxic proxy'); }, has() { throw new Error('toxic proxy'); }, ownKeys() { throw new Error('toxic proxy'); } });
  const battery = [null, undefined, NaN, Infinity, '', '   ', [], {}, true, false, 10n, () => {}, 'x'.repeat(200000), new Array(200000).fill(0), circular, toxicGetter, toxicProxy, { toString() { throw new Error('toxic'); } }, -1, 0, { a: { b: { c: null } } }, Symbol('s'), Object.create(null)];
  for (const x of battery) {
    assert.doesNotThrow(() => paintArt(x, 'synthwave-v1', 192, 280));
    assert.doesNotThrow(() => paintArt(GOOD, x, 192, 280));
    assert.doesNotThrow(() => paintArt(GOOD, 'synthwave-v1', x, 280));
    assert.doesNotThrow(() => paintArt(GOOD, 'synthwave-v1', 192, x));
    assert.doesNotThrow(() => spriteOf(x));
    refused(paintArt(GOOD, x, 192, 280), /unknown theme/);
    refused(paintArt(GOOD, 'synthwave-v1', x, 280), /width and height/);
    refused(paintArt(GOOD, 'synthwave-v1', 192, x), /width and height/);
    refused(spriteOf(x), /id must be/);
    refused(paintArt(x, 'synthwave-v1', 192, 280));
    refused(checkFacts(x));
  }
  // a fact that throws when read is refused, not thrown
  for (const key of Object.keys(GOOD)) {
    const f = { ...GOOD }; Object.defineProperty(f, key, { get() { throw new Error('toxic ' + key); }, enumerable: true });
    const r = paintArt(f, 'blockcraft-v1', 192, 280);
    refused(r, /could not be read/);
    refused(checkFacts(f), /could not be read/);
  }
  // a fact that changes between reads is read once
  let reads = 0; const wobbly = { ...GOOD }; Object.defineProperty(wobbly, 'title', { get() { return reads++ ? 'x'.repeat(99) : 'Fine'; }, enumerable: true });
  assert.equal(paintArt(wobbly, 'synthwave-v1', 192, 280).ok, true);
  assert.equal(reads, 1);
});

test('a creature for every id: 1,000 random ids give 1,000 distinct sprites, so do sequential ids and single-bit changes', () => {
  const key = (id) => { const s = spriteOf(id); assert.equal(s.ok, true); return JSON.stringify(s.g) + Buffer.from(s.v).toString('hex'); };
  assert.equal(new Set(Array.from({ length: 1000 }, (_, i) => key(idOf('distinct-' + i)))).size, 1000);
  assert.equal(new Set(Array.from({ length: 1000 }, (_, i) => key(i.toString(16).padStart(16, '0')))).size, 1000);
  for (const base of ['0000000000000000', 'ffffffffffffffff', GOOD.id, '8000000000000001']) {
    const flips = Array.from({ length: 64 }, (_, b) => (BigInt('0x' + base) ^ (1n << BigInt(b))).toString(16).padStart(16, '0'));
    assert.equal(new Set([base, ...flips].map(key)).size, 65);
  }
  assert.equal(spritePin(), SPRITES);
});

test('every creature is one symmetric, face-connected piece with eyes, in bounds', () => {
  const MX = 9, MY = 14, MZ = 7;
  for (let n = 0; n < 1500; n++) {
    const s = spriteOf(idOf('anatomy-' + n)), v = s.v;
    assert.equal(v.length, MX * MY * MZ);
    let count = 0, eyes = 0;
    for (let i = 0; i < v.length; i++) {
      const x = i % MX, rowStart = i - x;
      assert.equal(v[i], v[rowStart + (MX - 1 - x)], 'mirror symmetric');
      assert.ok(v[i] <= 8);
      if (v[i]) count++;
      if (v[i] >= 6) eyes++;
    }
    assert.ok(count >= 30 && count <= 420, 'a creature of a sensible size: ' + count);
    assert.ok(eyes >= 1, 'every creature has eyes');
    const seen = new Uint8Array(v.length), first = v.findIndex((c) => c > 0), stack = [first];
    seen[first] = 1;
    let reached = 0;
    while (stack.length) {
      const i = stack.pop(); reached++;
      const x = i % MX, z = Math.floor(i / MX) % MZ, y = Math.floor(i / (MX * MZ));
      for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
        const nx = x + dx, ny = y + dy, nz = z + dz;
        if (nx < 0 || nx >= MX || ny < 0 || ny >= MY || nz < 0 || nz >= MZ) continue;
        const j = (ny * MZ + nz) * MX + nx;
        if (v[j] && !seen[j]) { seen[j] = 1; stack.push(j); }
      }
    }
    assert.equal(reached, count, 'no floating pieces: ' + idOf('anatomy-' + n));
  }
  const s = spriteOf(GOOD.id);
  assert.ok(Number.isInteger(s.hi) && s.hi >= 0 && s.hi < 2 ** 32 && Number.isInteger(s.lo) && s.lo >= 0 && s.lo < 2 ** 32);
  assert.deepEqual(Object.keys(s.g), ['hueA', 'hueB', 'head', 'torso', 'legs', 'arms', 'crown', 'eyes', 'mouth', 'back', 'pattern', 'speck']);
  const top = { hueA: 15, hueB: 7, head: 7, torso: 7, legs: 7, arms: 3, crown: 7, eyes: 7, mouth: 3, back: 3, pattern: 3 };
  const seenMax = {};
  for (let n = 0; n < 2000; n++) { const g = spriteOf(idOf('range-' + n)).g; for (const k of Object.keys(top)) { assert.ok(g[k] >= 0 && g[k] <= top[k]); seenMax[k] = Math.max(seenMax[k] ?? 0, g[k]); } assert.equal(g.speck.length, 34); }
  assert.deepEqual(seenMax, top);   // every table entry is reachable
});

test('different ids make different cards, in both themes', () => {
  for (const theme of THEME_IDS) {
    const hashes = Array.from({ length: 10 }, (_, i) => sha256(draw({ ...GOOD, id: idOf('face-' + i) }, theme)));
    assert.equal(new Set(hashes).size, 10);
  }
});

test('the corpus really touches every glyph, icon, rarity, stage and parent count', () => {
  const all = corpus(36);
  assert.equal(new Set(all.map((f) => f.dataset)).size, 7);
  assert.equal(new Set(all.map((f) => f.rarity)).size, 5);
  assert.deepEqual([...new Set(all.map((f) => f.parents.length))].sort(), [0, 1, 2]);
  const spelled = new Set(all.map((f) => f.title).join('')), dept = new Set(all.map((f) => f.department).join(''));
  for (const ch of TITLE_CHARS) assert.ok(spelled.has(ch), 'title glyph ' + ch);
  for (const ch of DEPT_CHARS) assert.ok(dept.has(ch), 'department glyph ' + ch);
  for (const f of all) assert.equal(checkFacts(f).ok, true);
  assert.ok(all.some((f) => f.stage === 0) && all.some((f) => f.stage === 99) && all.some((f) => f.generation === 0) && all.some((f) => f.generation === 99));
});

// ── the rules that make a re-draw exact: a static check of the source ───────────────────────────────────────────────
function bare(src) {   // the source with comments and string contents blanked, so only code is left to look at
  const out = src.split('');
  let state = 'code';
  for (let i = 0; i < src.length; i++) {
    const c = src[i], d = src[i + 1];
    if (state === 'code') {
      if (c === '/' && d === '/') { out[i] = out[i + 1] = ' '; i++; state = 'line'; }
      else if (c === '/' && d === '*') { out[i] = out[i + 1] = ' '; i++; state = 'block'; }
      else if (c === "'" || c === '"') state = c;
    } else if (state === 'line') { if (c === '\n') state = 'code'; else out[i] = ' '; }
    else if (state === 'block') { if (c === '*' && d === '/') { out[i] = out[i + 1] = ' '; i++; state = 'code'; } else if (c !== '\n') out[i] = ' '; }
    else if (c === '\\') { out[i] = out[i + 1] = ' '; i++; }
    else if (c === state) state = 'code';
    else out[i] = ' ';
  }
  return out.join('');
}

test('kardart.mjs is integer-only, deterministic and browser-safe: none of the banned calls are in it', () => {
  const code = bare(SRC);
  assert.equal(/[^\x00-\x7f]/.test(SRC), false, 'pure ASCII source');
  assert.equal(code.includes('`'), false, 'no template literals');
  for (const m of code.matchAll(/Math\s*\.\s*(\w+)/g)) assert.ok(['floor', 'min', 'max', 'imul'].includes(m[1]), 'Math.' + m[1] + ' is not allowed');
  assert.equal((code.match(/Math/g) || []).length, (code.match(/Math\s*\.\s*\w+/g) || []).length, 'Math only ever called directly');
  for (const banned of ['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2', 'sinh', 'cosh', 'tanh', 'sqrt', 'cbrt', 'hypot', 'exp', 'expm1', 'log', 'log2', 'log10', 'log1p', 'pow', 'random', 'round', 'trunc', 'ceil', 'fround', 'abs', 'sign']) assert.equal(new RegExp('Math\\s*\\.\\s*' + banned + '\\b').test(code), false, 'Math.' + banned);
  for (const word of ['Date', 'performance', 'crypto', 'random', 'parseFloat', 'parseInt', 'toFixed', 'toPrecision', 'Number(', 'eval', 'Function(', 'setTimeout', 'process', 'require', 'import ', 'import(', 'await', 'async', 'Intl', 'localeCompare', 'toLocale', 'Float32', 'Float64', 'globalThis', 'window', 'document']) assert.equal(code.includes(word), false, word + ' must not appear');
  assert.equal(code.includes('**'), false, 'no ** (pow)');
  assert.equal(/\d\.\d|\d\.(?!\.)|\.\d/.test(code), false, 'no float literals');
  assert.equal(/\d[eE][+-]?\d/.test(code.replace(/0x[0-9a-fA-F]+/g, '')), false, 'no exponent literals');
  assert.equal((code.match(/\//g) || []).length, 1, 'the only division is div()');
  assert.ok(code.includes('const div = (a, b) => Math.floor(a / b);'));
  assert.equal(code.includes('Number.isInteger'), true);
  const exportsList = [...code.matchAll(/^export\s+(?:const|function)\s+(\w+)/gm)].map((m) => m[1]);
  assert.deepEqual(exportsList, ['DATASETS', 'RARITIES', 'checkFacts', 'spriteOf', 'FONT', 'ICON_ROWS', 'STAR_ROWS', 'RAR', 'THEMES', 'PIXEL', 'creatureFront', 'paintArt']);
});

test('the sources the UI kit builds on are exported, frozen, and are the ones the cards draw with', () => {
  for (const x of [FONT, ICON_ROWS, STAR_ROWS, RAR, KDATASETS, KRARITIES, PIXEL]) assert.ok(Object.isFrozen(x));
  assert.deepEqual([...KDATASETS], DATASETS); assert.deepEqual([...KRARITIES], RARITIES);
  assert.equal(FONT.length, 68);   // A-Z a-z 0-9 & . - # and the apostrophe, plus ~ (the ellipsis the id is printed with)
  for (const e of FONT) { assert.equal(e[1], ' '); assert.equal(e[3], ' '); const rows = e.slice(4).split('/'); assert.ok(rows.length >= 1 && rows.length <= 9); for (const r of rows) assert.match(r, /^[.#]{5}$/); assert.ok(Number(e[2]) + rows.length <= 9); }
  assert.deepEqual(Object.keys(ICON_ROWS), DATASETS);
  for (const rows of Object.values(ICON_ROWS)) { assert.ok(Object.isFrozen(rows)); assert.equal(rows.length, 16); for (const r of rows) assert.match(r, /^[.#]{16}$/); }
  assert.equal(STAR_ROWS.length, 8); for (const r of STAR_ROWS) assert.match(r, /^[.#]{8}$/);
  assert.deepEqual(RAR.map((r) => [r.label, r.hi, r.mid, r.lo, r.spark]), [['COMMON', 0xc8ccd6, 0x8a8f9e, 0x4a4e5c, 0xfff6c0], ['UNCOMMON', 0x86ff92, 0x36c44c, 0x147030, 0xfff6c0], ['RARE', 0x80c4ff, 0x3a7ee8, 0x163f98, 0xfff6c0], ['EPIC', 0xdba2ff, 0x9c4ee2, 0x4e1c8e, 0xfff6c0], ['LEGENDARY', 0xffe680, 0xf2b422, 0x8e5a0a, 0xfff6c0]]);
  assert.deepEqual(Object.keys(PIXEL), ['newCanvas', 'rect', 'dot', 'at', 'cube', 'blit', 'bitmap', 'mul', 'mix', 'rng', 'span', 'div', 'hash3', 'PAD']);
  const cv = PIXEL.newCanvas(10, 6);   // a canvas of another size: its own width, padded on every side
  assert.equal(cv.cw, 10 + 2 * PIXEL.PAD); assert.equal(cv.d.length, (10 + 2 * PIXEL.PAD) * (6 + 2 * PIXEL.PAD));
  PIXEL.rect(cv, 0, 0, 10, 6, 0x123456); PIXEL.dot(cv, 9, 5, 0xabcdef);
  assert.equal(PIXEL.at(cv, 0, 0), 0x123456); assert.equal(PIXEL.at(cv, 9, 5), 0xabcdef); assert.equal(PIXEL.at(cv, 10, 0), 0); assert.equal(PIXEL.at(cv, 0, 6), 0);
  assert.deepEqual(PIXEL.span(2, 9, 3), [2, 5, 8]); assert.equal(PIXEL.div(7, 2), 3); assert.equal(PIXEL.mul(0x808080, 512), 0xffffff); assert.equal(PIXEL.mix(0, 0xffffff, 128), 0x7f7f7f);
});

test('creatureFront: the creature an id makes, one pixel per voxel, transparent where there is none', () => {
  refused(creatureFront('nope'), /id must be/); refused(creatureFront(null), /id must be/);
  const keys = new Set();
  for (let n = 0; n < 300; n++) {
    const id = idOf('front-' + n), f = creatureFront(id), s = spriteOf(id);
    assert.equal(f.ok, true); assert.equal(f.w, 9); assert.equal(f.h, 14); assert.equal(f.px.length, 9 * 14 * 4);
    for (let y = 0; y < 14; y++) for (let x = 0; x < 9; x++) {
      let any = 0; for (let z = 0; z < 7; z++) any |= s.v[((13 - y) * 7 + z) * 9 + x];
      assert.equal(f.px[(y * 9 + x) * 4 + 3], any ? 255 : 0, 'alpha follows the voxels');
      if (!any) assert.equal(f.px[(y * 9 + x) * 4] + f.px[(y * 9 + x) * 4 + 1] + f.px[(y * 9 + x) * 4 + 2], 0);
      assert.equal(f.px[(y * 9 + x) * 4 + 3], f.px[(y * 9 + (8 - x)) * 4 + 3], 'mirror symmetric');
    }
    keys.add(Buffer.from(f.px).toString('hex'));
  }
  assert.equal(keys.size, 300);
  const fifty = Buffer.concat(Array.from({ length: 50 }, (_, n) => Buffer.from(creatureFront(idOf('front-' + n)).px)));
  assert.equal(sha256(fifty), 'e542d6037dcaff196a9a8e2cf1b19e352624f70f081e395972b83dd22b6cef27', 'the colours and depth shading are published: the estate signs draw them');
  assert.ok(Buffer.from(creatureFront(GOOD.id).px).equals(Buffer.from(creatureFront(GOOD.id).px)));
  assert.equal(sha256(creatureFront(GOOD.id).px), sha256(creatureFront(GOOD.id).px));
});
