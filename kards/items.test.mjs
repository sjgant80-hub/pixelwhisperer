// items.test.mjs - the item faces (an app, a pwa, a node, a talker, a router), the creature's profile and the item portraits, all
// drawn by kardart.mjs: the facts an item carries, refused with a reason when they are not, every fact on the face, pinned.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { paintArt, checkFacts, spriteOf, THEMES, FORMS, TIERS, GEAR, KIT_SLOTS, FORM_ICON_ROWS, creatureSide, itemFront, retiresLines, RETIRES_MAX } from './kardart.mjs';
import { SAMPLES } from './samples.mjs';
import { idOf } from './corpus.mjs';

const sha = (x) => createHash('sha256').update(Buffer.from(x)).digest('hex');
const same = (a, b) => Buffer.from(a).equals(Buffer.from(b));
const refused = (r, why) => { assert.equal(r.ok, false); assert.equal(typeof r.why, 'string'); if (why) assert.match(r.why, why); };
const THEME_IDS = Object.keys(THEMES);   // every published theme: a theme that some painter cannot draw turns this red
const ITEM = Object.freeze({ form: 'app', id: idOf('item-0'), name: 'Churn Radar', source: 'divorcerbot', tier: 'works' });
const draw = (f, theme = 'synthwave-v1', w = 192, h = 280) => { const r = paintArt(f, theme, w, h); assert.equal(r.ok, true, r.why); return r.px; };
const PINS = {   // the published item faces: a change to how an item is drawn is a new theme id, as with the scorers
  'blueprint-v1': '834128e9a246e76b711fade0c61acd079a7d4f72b55535fa0de527910681ce96',
  kit: 'fe5b76950613533deff7a424abd17c0aafd43117e82e9b0cb5d08bb3cbd31a5e',
  licensed: '7e6feda311a2f818a7025311929014edd44e5db2795bfc22ba8bb869a56015bf',
  'synthwave-v1': 'ca04c4258fc4dfe438833b3f1ea65a009dca48f6682f39496c134695a824990e', 'blockcraft-v1': 'd2097bf2b69fb76a6e49ba47e54ac3e3385123d2f9c3285846972a5ca910be77', 'lcd-v1': '37ed491968907fc25ee850e9d35d13596a0461837a0f71c78dd690863c6554ef', 'memphis-v1': 'f9f6957ecb1799fa4c138e657a8a24a081728438c9c70f68ebf04466cbb61905', big: '7bc44870159e51b31a868ca57870a421d216ba6e3a321153e80378622640b986',
  retires: '64eac4306dcb17764e21bd1c0460202fe1e61baa7350af3a9694d87332eabe7d',
  fronts: '26d4f4ae9912b2cba4ece2faedc77f0f7382fc53923033630def90ee5bbba945', sides: 'b7786040c6bd9216d7ea475950f9469ad494d1fa7d41ca93325821ae446fd3fd',
};

