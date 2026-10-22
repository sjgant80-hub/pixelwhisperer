// hero.test.mjs - a hero's plate: read once and refused with a reason when it is not one, every fact of a hero on the
// picture (its name, its class, its business, each gem lit or not, its level), the same hero always the same bytes, the pins
// that freeze it, and the crown icon.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { HERO_SETS, HERO_STEPS, HERO_TEXT, HERO_ICON, checkHero, paintHero } from './hero.mjs';
import { THEMES, ICON_ROWS } from './kardart.mjs';
import { violations } from './source-check.mjs';

const sha = (u8) => createHash('sha256').update(u8).digest('hex');
const same = (a, b) => Buffer.from(a).equals(Buffer.from(b));
const refused = (r, why) => { assert.equal(r.ok, false); assert.equal(typeof r.why, 'string'); if (why) assert.match(r.why, why); };
const THEME_IDS = Object.keys(THEMES);
const lit = (n) => Array.from({ length: HERO_STEPS }, (_, i) => i < n);
const HERO = Object.freeze({ name: 'Shop Context', title: 'Shopkeeper Sage', set: 'shop', lit: lit(3) });
const HEROES = [HERO, { name: 'Tariff Tamer', title: 'Telecom Tactician', set: 'telco', lit: lit(0) }, { name: 'Credit Collections', title: 'Credit Crusader', set: 'credit', lit: lit(6) },
  { name: 'Bank Calls', title: 'Bank Bard', set: 'bank', lit: [false, true, false, true, false, true] }, { name: 'Census Work', title: 'Recruiter Ranger', set: 'adult', lit: lit(1) }, { name: 'Ward 7', title: 'Clinic Caretaker', set: 'hospital', lit: lit(2) }];
const draw = (x, theme = 'synthwave-v1', w = 192, h = 64) => { const r = paintHero(x, theme, w, h); assert.equal(r.ok, true, r.why); return r.px; };
const PINS = { 'synthwave-v1': '16fd7bb1ea95d7cef1fb9a79a0f7e3b803ec05a4ba9ed9a93a636386cf0200e1', 'blockcraft-v1': '13bacf95c1fb63a9496d6c4fd0a1a3b4037b22c559350b8544eafd1d09597bc0',
  'lcd-v1': '7b1340f9c99dbf7181a13d9956638d63394d9ef120a9656caa1b31a51cfce56d', 'memphis-v1': '955296f1c982b202635ac3fa370a2d63c8a1f5719c5bbd86eded72d497723ca5',
  'blueprint-v1': '48c7e94970c0a7e20603299c2efc3bed305ab84e5ec6d10b5ba8ae1e76d25e19', big: '1d183a1cb061c41d166e9e8bc3b59a9cc96d2de5f2f017c0ab49939337e5895d' };
/** the colour at one of the plate's own pixels (1x, the tile sitting in a 192 x 64 picture: 2 rows above it) */
const px = (pic, x, y, w = 192) => { const o = ((y + 2) * w + x) * 3; return (pic[o] << 16) | (pic[o + 1] << 8) | pic[o + 2]; };
const GEM_AT = (n) => [56 + n * 11 + 3, 38 + 3];   // a gem's centre

