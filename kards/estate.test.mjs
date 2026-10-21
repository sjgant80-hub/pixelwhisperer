// estate.test.mjs - the estate painter: the published tile formula, holdings checked and put in canonical order, the same
// holdings (in any order) drawing the same bytes, every drawn fact changing the picture, and the pins that freeze it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { paintEstate, checkHoldings, estateStats, tilesFor, DISTRICTS, ITEM_DISTRICTS, PLOT } from './estate.mjs';
import { THEMES } from './kardart.mjs';
import { idOf } from './corpus.mjs';
import { violations } from './source-check.mjs';

const sha = (u8) => createHash('sha256').update(u8).digest('hex');
const R = ['common', 'uncommon', 'rare', 'epic', 'legendary'], D = ['telco', 'shop', 'bank', 'adult', 'hospital', 'credit', 'custom'];
const card = (n, extra = {}) => ({ id: idOf('estate-' + n), dataset: D[n % 7], department: 'dept-' + (n % 5), stage: (n * 37) % 100, rarity: R[n % 5], generation: n % 4, fresh: false, ...extra });
const CARDS = Array.from({ length: 8 }, (_, n) => card(n, { fresh: n === 4 }));
const HOLD = { cards: CARDS, wires: [[CARDS[0].id, CARDS[1].id], [CARDS[1].id, CARDS[3].id], [CARDS[2].id, CARDS[6].id]], tools: 5, levels: 3 };
const draw = (h, theme = 'blockcraft-v1', w = 240, hh = 160) => { const r = paintEstate(h, theme, w, hh); assert.equal(r.ok, true, r.why); return r.px; };
const same = (a, b) => Buffer.from(a).equals(Buffer.from(b));
const refused = (r, why) => { assert.equal(r.ok, false); assert.equal(typeof r.why, 'string'); if (why) assert.match(r.why, why); };

const PINS = {   // the published estate pictures: a change to how an estate is drawn is a new theme id, as with the cards
  'blueprint-v1': '7df1ab9c17ee1065dede5236b01d9d55760706dc287695bd19fa82514bd482bc',
  empty: '1e4135bf0822f3f6f116af96cc9d6faf55d4cdb73d0193f6d001f506be037f6d',
  'synthwave-v1': 'b13d6ac8ac3a0fc596e93f4f8db6e35d08a15350c96b280d400fa0315f0d712d', 'blockcraft-v1': '53f8ff8b2caed1e60e359835b7bf4bdf2d7783648ac4e3fe2e8fb8ce064ad314', 'lcd-v1': 'a226c826c79c726edc67df5a73b61d84ec6ef4d3c5ff074de2781a8a9f83d257', 'memphis-v1': 'd6b808add51aa743cc1edf16971e434f4f456abec28ff09028ab63d8a85e7fc9',
  snapshot: '7661549c0132036ea16e9162d887af5bd1c0c185784d81c7eaaee981582fb461', crowded: '090e38fcb34e6487c7706786da4d17f492809c7a20941c2a14374693205322d7', full: 'af6a033f3cd04dc0adfbb4482453fbbd65bb06fd52735479b2cf74c914de1580',
};
const CROWD = { cards: Array.from({ length: 40 }, (_, n) => card(100 + n)), tools: 50, snapshot: true };
CROWD.wires = CROWD.cards.slice(0, 20).map((c, n) => [c.id, CROWD.cards[n + 20].id]);

test('the published tile formula: a district with n blocks opens min(36, 8 + 2n) tiles', () => {
  assert.deepEqual([0, 1, 2, 13, 14, 15, 1000].map(tilesFor), [8, 10, 12, 34, 36, 36, 36]);
  for (const x of [-1, 1.5, '3', null, undefined, NaN, Infinity, 1000000001, 3n]) assert.equal(tilesFor(x), null);
  assert.equal(PLOT, 12);
  assert.deepEqual(DISTRICTS.map((d) => [d.id, d.name, d.open]), [['scorer', 'SCORER', true], ['tools', 'TOOLS', true], ['talker', 'TALKER', false], ['swarm', 'SWARM', false], ['router', 'ROUTER', false]]);
  const tiles = new Set();   // the districts tile the whole plot, once each
  for (const d of DISTRICTS) for (let i = d.i[0]; i < d.i[1]; i++) for (let k = d.k[0]; k < d.k[1]; k++) { assert.ok(!tiles.has(i * PLOT + k)); tiles.add(i * PLOT + k); }
  assert.equal(tiles.size, PLOT * PLOT);
  assert.ok(Object.isFrozen(DISTRICTS) && DISTRICTS.every(Object.isFrozen));
});