test('the forms, the tiers and the gear slots: one list each, frozen', () => {
  assert.deepEqual(FORMS, ['scorer', 'app', 'pwa', 'node', 'talker', 'router']);
  assert.deepEqual(TIERS, ['prototype', 'works', 'proven']);
  assert.deepEqual(GEAR, { app: 'tool', pwa: 'tool', node: 'ally', talker: 'voice', router: 'ally' });
  assert.deepEqual(KIT_SLOTS, { app: 'tool', pwa: 'tool', node: 'node', talker: 'voice', router: 'node' }); assert.ok(Object.isFrozen(KIT_SLOTS));
  assert.ok(Object.isFrozen(FORMS) && Object.isFrozen(TIERS) && Object.isFrozen(GEAR) && Object.isFrozen(FORM_ICON_ROWS));
  assert.deepEqual(Object.keys(FORM_ICON_ROWS), FORMS.slice(1));
  for (const rows of Object.values(FORM_ICON_ROWS)) { assert.ok(Object.isFrozen(rows)); assert.equal(rows.length, 16); for (const r of rows) assert.match(r, /^[.#]{16}$/); }
});

test('item facts: read once, and anything else refused with a reason', () => {
  assert.deepEqual(checkFacts(ITEM), { ok: true, f: { form: 'app', id: ITEM.id, name: 'Churn Radar', source: 'divorcerbot', tier: 'works', spdx: '', kit: false, retires: '', ri: 1 } });
  assert.equal(checkFacts({ ...ITEM, spdx: 'Apache-2.0' }).f.spdx, 'Apache-2.0');
  for (const spdx of ['', 'MIT', 'GPL-3.0-or-later', 'BSD-3-Clause']) assert.equal(checkFacts({ ...ITEM, spdx }).ok, true, spdx);
  for (const spdx of ['GPL-3.0-or-later-x', 'GPL-2.0+', 'MIT AND BSD', 7, null]) refused(checkFacts({ ...ITEM, spdx }), /^spdx must be at most 16 characters from A-Z a-z 0-9 . and -$/);
  assert.ok(same(draw({ ...ITEM, spdx: '' }), draw(ITEM)), 'no licence: the face it had');
  assert.equal(checkFacts({ ...ITEM, kit: true }).f.kit, true);
  assert.ok(same(draw({ ...ITEM, kit: false }), draw(ITEM)), 'kit: false is the published face');
  for (const kit of ['yes', 1, null]) refused(checkFacts({ ...ITEM, kit }), /^kit must be true or false$/);
  TIERS.forEach((tier, ri) => assert.equal(checkFacts({ ...ITEM, tier }).f.ri, ri, tier + ' is rarity ' + ri));
  for (const form of FORMS.slice(1)) assert.equal(checkFacts({ ...ITEM, form }).ok, true, form);
  assert.deepEqual(checkFacts({ ...SAMPLES[0], form: 'scorer' }), checkFacts(SAMPLES[0]), 'a scorer that says so reads as one');
  assert.ok(same(draw({ ...SAMPLES[0], form: 'scorer' }), draw(SAMPLES[0])), 'and draws exactly as before');
  for (const form of ['robot', '', null, undefined, 5, 'App', 'scorers']) refused(checkFacts({ ...ITEM, form }), /^form must be one of scorer, app, pwa, node, talker, router$/);
  refused(checkFacts({ ...ITEM, id: 'ABCDEF0123456789' }), /^id must be 16 lowercase hex characters$/);
  for (const name of ['N'.repeat(24), '', "O'Hara & Sons-2.0"]) assert.equal(checkFacts({ ...ITEM, name }).ok, true, name);
  for (const name of ['N'.repeat(25), 'a/b', 5, null]) refused(checkFacts({ ...ITEM, name }), /^name must be at most 24 characters from A-Z a-z 0-9 space & \. - and the apostrophe$/);
  for (const source of ['a', 's'.repeat(22), 'konomium-vault', 'fallinsurancepractice', 'Repo.v2']) assert.equal(checkFacts({ ...ITEM, source }).ok, true, source);
  for (const source of ['', 's'.repeat(23), 'owner/repo', 'two words', 7, null]) refused(checkFacts({ ...ITEM, source }), /^source must be 1 to 22 characters from A-Z a-z 0-9 \. and -$/);
  for (const tier of ['great', 'Proven', '', null]) refused(checkFacts({ ...ITEM, tier }), /^tier must be one of prototype, works, proven$/);
  assert.ok(same(draw({ ...ITEM, title: 'x', stage: 5, note: { a: 1 } }), draw(ITEM)), 'extra keys are ignored, as for a scorer');
  refused(paintArt({ ...ITEM, tier: 'great' }, 'synthwave-v1', 192, 280), /^tier must be/);
});

test('item faces re-draw byte for byte: pinned in every theme (five forms, three tiers) and at the card size', () => {
  for (const theme of THEME_IDS) {
    const h = createHash('sha256');
    for (const form of FORMS.slice(1)) for (const tier of TIERS) h.update(Buffer.from(draw({ ...ITEM, form, tier, id: idOf(form + '-' + tier) }, theme)));
    assert.equal(h.digest('hex'), PINS[theme], theme);
  }
  assert.equal(sha(draw({ ...ITEM, form: 'talker', tier: 'proven' }, 'blockcraft-v1', 384, 560)), PINS.big);
  const kit = createHash('sha256'); for (const form of FORMS.slice(1)) for (const spdx of ['', 'MIT']) kit.update(Buffer.from(draw({ ...ITEM, form, spdx, kit: true }, 'blockcraft-v1')));
  assert.equal(kit.digest('hex'), PINS.kit, 'in the words of the kit: a node or router fits a node slot, an app or pwa a tool slot, a talker is a voice slot');
  for (const form of FORMS.slice(1)) assert.equal(same(draw({ ...ITEM, form, kit: true }), draw({ ...ITEM, form })), false, form + ': the kit words differ from the published ones');
  assert.ok(same(draw({ ...ITEM, form: 'node', kit: true }).subarray(216 * 192 * 3, 226 * 192 * 3), draw({ ...ITEM, form: 'router', kit: true }).subarray(216 * 192 * 3, 226 * 192 * 3)), 'a node and a router fit the same slot');
  assert.equal(same(draw({ ...ITEM, form: 'talker', kit: true }).subarray(216 * 192 * 3, 226 * 192 * 3), draw({ ...ITEM, form: 'node', kit: true }).subarray(216 * 192 * 3, 226 * 192 * 3)), false, 'a talker is a voice slot');
  assert.equal(sha(draw({ ...ITEM, tier: 'proven', spdx: 'Apache-2.0' }, 'synthwave-v1', 384, 560)), PINS.licensed, 'an app tool as the kit carries it: its licence beside its slot');
});

test('an app that stands in for a rented tool says which: two lines where the licence and the tier ladder were', () => {
  const R = { ...ITEM, kit: true, spdx: 'MIT', retires: 'a rented AI search engine' };
  assert.equal(RETIRES_MAX, 60);
  assert.equal(checkFacts(R).f.retires, 'a rented AI search engine');
  for (const retires of ['', 'r'.repeat(27), 'a b', "O'Hara & Sons-2.0 tools", 'x '.repeat(29) + 'yy']) assert.equal(checkFacts({ ...ITEM, retires }).ok, true, retires);
  for (const retires of ['r'.repeat(28), ' lead', 'trail ', 'two  spaces', 'a, b', 'a (b)', 'x'.repeat(10) + ' ' + 'y'.repeat(50), 5, null]) refused(checkFacts({ ...ITEM, retires }), /^retires must be at most 60 characters/);
  assert.ok(same(draw({ ...ITEM, retires: '' }), draw(ITEM)), 'no retires line: the face it had');
  for (const theme of THEME_IDS) assert.equal(same(draw(R, theme), draw({ ...R, retires: '' }, theme)), false, theme + ': the line shows');
  assert.equal(same(draw(R), draw({ ...R, retires: 'a rented AI search enginf' })), false, 'every letter of it');
  assert.equal(same(draw(R), draw({ ...R, spdx: 'Apache-2.0' })), true, 'it takes the licence’s place');
  assert.equal(same(draw(R).subarray(0, 216 * 192 * 3), draw({ ...R, retires: 'other' }).subarray(0, 216 * 192 * 3)), true, 'everything above the line is the card it was');
  assert.equal(sha(draw(R, 'blockcraft-v1')), PINS.retires, 'published');
  // the wrap: whole words, 27 characters a line, and what does not fit ends the second line with ~
  assert.deepEqual(retiresLines('a rented AI search engine'), ['a rented AI search engine', '']);
  assert.deepEqual(retiresLines('an accounting vault with Making Tax Digital submission'), ['an accounting vault with', 'Making Tax Digital ~']);
  assert.deepEqual(retiresLines('a financial-planning subscription'), ['a financial-planning', 'subscription']);
  assert.deepEqual(retiresLines('r'.repeat(27) + ' ' + 's'.repeat(27)), ['r'.repeat(27), 's'.repeat(27)]);
  assert.deepEqual(retiresLines('r'.repeat(27) + ' ' + 's'.repeat(26) + ' t'), ['r'.repeat(27), '~'], 'no whole word leaves room: the ~ alone');
  assert.deepEqual(retiresLines('r'.repeat(27) + ' ' + 's'.repeat(25) + ' tt'), ['r'.repeat(27), 's'.repeat(25) + ' ~']);
  assert.deepEqual(retiresLines('r'.repeat(27) + ' ' + 's'.repeat(25) + ' t'), ['r'.repeat(27), 's'.repeat(25) + ' t'], 'exactly 27 characters still fits');
  assert.deepEqual(retiresLines('aa bb ' + 'c'.repeat(25) + ' d'), ['aa bb', 'c'.repeat(25) + ' d'], 'a word that does not fit starts the next line');
  for (const junk of [null, 5, '', [], {}]) assert.deepEqual(retiresLines(junk), ['', '']);
});

test('every fact of an item shows on its face, in every theme', () => {
  for (const theme of THEME_IDS) {
    const base = draw(ITEM, theme);
    for (const f of [{ form: 'pwa' }, { form: 'node' }, { form: 'talker' }, { form: 'router' }, { spdx: 'MIT' }, { spdx: 'GPL-3.0-or-later' }, { id: idOf('other') }, { name: 'Churn Radaq' }, { name: '' }, { source: 'divorcerbos' }, { tier: 'proven' }, { tier: 'prototype' }]) {
      assert.equal(same(draw({ ...ITEM, ...f }, theme), base), false, theme + ' ' + JSON.stringify(f));
    }
  }
});

test('an item is its object: each form one shape whatever its id, the id choosing only colours and details', () => {
  const mask = (r) => Array.from(r.px).filter((_, i) => i % 4 === 3).join('');
  const shapes = FORMS.slice(1).map((form) => {
    const ms = Array.from({ length: 12 }, (_, n) => mask(itemFront(form, idOf(form + n))));
    assert.equal(new Set(ms).size, 1, form + ': one silhouette');
    const looks = new Set(Array.from({ length: 12 }, (_, n) => sha(itemFront(form, idOf(form + n)).px)));
    assert.ok(looks.size >= 10, form + ': ids give different colours and details (' + looks.size + ' of 12)');
    return ms[0];
  });
  assert.equal(new Set(shapes).size, 5, 'five forms, five shapes');
});

test('the portraits: itemFront for inventory slots, creatureSide for the arena', () => {
  refused(itemFront('scorer', ITEM.id), /^form must be one of app, pwa, node, talker, router$/);
  refused(itemFront('robot', ITEM.id), /^form must be one of app, pwa, node, talker, router$/);
  refused(itemFront('app', 'nope'), /^id must be 16 lowercase hex characters$/);
  refused(creatureSide('nope'), /^id must be 16 lowercase hex characters$/); refused(creatureSide(null), /^id must be/);
  const f = itemFront('node', ITEM.id);
  assert.equal(f.ok, true); assert.equal(f.w, 9); assert.equal(f.h, 14); assert.equal(f.px.length, 9 * 14 * 4);
  const fronts = createHash('sha256');
  for (const form of FORMS.slice(1)) for (let n = 0; n < 10; n++) fronts.update(Buffer.from(itemFront(form, idOf('front-' + form + n)).px));
  assert.equal(fronts.digest('hex'), PINS.fronts);
  const sides = createHash('sha256'), looks = new Set();
  for (let n = 0; n < 50; n++) {
    const id = idOf('side-' + n), s = creatureSide(id), sp = spriteOf(id);
    assert.equal(s.ok, true); assert.equal(s.w, 7); assert.equal(s.h, 14); assert.equal(s.px.length, 7 * 14 * 4);
    for (let y = 0; y < 14; y++) for (let z = 0; z < 7; z++) {
      let any = 0; for (let x = 0; x < 9; x++) any |= sp.v[((13 - y) * 7 + z) * 9 + x];
      assert.equal(s.px[(y * 7 + z) * 4 + 3], any ? 255 : 0, 'the profile is the creature seen from the side');
    }
    sides.update(Buffer.from(s.px)); looks.add(sha(s.px));
  }
  assert.equal(looks.size, 50, 'fifty creatures, fifty profiles');
  assert.equal(sides.digest('hex'), PINS.sides, 'the colours, the depth shading and the face at the edge are published: the arena draws them');
});

test('item faces never throw: garbage in is a refusal, never an exception', () => {
  const junk = [null, 0, 'app', [], { form: 'app' }, { ...ITEM, id: 5 }, { ...ITEM, name: { toString: () => 'x' } }, { ...ITEM, source: ['a'] }, { form: { a: 1 } }];
  for (const j of junk) for (const theme of THEME_IDS) { const r = paintArt(j, theme, 192, 280); assert.equal(r.ok, false); assert.equal(typeof r.why, 'string'); }
  const trap = Object.defineProperty({}, 'form', { get() { throw new Error('boom'); }, enumerable: true });
  refused(checkFacts(trap), /^the facts could not be read$/);
  for (const [form, id] of [[null, null], [{}, ITEM.id], ['app', 12]]) assert.equal(itemFront(form, id).ok, false);
});
