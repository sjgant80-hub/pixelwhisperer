// estate.test.mjs - the estate painter: the published tile formula, holdings checked and put in canonical order, the same
// holdings (in any order) drawing the same bytes, every drawn fact changing the picture, and the pins that freeze it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { paintEstate, checkHoldings, estateStats, tilesFor, DISTRICTS, PLOT } from './estate.mjs';
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

test('the estate painter keeps the kernel rules, building on the card engine and the UI kit only', () => {
  assert.deepEqual(violations(readFileSync(new URL('./estate.mjs', import.meta.url), 'utf8'), { imports: ['./kardart.mjs', './ui.mjs'] }), []);
});