test('estateStats: the numbers an estate shows, from its holdings only', () => {
  assert.deepEqual(estateStats(HOLD), { ok: true, blocks: 13, cards: 8, tools: 5, links: 3, levels: 3, tiles: { scorer: 24, tools: 18, total: 42 } });
  assert.deepEqual(estateStats({ cards: [] }), { ok: true, blocks: 0, cards: 0, tools: 0, links: 0, levels: null, tiles: { scorer: 8, tools: 8, total: 16 } });   // a new player: 16 tiles
  refused(estateStats({}), /cards/);
});

test('holdings are checked field by field and put in canonical order', () => {
  const c = checkHoldings(HOLD);
  assert.equal(c.ok, true);
  assert.deepEqual(c.h.cards.map((x) => x.ri), [...c.h.cards.map((x) => x.ri)].sort((a, b) => b - a), 'rarest first');
  for (const [a, b] of c.h.wires) assert.ok(a < b);
  const bad = (patch, why) => refused(checkHoldings({ ...HOLD, ...patch }), why);
  const badCard = (patch, why) => refused(checkHoldings({ ...HOLD, cards: [card(0, patch)] , wires: [] }), why);
  for (const x of [null, undefined, 5, 'x', [], () => {}]) refused(checkHoldings(x), /holdings must be an object/);
  bad({ cards: 'x' }, /cards/); bad({ cards: Array.from({ length: 1001 }, (_, n) => card(n)), wires: [] }, /cards/);
  bad({ wires: 'x' }, /wires/); bad({ tools: -1 }, /tools/); bad({ tools: 1000 }, /tools/); bad({ tools: 1.5 }, /tools/);
  bad({ levels: -1 }, /levels/); bad({ levels: 1000000 }, /levels/); bad({ snapshot: 'yes' }, /snapshot/);
  for (const [patch, why] of [[{ id: 'nope' }, /id/], [{ id: idOf('x').toUpperCase() }, /id/], [{ dataset: 'cars' }, /dataset/], [{ stage: 100 }, /stage/], [{ stage: -1 }, /stage/], [{ stage: 1.5 }, /stage/],
    [{ rarity: 'mythic' }, /rarity/], [{ generation: 100 }, /generation/], [{ department: 'Has Caps' }, /department/], [{ department: 'x'.repeat(17) }, /department/], [{ fresh: 1 }, /fresh/]]) badCard(patch, why);
  for (const x of [5, null, [], 'card']) refused(checkHoldings({ cards: [x] }), /every card must be an object/);
  refused(checkHoldings({ cards: [card(0), card(0)] }), /held once/);
  for (const w of ['x', null, [CARDS[0].id], [CARDS[0].id, CARDS[1].id, CARDS[2].id], [CARDS[0].id, idOf('stranger')], [idOf('stranger'), CARDS[0].id]]) refused(checkHoldings({ cards: CARDS, wires: [w] }), /every wire must join two held cards/);
  refused(checkHoldings({ cards: CARDS, wires: [[CARDS[0].id, CARDS[0].id]] }), /different/);
  refused(checkHoldings({ cards: CARDS, wires: [[CARDS[0].id, CARDS[1].id], [CARDS[1].id, CARDS[0].id]] }), /once/);
  assert.equal(checkHoldings({ cards: [card(0, { department: undefined, fresh: undefined })] }).ok, true, 'department and fresh are optional');
  assert.equal(checkHoldings({ cards: Array.from({ length: 1000 }, (_, n) => card(n)) }).ok, true);
  assert.equal(checkHoldings({ cards: [card(0, { department: 'a'.repeat(16) })] }).ok, true, 'a 16-character department');
  const ninety = Array.from({ length: 90 }, (_, n) => card(n)), pairs = [];
  for (let a = 0; a < 90 && pairs.length < 4001; a++) for (let b = a + 1; b < 90 && pairs.length < 4001; b++) pairs.push([ninety[a].id, ninety[b].id]);
  assert.equal(checkHoldings({ cards: ninety, wires: pairs.slice(0, 4000) }).ok, true, '4000 wires');
  refused(checkHoldings({ cards: ninety, wires: pairs }), /wires must be an array of at most 4000/);
  assert.equal(checkHoldings({ cards: ninety, tools: 999, levels: 999999 }).ok, true);
  refused(checkHoldings({ get cards() { throw new Error('toxic'); } }), /could not be read/);
});