test('the constants: six businesses, six steps, names of 22 characters at most, a 16 x 16 crown', () => {
  assert.deepEqual(HERO_SETS, ['telco', 'shop', 'bank', 'adult', 'hospital', 'credit']); assert.ok(Object.isFrozen(HERO_SETS));
  assert.deepEqual([HERO_STEPS, HERO_TEXT], [6, 22]);
  assert.equal(HERO_ICON.length, 16); assert.ok(HERO_ICON.every((r) => r.length === 16 && /^[.#]+$/.test(r))); assert.ok(Object.isFrozen(HERO_ICON));
  assert.equal(sha(HERO_ICON.join('')), sha(HERO_ICON.join('')));
  assert.ok(!Object.values(ICON_ROWS).some((rows) => rows.join('') === HERO_ICON.join('')), 'the crown is its own icon');
});

test('a hero: read once, its level counted from what is lit, and anything that is not one refused with a reason', () => {
  assert.deepEqual(checkHero(HERO), { ok: true, h: { name: 'Shop Context', title: 'Shopkeeper Sage', set: 'shop', lit: lit(3), level: 3 } });
  assert.equal(checkHero(HEROES[3]).h.level, 3, 'lit in any order: the level is how many');
  assert.equal(checkHero(HEROES[2]).h.level, 6); assert.equal(checkHero(HEROES[1]).h.level, 0);
  const x = { ...HERO, lit: lit(2) }, c = checkHero(x); x.lit[0] = false; assert.equal(c.h.lit[0], true, 'the record is copied, not shared');
  for (const v of [null, 5, 'hero', []]) refused(checkHero(v), /^the hero must be an object$/);
  for (const name of ['', ' Shop', 'Shop ', 'x'.repeat(23), 5, null, 'Shop\u00a3']) refused(checkHero({ ...HERO, name }), /^the name must be 1 to 22 characters the font draws, with no space at either end$/);
  for (const name of ['x'.repeat(22), 'A', 'a-b.c & d\'s']) assert.equal(checkHero({ ...HERO, name }).ok, true, name);
  for (const title of ['', ' Sage', 'y'.repeat(23), 7]) refused(checkHero({ ...HERO, title }), /^the class must be 1 to 22 characters the font draws, with no space at either end$/);
  for (const set of ['custom', 'toy', '', null, 'toString']) refused(checkHero({ ...HERO, set }), /^the business must be one of telco, shop, bank, adult, hospital, credit$/);
  for (const v of [lit(5).slice(1), [...lit(6), true], 'yes', null, [1, 0, 0, 0, 0, 0], [...lit(5).slice(1), 'no']]) refused(checkHero({ ...HERO, lit: v }), /^lit must be 6 true or false values$/);
  const trap = Object.defineProperty({}, 'name', { get() { throw new Error('boom'); }, enumerable: true });
  refused(checkHero(trap), /^the hero could not be read$/);
});

test('every fact of a hero is on its plate: each gem lit or hollow, its name, class and business', () => {
  for (const t of THEME_IDS) {
    const base = draw(HERO, t);
    for (const h of [{ ...HERO, name: 'Shop Contexts' }, { ...HERO, title: 'Shopkeeper Sages' }, { ...HERO, set: 'bank' }, { ...HERO, lit: lit(4) }, { ...HERO, lit: [false, true, true, false, false, false] }]) assert.equal(same(base, draw(h, t)), false, t + ' ' + JSON.stringify(h));
  }
  const pic = draw(HERO);
  for (let n = 0; n < HERO_STEPS; n++) {
    const [x, y] = GEM_AT(n);
    assert.equal(px(pic, x, y), n < 3 ? 0x2be8ff : 0x0e0420, 'gem ' + n + (n < 3 ? ' lit' : ' hollow'));
    assert.equal(px(pic, x, y - 3), n < 3 ? 0x2be8ff : 0x5a4a7a, 'gem ' + n + '\u2019s tip');
  }
  const order = draw({ ...HERO, lit: [false, false, true, true, true, false] });
  for (let n = 0; n < HERO_STEPS; n++) assert.equal(px(order, ...GEM_AT(n)), n >= 2 && n <= 4 ? 0x2be8ff : 0x0e0420, 'gems light where the record says, in any order');
  assert.equal(px(pic, 0, 0), 0x000000); assert.equal(px(pic, 1, 1), 0xffd23c, 'a gold frame'); assert.equal(px(pic, 6, 6), 0x0e0420, 'the crest\u2019s well');
  assert.equal(px(pic, 17, 9), 0xffd23c, 'the crown');
  const cased = draw({ ...HERO, name: 'SHOP CONTEXT' }), lower = draw({ ...HERO, name: 'shop context' });
  assert.equal(same(cased, pic), true); assert.equal(same(lower, pic), true, 'lettered in capitals');
});

test('plates re-draw byte for byte: pinned in every theme', () => {
  for (const t of THEME_IDS) { const h = createHash('sha256'); for (const x of HEROES) { const a = draw(x, t); assert.equal(same(a, draw(x, t)), true); h.update(Buffer.from(a)); } assert.equal(h.digest('hex'), PINS[t], t); }
  assert.equal(new Set(HEROES.map((x) => sha(draw(x)))).size, HEROES.length, 'every hero its own plate');
  assert.equal(sha(draw(HERO, 'memphis-v1', 384, 128)), PINS.big);
  const pic = draw(HEROES[3], 'lcd-v1', 384, 128), seen = new Set();
  for (let i = 0; i < pic.length; i += 3) seen.add((pic[i] << 16) | (pic[i + 1] << 8) | pic[i + 2]);
  assert.deepEqual([...seen].sort((a, b) => a - b), [0x0f1210, 0x4a5048, 0x9aa095, 0xd8dccf], 'the pocket screen is four shades');
});

test('sizes: a whole-number scale of 192 x 60, centred; everything from 48 to 2048 paints; the painter never throws', () => {
  for (const [w, h, k] of [[192, 60, 1], [192, 64, 1], [384, 120, 2], [576, 180, 3], [48, 48, 1], [2048, 48, 1], [193, 2048, 1], [400, 125, 2]]) {
    const r = paintHero(HERO, 'synthwave-v1', w, h);
    assert.equal(r.ok, true); assert.equal(r.scale, k); assert.equal(r.px.length, w * h * 3); assert.equal(r.level, 3);
  }
  const one = draw(HERO, 'blockcraft-v1', 192, 60), two = draw(HERO, 'blockcraft-v1', 384, 120), wide = draw(HERO, 'blockcraft-v1', 232, 60), tall = draw(HERO, 'blockcraft-v1', 192, 100), narrow = draw(HERO, 'blockcraft-v1', 172, 64);
  for (let y = 0; y < 60; y++) for (let x = 0; x < 192; x++) for (let c = 0; c < 3; c++) {
    assert.equal(two[((2 * y) * 384 + 2 * x) * 3 + c], one[(y * 192 + x) * 3 + c]);
    assert.equal(wide[(y * 232 + x + 20) * 3 + c], one[(y * 192 + x) * 3 + c], 'wider: the tile sits in the middle');
    assert.equal(tall[((y + 20) * 192 + x) * 3 + c], one[(y * 192 + x) * 3 + c], 'taller: the tile sits in the middle');
    if (x >= 10 && x < 182) assert.equal(narrow[((y + 2) * 172 + x - 10) * 3 + c], one[(y * 192 + x) * 3 + c], 'narrower: its middle shows');
  }
  for (const [w, h] of [[47, 64], [192, 47], [2049, 64], [192, 2049], [192.5, 64], ['192', 64], [null, 64]]) refused(paintHero(HERO, 'synthwave-v1', w, h), /^width and height must be whole numbers from 48 to 2048$/);
  for (const t of ['', 'synthwave', 'toString', null]) refused(paintHero(HERO, t, 192, 64), /^unknown theme$/);
  refused(paintHero({ ...HERO, set: 'toy' }, 'synthwave-v1', 192, 64), /^the business must be/);
  const circular = {}; circular.self = circular;
  for (const x of [null, undefined, 5n, Symbol('s'), circular, { ...HERO, lit: circular }, new Proxy({}, { get() { throw new Error('x'); } })]) {
    assert.doesNotThrow(() => paintHero(x, 'synthwave-v1', 192, 64));
    assert.equal(paintHero(x, 'synthwave-v1', 192, 64).ok, false);
  }
});

test('the hero painter keeps the kernel rules, building on the card engine and the UI kit only', () => {
  assert.deepEqual(violations(readFileSync(new URL('./hero.mjs', import.meta.url), 'utf8'), { imports: ['./kardart.mjs', './ui.mjs'] }), []);
});
