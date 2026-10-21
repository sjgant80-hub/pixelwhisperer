// back.test.mjs - the back of a DIGI card: a back read once and refused with a reason when it is not one, every fact of it on
// the picture, one maker's scatter on all their backs, every theme's palette kept, the size contract, and the pins that freeze it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { checkBack, paintBack } from './back.mjs';
import { THEMES } from './kardart.mjs';
import { identicon } from './ui.mjs';
import { violations } from './source-check.mjs';

const sha = (u8) => createHash('sha256').update(u8).digest('hex');
const same = (a, b) => Buffer.from(a).equals(Buffer.from(b));
const refused = (r, why) => { assert.equal(r.ok, false); assert.equal(typeof r.why, 'string'); if (why) assert.match(r.why, why); };
const THEME_IDS = Object.keys(THEMES);   // every published theme: a theme the back cannot draw turns this red
const A = '3f9a1c7e5b208d46b27d0e4a91c6f3580c58e1d3a79f4b62e913b6f0482ca7d5', Z = 'e913b6f0482ca7d55a07c9e2d1f84b360c58e1d3a79f4b623f9a1c7e5b208d46';
const BACKS = [{ maker: A, serial: 123 }, { maker: Z, serial: 999999 }, { maker: A }, { serial: 0 }, {}];
const draw = (b, theme = 'synthwave-v1', w = 192, h = 280) => { const r = paintBack(b, theme, w, h); assert.equal(r.ok, true, r.why); return r.px; };
const rows = (px, a, b, w = 192) => px.subarray(a * w * 3, b * w * 3);
const colours = (px) => { const s = new Set(); for (let i = 0; i < px.length; i += 3) s.add((px[i] << 16) | (px[i + 1] << 8) | px[i + 2]); return [...s].sort((a, b) => a - b); };
const PINS = {};

test('a back: read once, and anything that is not one refused with a reason', () => {
  assert.deepEqual(checkBack({}), { ok: true, b: { maker: null, serial: null } });
  assert.deepEqual(checkBack({ maker: A, serial: 123 }), { ok: true, b: { maker: A, serial: 123 } });
  assert.deepEqual(checkBack({ serial: 0 }).b, { maker: null, serial: 0 });
  assert.deepEqual(checkBack({ serial: 999999, extra: 'ignored' }).b, { maker: null, serial: 999999 });
  for (const x of [null, undefined, 5, 'back', [], true]) refused(checkBack(x), /^the back must be an object$/);
  for (const maker of [A.toUpperCase(), A.slice(1), A + '0', 'g' + A.slice(1), A.slice(0, 63) + ' ', 5, ['0'], Array.from(A)]) refused(checkBack({ maker }), /^the maker must be a public key of 64 lowercase hex characters$/);
  assert.equal(checkBack({ maker: '0'.repeat(64) }).ok, true, 'a key of zeros is still a key');
  assert.equal(checkBack({ maker: 'f'.repeat(64) }).ok, true);
  for (const serial of [-1, 1000000, 1.5, '5', NaN, Infinity]) refused(checkBack({ serial }), /^serial must be a whole number from 0 to 999999$/);
  refused(checkBack({ get maker() { throw new Error('x'); } }), /^the back could not be read$/);
});

test('the picture: every fact of a back is on it, and the same back is always the same bytes', () => {
  for (const t of THEME_IDS) {
    const h = createHash('sha256');
    for (const b of BACKS) { const px = draw(b, t); assert.equal(px.length, 192 * 280 * 3); assert.equal(same(px, draw(b, t)), true, 'deterministic'); h.update(px); }
    PINS[t] = h.digest('hex');
    assert.equal(new Set(BACKS.map((b) => sha(draw(b, t)))).size, BACKS.length, t + ': every back its own picture');
  }
  assert.equal(new Set(THEME_IDS.map((t) => sha(draw(BACKS[0], t)))).size, THEME_IDS.length, 'every theme its own back');
  for (const t of THEME_IDS) {
    const base = draw(BACKS[0], t);
    for (const b of [{ maker: '4' + A.slice(1), serial: 123 }, { maker: A.slice(0, 63) + '4', serial: 123 }, { maker: A.slice(0, 30) + '0' + A.slice(31), serial: 123 }, { maker: A, serial: 124 }, { maker: A, serial: 100123 }, { maker: A }, { serial: 123 }]) assert.equal(same(base, draw(b, t)), false, t + ' ' + JSON.stringify(b));
  }
});

test('the maker: their mark in the medallion, their key written short, their dice on every back they make', () => {
  const px = draw({ maker: A }), id = identicon(A, 5).px;
  for (let y = 0; y < 50; y++) for (let x = 0; x < 50; x++) for (let c = 0; c < 3; c++) assert.equal(px[((158 + y) * 192 + 71 + x) * 3 + c], id[(y * 50 + x) * 3 + c], 'the identicon at 5 x, in its own colours');
  for (const t of THEME_IDS) {
    const one = draw({ maker: A, serial: 1 }, t), two = draw({ maker: A, serial: 999999 }, t), other = draw({ maker: Z, serial: 1 }, t);
    assert.equal(same(rows(one, 0, 250), rows(two, 0, 250)), true, t + ': the edition changes only its number');
    assert.equal(same(rows(one, 250, 280), rows(two, 250, 280)), false, t + ': the edition number is printed');
    const field = (px) => Buffer.concat([Buffer.from(rows(px, 28, 44)), Buffer.from(rows(px, 228, 250))]);
    const scattered = ['synthwave-v1', 'blockcraft-v1', 'memphis-v1'].includes(t);
    assert.equal(field(one).equals(field(other)), !scattered, t + (scattered ? ': another maker throws another scatter' : ': a field with no scatter is every maker\'s'));
    assert.equal(field(draw({}, t)).equals(field(draw({ serial: 5 }, t))), true, t + ': the unsigned share one field');
  }
});