test('the same holdings, in any order, draw the same bytes; the published estates are pinned', () => {
  const a = draw(HOLD), shuffled = { ...HOLD, cards: [...CARDS].reverse(), wires: HOLD.wires.map(([x, y]) => [y, x]).reverse() };
  assert.ok(same(a, draw(shuffled)));
  assert.ok(same(a, draw(HOLD)));
  assert.equal(sha(draw({ cards: [] })), PINS.empty);
  for (const t of Object.keys(THEMES)) assert.equal(sha(draw(HOLD, t, 480, 320)), PINS[t], t);
  assert.equal(sha(draw({ ...HOLD, snapshot: true }, 'blockcraft-v1', 1200, 630)), PINS.snapshot);
  assert.equal(sha(draw(CROWD, 'synthwave-v1', 480, 320)), PINS.crowded);
  assert.equal(sha(draw({ cards: CROWD.cards.slice(0, 36) }, 'blockcraft-v1', 240, 160)), PINS.full, 'exactly 36 cards: every one a tower, no "+N MORE"');
});

test('every fact the estate draws changes the picture; the ones it does not draw do not', () => {
  const base = draw(HOLD), differs = (h, why) => assert.equal(same(base, draw(h)), false, why), equal = (h, why) => assert.ok(same(base, draw(h)), why);
  differs({ ...HOLD, cards: [...CARDS, card(50)] }, 'a new card is a new tower');
  differs({ ...HOLD, cards: CARDS.map((c, n) => (n === 2 ? { ...c, stage: c.stage + 25 > 99 ? c.stage - 25 : c.stage + 25 } : c)) }, 'level sets the tower height');
  differs({ ...HOLD, cards: CARDS.map((c, n) => (n === 2 ? { ...c, rarity: c.rarity === 'rare' ? 'epic' : 'rare' } : c)) }, 'rarity sets the trim');
  differs({ ...HOLD, cards: CARDS.map((c, n) => (n === 5 ? { ...c, fresh: true } : c)) }, 'a new child is highlighted');
  differs({ ...HOLD, cards: CARDS.map((c, n) => (n === 5 ? { ...c, dataset: c.dataset === 'bank' ? 'shop' : 'bank' } : c)) }, 'the dataset pip');
  differs({ ...HOLD, cards: CARDS.map((c, n) => (n === 5 ? { ...c, id: idOf('another') } : c)), wires: [] }, 'the creature');
  differs({ ...HOLD, wires: HOLD.wires.slice(1) }, 'a mesh wire');
  differs({ ...HOLD, tools: 6 }, 'a tool block');
  differs({ ...HOLD, snapshot: true }, 'the snapshot bands');
  assert.equal(same(draw({ ...HOLD, snapshot: true }, 'blockcraft-v1', 1200, 630), draw({ ...HOLD, snapshot: true, levels: 4 }, 'blockcraft-v1', 1200, 630)), false, 'levels show in the snapshot, where the stats line has room');
  assert.ok(same(draw({ ...HOLD, snapshot: true }), draw({ ...HOLD, snapshot: true, levels: 4 })), 'a narrow snapshot keeps whole items only: levels drop off first');
  equal({ ...HOLD, levels: 99 }, 'levels are not drawn on the home view');
  const full = '13 BLOCKS \u00b7 42 TILES \u00b7 3 MESH LINKS \u00b7 3 LEVELS RERUN', need = full.length * 6 - 1 + 8;   // the stats line at the exact width it fits
  const snap = (w, levels) => draw({ ...HOLD, snapshot: true, levels }, 'blockcraft-v1', w, 200);
  assert.equal(same(snap(need, 3), snap(need, 4)), false, 'at its width, the whole line shows, levels and all');
  assert.ok(same(snap(need - 1, 3), snap(need - 1, 4)), 'one pixel narrower, the last item drops whole');
  equal({ ...HOLD, cards: CARDS.map((c) => ({ ...c, department: 'other', generation: (c.generation + 1) % 4 })) }, 'department and generation are not drawn');
  for (const t of Object.keys(THEMES)) if (t !== 'blockcraft-v1') assert.equal(same(base, draw(HOLD, t)), false, t);
});

test('sizes: a whole-number scale of a canvas of at least 240 x 160; everything from 64 to 2048 paints', () => {
  for (const [w, h, k] of [[240, 160, 1], [480, 320, 2], [1200, 630, 3], [64, 64, 1], [2048, 64, 1], [64, 2048, 1], [719, 479, 2]]) {
    const r = paintEstate(HOLD, 'synthwave-v1', w, h);
    assert.equal(r.ok, true); assert.equal(r.scale, k); assert.equal(r.px.length, w * h * 3);
  }
  const one = draw(HOLD, 'blockcraft-v1', 240, 160), two = draw(HOLD, 'blockcraft-v1', 480, 320);
  for (let y = 0; y < 320; y += 7) for (let x = 0; x < 480; x += 5) for (let c = 0; c < 3; c++) assert.equal(two[(y * 480 + x) * 3 + c], one[((y >> 1) * 240 + (x >> 1)) * 3 + c]);
  for (const [w, h] of [[63, 160], [240, 63], [2049, 160], [240, 2049], [240.5, 160], ['240', 160], [null, 160], [240, NaN]]) refused(paintEstate(HOLD, 'synthwave-v1', w, h), /width and height/);
  for (const t of ['', 'synthwave', 'toString', '__proto__', null, 5]) refused(paintEstate(HOLD, t, 240, 160), /unknown theme/);
});

test('the pocket LCD estate is four shades, and the painter never throws', () => {
  const px = draw(CROWD, 'lcd-v1', 480, 320), seen = new Set();
  for (let i = 0; i < px.length; i += 3) seen.add((px[i] << 16) | (px[i + 1] << 8) | px[i + 2]);
  assert.deepEqual([...seen].sort((a, b) => a - b), [0x0f1210, 0x4a5048, 0x9aa095, 0xd8dccf]);
  const circular = {}; circular.self = circular;
  for (const x of [null, undefined, 5n, Symbol('s'), circular, { cards: circular }, { cards: [circular] }, new Proxy({}, { get() { throw new Error('x'); } })]) {
    assert.doesNotThrow(() => paintEstate(x, 'synthwave-v1', 240, 160));
    assert.doesNotThrow(() => paintEstate(HOLD, x, 240, 160));
    assert.doesNotThrow(() => paintEstate(HOLD, 'synthwave-v1', x, 160));
    assert.equal(paintEstate(x, 'synthwave-v1', 240, 160).ok, false);
  }
});

const ITEMS = ['app', 'pwa', 'node', 'app', 'talker', 'node', 'talker', 'pwa', 'talker', 'router', 'router'].map((form, n) => ({ id: idOf('item-' + n), form, tier: ['prototype', 'works', 'proven'][n % 3], fresh: n === 2 }));
const SWARMS = [{ id: idOf('swarm-a'), members: [CARDS[0].id, CARDS[3].id, CARDS[6].id] }, { id: idOf('swarm-b'), members: [CARDS[1].id, CARDS[2].id] }];
const IHOLD = { cards: CARDS, wires: HOLD.wires, items: ITEMS, swarms: SWARMS, levels: 3 };
const ipins = { 'blueprint-v1': '1baabdd9b2c2a446d77ef18cc2a15eb5160e7b09dfdd1bd1fbdd9d799df3bcba', 'synthwave-v1': '9a728a0d148319a658208810e42462b3aea66914a754fb72e6e567bc0430aa10', 'blockcraft-v1': 'cf92eb776c73b8414854c8f596d1b73bb97957df5d42a11a35ee8add0befc6c3', 'lcd-v1': '183db6dc926cf253f2f2752533bbbd8deb3b3d8a1f47ba5492dafa35957ed806', 'memphis-v1': 'c2d01395064cc2c1e60fc8bfdaa981d2c4d7ab5450fe7b7a7bca1af7cb081f64', snapshot: '0c85fb1bbdaf67db62d3c65174beffd747e902535b176d5936462ef176a60d50', empty: '2c60b6a5d4e27cc7927026a9f71bc6f69a15ffcc55db8be29801edaa4ec1a8cb', many: 'a09e05ff12ebb0df67e8a3f975e8d374503ae4de4f68ba9b8a7f55b9ea035e51', full36: 'e832cb0e896a7cbb453da9e54dc2fb1c78ae1d2db536ea53ab8c0ab87eb6e1d6' };
const many = (form, n, from = 0) => Array.from({ length: n }, (_, i) => ({ id: idOf(form + '-many-' + (from + i)), form, tier: 'works' }));
const teams = (n) => Array.from({ length: n }, (_, i) => ({ id: idOf('team-' + i), members: [CARDS[i % 8].id, CARDS[(i + 3) % 8].id] }));