test('every theme keeps its palette: the pocket screen four shades, the blueprint its own inks', () => {
  for (const b of BACKS) assert.deepEqual(colours(draw(b, 'lcd-v1')), [0x0f1210, 0x4a5048, 0x9aa095, 0xd8dccf], 'the pocket screen is four shades');
  for (const b of BACKS) for (const c of colours(draw(b, 'blueprint-v1'))) assert.ok([0x061a38, 0x0e3b78, 0x1c4f92, 0x3468b0, 0x9cc3f0, 0xeef5ff].includes(c), 'blueprint ink ' + c.toString(16));
  assert.ok(colours(draw({ maker: A }, 'blueprint-v1')).includes(0x9cc3f0), 'the mark is inked, not dropped');
  for (const t of ['synthwave-v1', 'blockcraft-v1', 'memphis-v1']) {
    const px = draw({ maker: A }, t), id = identicon(A, 5).px;
    assert.equal(px[(183 * 192 + 96) * 3], id[(25 * 50 + 25) * 3], t + ': the mark keeps its own colours');
  }
});

test('sizes: the logical back scaled to the nearest pixel, from 64 to 1024 each way; the painter never throws', () => {
  const one = draw(BACKS[0], 'blockcraft-v1'), two = draw(BACKS[0], 'blockcraft-v1', 384, 560);
  for (let y = 0; y < 560; y++) for (let x = 0; x < 384; x++) for (let c = 0; c < 3; c++) assert.equal(two[(y * 384 + x) * 3 + c], one[((y >> 1) * 192 + (x >> 1)) * 3 + c]);
  const odd = draw(BACKS[0], 'blockcraft-v1', 100, 333);
  for (const [x, y] of [[0, 0], [99, 332], [50, 166], [13, 200]]) for (let c = 0; c < 3; c++) assert.equal(odd[(y * 100 + x) * 3 + c], one[(Math.floor(y * 280 / 333) * 192 + Math.floor(x * 192 / 100)) * 3 + c]);
  const h = createHash('sha256');
  for (const [w, hh] of [[64, 64], [1024, 1024], [64, 1024], [1024, 64], [384, 560], [100, 333]]) { const px = draw(BACKS[1], 'memphis-v1', w, hh); assert.equal(px.length, w * hh * 3); h.update(px); }
  PINS.sizes = h.digest('hex');
  for (const [w, hh] of [[63, 280], [192, 63], [1025, 280], [192, 1025], [192.5, 280], ['192', 280], [null, 280], [192, undefined]]) refused(paintBack(BACKS[0], 'synthwave-v1', w, hh), /^width and height must be whole numbers from 64 to 1024$/);
  for (const t of ['', 'synthwave', 'toString', 'constructor', null, 5]) refused(paintBack(BACKS[0], t, 192, 280), /^unknown theme$/);
  refused(paintBack({ serial: -1 }, 'synthwave-v1', 192, 280), /^serial must be/);
  refused(paintBack(null, 'synthwave-v1', 192, 280), /^the back must be an object$/);
  const circular = {}; circular.self = circular;
  for (const x of [null, undefined, 5n, Symbol('s'), { maker: circular }, { serial: 5n }, new Proxy({}, { get() { throw new Error('x'); } })]) {
    assert.doesNotThrow(() => paintBack(x, 'synthwave-v1', 192, 280));
    assert.equal(paintBack(x, 'synthwave-v1', 192, 280).ok, false);
  }
  assert.equal(same(draw(circular), draw({})), true, 'what a back does not name is not read');
});

test('the pins: the backs are frozen, byte for byte', () => {
  const want = {
    'synthwave-v1': '228e2ded5992d89230b73608a0056788e5365b8cfbbd7ebae9571dc2bc522bf9',
    'blockcraft-v1': '17e4a1fd7f049e225320c6f785af63368362de98a98dd5d0d3b7c3803c233776',
    'lcd-v1': '3a2bb0d733a47fb89895d40876f423fc3fc4b782f356c2e3f1db20ebeee9b3d4',
    'memphis-v1': '653b508d51a4dd4389431f6a81c278cdd96f8ee96ee28dd6ccd0be4b6dbb5eee',
    'blueprint-v1': '3356e5ceb661573bb43dbaefacdd4a42a3038fc6c292e17bbe549ba720969926',
    sizes: 'cb3b607b750bc5dab0e8a79da01ce6593a0a12342bb4fad57ea8bff6a2554ee9',
  };
  assert.deepEqual(Object.keys(PINS).sort(), Object.keys(want).sort(), 'a pin for every theme and the sizes');
  assert.deepEqual(PINS, want);
});

test('the back painter keeps the kernel rules, building on the card engine and the UI kit only', () => {
  assert.deepEqual(violations(readFileSync(new URL('./back.mjs', import.meta.url), 'utf8'), { imports: ['./kardart.mjs', './ui.mjs'] }), []);
});