test('the full plot: every district open, each 6 x 6, on an L of five squares', () => {
  assert.deepEqual(ITEM_DISTRICTS.map((d) => [d.id, d.name, d.open]), [['scorer', 'SCORER', true], ['tools', 'TOOLS', true], ['talker', 'TALKER', true], ['swarm', 'SWARM', true], ['router', 'ROUTER', true]]);
  assert.equal(ITEM_DISTRICTS[0], DISTRICTS[0]); assert.equal(ITEM_DISTRICTS[1], DISTRICTS[1]);
  const tiles = new Set();
  for (const d of ITEM_DISTRICTS) {
    assert.equal((d.i[1] - d.i[0]) * (d.k[1] - d.k[0]), 36, d.id + ' is 6 x 6, so the rule holds to 36');
    for (let i = d.i[0]; i < d.i[1]; i++) for (let k = d.k[0]; k < d.k[1]; k++) { assert.ok(!tiles.has(i * 100 + k)); tiles.add(i * 100 + k); }
  }
  assert.equal(tiles.size, 180);
  assert.ok(Object.isFrozen(ITEM_DISTRICTS) && ITEM_DISTRICTS.every(Object.isFrozen));
  assert.equal(same(draw({ cards: CARDS }), draw({ cards: CARDS, items: [] })), false, 'an item list, even an empty one, draws the full plot');
  assert.ok(same(draw({ cards: CARDS, items: [] }), draw({ cards: CARDS, swarms: [] })), 'and so does a swarm list');
  assert.ok(same(draw({ cards: CARDS, items: [] }), draw({ cards: CARDS, items: [], swarms: [] })));
});

test('items and swarms: checked, put in order, and refused with a reason when they are not', () => {
  const c = checkHoldings(IHOLD);
  assert.equal(c.ok, true); assert.equal(c.h.tools, 6); assert.equal(c.h.talkers, 3); assert.equal(c.h.routers, 2);
  const F = ['app', 'pwa', 'node', 'talker', 'router'], T = ['prototype', 'works', 'proven'];
  c.h.items.forEach((it, n) => { if (n) { const a = c.h.items[n - 1], fa = F.indexOf(a.form), fb = F.indexOf(it.form); assert.ok(fa < fb || (fa === fb && (T.indexOf(a.tier) > T.indexOf(it.tier) || (a.tier === it.tier && a.id < it.id))), 'by form, then the best proven first'); } });
  assert.deepEqual(c.h.swarms.map((s) => s.id), SWARMS.map((s) => s.id).sort(), 'swarms by id');
  for (const s of c.h.swarms) assert.deepEqual(s.members, [...s.members].sort(), 'members in order');
  assert.ok(same(draw(IHOLD), draw({ ...IHOLD, swarms: [...SWARMS].reverse().map((s) => ({ ...s, members: [...s.members].reverse() })) })), 'in any order');
  for (const t of [0, 2]) { refused(checkHoldings({ ...IHOLD, tools: t }), /^tools are counted from the items when items or swarms are given$/); refused(checkHoldings({ cards: CARDS, swarms: [], tools: t }), /^tools are counted/); }
  for (const x of ['x', 5, null, many('app', 1001)]) refused(checkHoldings({ cards: [], items: x }), /^items must be an array of at most 1000$/);
  assert.equal(checkHoldings({ cards: [], items: many('node', 1000) }).ok, true, '1000 items');
  for (const x of [5, null, [], 'item']) refused(checkHoldings({ cards: [], items: [x] }), /^every item must be an object$/);
  refused(checkHoldings({ cards: [], items: [{ ...ITEMS[0], id: 'XYZ' }] }), /^every item id must be 16 lowercase hex characters$/);
  refused(checkHoldings({ cards: CARDS, items: [{ ...ITEMS[0], id: CARDS[3].id }] }), /^a card is held once: /);
  refused(checkHoldings({ cards: [], items: [ITEMS[0], { ...ITEMS[1], id: ITEMS[0].id }] }), /^a card is held once: /);
  for (const form of ['scorer', 'robot', '', null]) refused(checkHoldings({ cards: [], items: [{ ...ITEMS[0], form }] }), /^an item form must be one of app, pwa, node, talker, router$/);
  for (const tier of ['great', 'Proven', null]) refused(checkHoldings({ cards: [], items: [{ ...ITEMS[0], tier }] }), /^an item tier must be one of prototype, works, proven$/);
  refused(checkHoldings({ cards: [], items: [{ ...ITEMS[0], fresh: 'yes' }] }), /^fresh must be true or false$/);
  refused(checkHoldings({ cards: CARDS, items: ITEMS, wires: [[CARDS[0].id, ITEMS[0].id]] }), /every wire must join two held cards/);
  for (const x of ['x', 5, null, teams(101)]) refused(checkHoldings({ cards: CARDS, swarms: x }), /^swarms must be an array of at most 100$/);
  assert.equal(checkHoldings({ cards: CARDS, swarms: teams(100) }).ok, true, '100 swarms');
  for (const x of [5, null, [], 'team']) refused(checkHoldings({ cards: CARDS, swarms: [x] }), /^every swarm must be an object$/);
  refused(checkHoldings({ cards: CARDS, swarms: [{ ...SWARMS[0], id: 'XYZ' }] }), /^every swarm id must be 16 lowercase hex characters$/);
  refused(checkHoldings({ cards: CARDS, swarms: [SWARMS[0], { ...SWARMS[1], id: SWARMS[0].id }] }), /^a swarm is listed once: /);
  const bigCards = Array.from({ length: 40 }, (_, n) => card(200 + n));
  for (const members of [[CARDS[0].id], [], 'x', null, [CARDS[0].id, CARDS[0].id], [CARDS[0].id, idOf('stranger')], [CARDS[0].id, ITEMS[0].id], bigCards.slice(0, 37).map((x) => x.id)]) {
    refused(checkHoldings({ cards: [...CARDS, ...bigCards], items: ITEMS, swarms: [{ id: SWARMS[0].id, members }] }), /^every swarm has from 2 to 36 members, each a card held, each once$/);
  }
  for (const members of [[CARDS[0].id, CARDS[1].id], bigCards.slice(0, 36).map((x) => x.id)]) assert.equal(checkHoldings({ cards: [...CARDS, ...bigCards], swarms: [{ id: SWARMS[0].id, members }] }).ok, true, members.length + ' members');

  assert.deepEqual(estateStats(IHOLD), { ok: true, blocks: 21, cards: 8, items: 11, tools: 6, talkers: 3, routers: 2, swarms: 2, links: 3, levels: 3, tiles: { scorer: 24, tools: 20, talker: 14, swarm: 12, router: 12, total: 82 } });
  assert.deepEqual(estateStats({ cards: [], items: [] }), { ok: true, blocks: 0, cards: 0, items: 0, tools: 0, talkers: 0, routers: 0, swarms: 0, links: 0, levels: null, tiles: { scorer: 8, tools: 8, talker: 8, swarm: 8, router: 8, total: 40 } });
});

test('full-plot estates re-draw byte for byte: pinned, in any order, and every item and swarm changes the picture', () => {
  for (const t of Object.keys(THEMES)) assert.equal(sha(draw(IHOLD, t, 480, 320)), ipins[t], t);
  assert.equal(sha(draw({ ...IHOLD, snapshot: true }, 'blockcraft-v1', 1200, 630)), ipins.snapshot);
  assert.equal(sha(draw({ cards: [], items: [] })), ipins.empty);
  assert.equal(sha(draw({ cards: CARDS, items: [...many('app', 20), ...many('node', 20), ...many('talker', 40), ...many('router', 40)], swarms: teams(40) }, 'synthwave-v1', 480, 320)), ipins.many);
  assert.equal(sha(draw({ cards: CARDS, items: [...many('pwa', 36), ...many('talker', 36), ...many('router', 36)], swarms: teams(36) }, 'blockcraft-v1', 480, 320)), ipins.full36, 'exactly 36 in each: every one a block, no "+N MORE"');
  const base = draw(IHOLD);
  assert.ok(same(base, draw({ ...IHOLD, cards: [...CARDS].reverse(), items: [...ITEMS].reverse() })), 'the same holdings in any order');
  const changed = (f, what) => assert.equal(same(base, draw({ ...IHOLD, items: f(ITEMS.map((it) => ({ ...it }))) })), false, what);
  changed((xs) => { xs[0].form = 'node'; return xs; }, 'an app becomes a server');
  changed((xs) => { xs[1].form = 'app'; return xs; }, 'a pwa is not an app');
  changed((xs) => { xs[9].form = 'node'; return xs; }, 'a router is not a server');
  changed((xs) => { xs[9].tier = 'works'; return xs; }, 'a tier is its trim (on a block in plain view: the first one in TOOLS stands behind the first swarm)');
  changed((xs) => { xs[0].fresh = true; return xs; }, 'a new item is highlighted');
  changed((xs) => xs.concat([{ id: idOf('one-more-talker'), form: 'talker', tier: 'works' }]), 'one more talker');
  changed((xs) => xs.concat([{ id: idOf('one-more-node'), form: 'node', tier: 'works' }]), 'one more node');
  changed((xs) => xs.concat([{ id: idOf('one-more-router'), form: 'router', tier: 'works' }]), 'one more router');
  changed((xs) => xs.slice(1), 'one item fewer');
  const team = (f, what) => assert.equal(same(base, draw({ ...IHOLD, swarms: f(SWARMS.map((s) => ({ ...s, members: [...s.members] }))) })), false, what);
  team((xs) => xs.slice(1), 'one swarm fewer');
  team((xs) => xs.concat([{ id: idOf('swarm-c'), members: [CARDS[4].id, CARDS[5].id] }]), 'one more swarm');
  team((xs) => { xs[0].members.push(CARDS[7].id); return xs; }, 'a fourth member joins: another block, another wire');
  team((xs) => { xs[1].members[0] = CARDS[5].id; return xs; }, 'a different member: its rarity, its wire');
  for (const [hold, what] of [[(n) => ({ cards: [], items: many('app', n) }), 'apps'], [(n) => ({ cards: [], items: many('talker', n) }), 'talkers'], [(n) => ({ cards: [], items: many('node', n) }), 'nodes'], [(n) => ({ cards: [], items: many('router', n) }), 'routers'], [(n) => ({ cards: CARDS, swarms: teams(n) }), 'swarms']]) {
    const at = (k) => draw(hold(k), 'blockcraft-v1', 480, 320);   // past 36 in a district: '+N MORE', and the count shows
    assert.equal(same(at(36), at(37)), false, what + ' 36 to 37');
    assert.equal(same(at(37), at(38)), false, what + ' 37 to 38');
  }
});

const DIGI = { cards: CARDS, wires: HOLD.wires, items: ITEMS.filter((it) => it.form === 'app'), swarms: SWARMS, districts: ['scorer', 'tools', 'swarm'] };
const dpins = { 'blueprint-v1': '737fecc9c42d89c4855348bc97eac00f96448b60ec7e2c6638e5cb672aaa68a8', 'synthwave-v1': '8de28d87acc5a06d68ab97a52523b59f27bae186d7b3154600a502a21ac4ca5e', 'blockcraft-v1': '2951f40b899fb483bbf7f8f92f01dc0a7202414b113c03e5f72d7d7bdf219f56', 'lcd-v1': 'c1aa418a37158e9547228fff574db257042dd772814ec72e54bebea7ceaf7cd8', 'memphis-v1': '3bc77bf2dcef39c3b210b07c9e0d4df707fdcc3ec635d61da6ee0942946abf5b', snapshot: '8f964f4ce4264620e1d57176ae9765f7bb5d3625c6b2bfe7cefaf7a3d8bb761d', bare: '17b3a8cb154c54f1dc1e46e1dd8d51b78a8f5a336a23c1a4f6ffde4bf1e74cd1' };

test('a plot of only the districts a game holds: named in the holdings, drawn with nothing fenced', () => {
  const c = checkHoldings(DIGI);
  assert.equal(c.ok, true); assert.deepEqual(c.h.districts, ['scorer', 'tools', 'swarm']);
  assert.deepEqual(checkHoldings({ ...DIGI, districts: ['swarm', 'scorer', 'tools'] }).h.districts, ['scorer', 'tools', 'swarm'], 'in the order of the plot');
  assert.ok(same(draw(DIGI), draw({ ...DIGI, districts: ['tools', 'swarm', 'scorer'] })), 'any order, the same picture');
  assert.equal(checkHoldings({ cards: CARDS, districts: ['scorer'] }).ok, true, 'districts alone draw the chosen plot');
  assert.equal(checkHoldings({ cards: CARDS, items: ITEMS, swarms: SWARMS }).h.districts, null, 'without districts: all five');
  for (const d of ['scorer', ['tools', 'swarm'], ['scorer', 'scorer'], ['scorer', 'coming'], ['scorer', 'TOOLS'], [], null, 5]) refused(checkHoldings({ cards: CARDS, districts: d }), /^districts must list scorer and any of tools, talker, swarm and router, each once$/);
  refused(checkHoldings({ ...DIGI, items: ITEMS }), /^every item must stand in a district drawn: a talker stands in talker$/);
  refused(checkHoldings({ ...DIGI, items: [{ id: idOf('r'), form: 'router', tier: 'works' }] }), /^every item must stand in a district drawn: a router stands in router$/);
  refused(checkHoldings({ ...DIGI, districts: ['scorer', 'swarm'] }), /^every item must stand in a district drawn: a app stands in tools$/);
  refused(checkHoldings({ ...DIGI, districts: ['scorer', 'tools'] }), /^swarms stand in swarm, which is not among the districts drawn$/);
  assert.equal(checkHoldings({ ...DIGI, districts: ['scorer', 'tools'], swarms: [] }).ok, true, 'no swarms, no swarm district needed');
  refused(checkHoldings({ ...DIGI, tools: 3 }), /^tools are counted/);
  assert.deepEqual(estateStats(DIGI).tiles, { scorer: 24, tools: 12, swarm: 12, total: 48 }, 'only the districts drawn');
  assert.deepEqual(estateStats({ cards: [], districts: ['scorer'] }).tiles, { scorer: 8, total: 8 });
  assert.ok(same(draw({ ...IHOLD, districts: ['scorer', 'tools', 'talker', 'swarm', 'router'] }), draw(IHOLD)), 'all five named: the full plot, byte for byte');
  for (const t of Object.keys(THEMES)) assert.equal(sha(draw(DIGI, t, 480, 320)), dpins[t], t);
  assert.equal(sha(draw({ ...DIGI, snapshot: true }, 'blockcraft-v1', 1200, 630)), dpins.snapshot);
  assert.equal(sha(draw({ cards: [], districts: ['scorer'] })), dpins.bare);
  const pictures = [['scorer'], ['scorer', 'tools'], ['scorer', 'swarm'], ['scorer', 'tools', 'swarm'], ['scorer', 'talker'], ['scorer', 'router']].map((d) => sha(draw({ cards: CARDS, districts: d })));
  assert.equal(new Set(pictures).size, 6, 'each choice of districts its own plot');
  assert.equal(same(draw(DIGI), draw({ ...DIGI, swarms: SWARMS.slice(1) })), false, 'a swarm in the chosen plot shows');
  for (const [hold, what] of [[(n) => ({ cards: [], items: many('app', n), districts: ['scorer', 'tools'] }), 'apps'], [(n) => ({ cards: CARDS, swarms: teams(n), districts: ['scorer', 'swarm'] }), 'swarms']]) {
    const at = (k) => draw(hold(k), 'blockcraft-v1', 480, 320);
    assert.equal(same(at(36), at(37)), false, what + ' 36 to 37'); assert.equal(same(at(37), at(38)), false, what + ' 37 to 38');
  }
});

test('the estate painter keeps the kernel rules, building on the card engine and the UI kit only', () => {
  assert.deepEqual(violations(readFileSync(new URL('./estate.mjs', import.meta.url), 'utf8'), { imports: ['./kardart.mjs', './ui.mjs'] }), []);
});
