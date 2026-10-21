// gear.test.mjs - the kit slots and the kitted badge: a slot read once and refused with a reason when it is not one, a worth
// written as it is read, every fact of a slot on the picture, the same slot always the same bytes, and the pins that freeze it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { SLOT_KINDS, checkSlot, worthText, paintSlot, kitBadge } from './gear.mjs';
import { THEMES } from './kardart.mjs';
import { idOf } from './corpus.mjs';
import { violations } from './source-check.mjs';

const sha = (u8) => createHash('sha256').update(u8).digest('hex');
const same = (a, b) => Buffer.from(a).equals(Buffer.from(b));
const refused = (r, why) => { assert.equal(r.ok, false); assert.equal(typeof r.why, 'string'); if (why) assert.match(r.why, why); };
const THEME_IDS = Object.keys(THEMES);   // every published theme: a theme that some painter cannot draw turns this red
const CARD = Object.freeze({ id: idOf('node-card'), rarity: 'rare' }), ITEM = Object.freeze({ id: idOf('tool-app'), tier: 'proven' });
const SLOTS = [{ kind: 'node' }, { kind: 'node', card: CARD, worth: 19727 }, { kind: 'node', card: { ...CARD, rarity: 'epic' }, worth: -39000 }, { kind: 'node', card: CARD, joined: false }, { kind: 'tool' }, { kind: 'tool', item: ITEM }, { kind: 'tool', item: { ...ITEM, tier: 'works' } }];
const draw = (s, theme = 'synthwave-v1', w = 56, h = 64) => { const r = paintSlot(s, theme, w, h); assert.equal(r.ok, true, r.why); return r.px; };
const PINS = { 'blueprint-v1': '958c9d40ace7cd28d60f773bc9af8d259227e425436ff3fb03ae69ccbcb558a0', edges: '59257a4e7c9a32bfbd1da3108c201b9842e46c42f5b85282aa9c7ead00bc1e42', 'synthwave-v1': 'fb10021b99909101ac28962948bf392cc09775545681fb0e1ae7aa83d4f56522', 'blockcraft-v1': '0c673e4fae05ce981811f02ca56548075f8d948b52085ddb0870fb3afd31050b', 'lcd-v1': '3ee7172301c530a4375bf5e1891103826a5a0f96f9e62e2e708c264be3e317a1', 'memphis-v1': 'c80963fa4c056f3e717f20f879f48050907728a3b0f67e885d19e00c733a3a65', big: '6c0f3796e153c9663c0838dd6b9971c542767dd506239b31ea6e1006ece12d33', badges: '7fc9c3e3855ac0c12ec5967322affb2c8a6986128c8771ef35a9aa982caf71b4' };

test('a slot: read once, and anything that is not one refused with a reason', () => {
  assert.deepEqual(SLOT_KINDS, ['node', 'tool']); assert.ok(Object.isFrozen(SLOT_KINDS));
  assert.deepEqual(checkSlot({ kind: 'node' }), { ok: true, s: { kind: 'node' } });
  assert.deepEqual(checkSlot({ kind: 'node', card: CARD, worth: 19727 }), { ok: true, s: { kind: 'node', card: { id: CARD.id, rarity: 'rare', ri: 2 }, worth: 19727, joined: true } });
  assert.deepEqual(checkSlot({ kind: 'node', card: CARD }).s, { kind: 'node', card: { id: CARD.id, rarity: 'rare', ri: 2 }, worth: 0, joined: true }, 'worth 0 and joined unless it says');
  assert.deepEqual(checkSlot({ kind: 'tool', item: ITEM }), { ok: true, s: { kind: 'tool', item: { id: ITEM.id, tier: 'proven', ti: 2 } } });
  for (const x of [null, 5, 'slot', []]) refused(checkSlot(x), /^the slot must be an object$/);
  for (const kind of ['NODE', 'ally', '', null]) refused(checkSlot({ kind }), /^kind must be node or tool$/);
  refused(checkSlot({ kind: 'node', item: ITEM }), /^a node slot holds a card, a tool slot an item$/);
  refused(checkSlot({ kind: 'tool', card: CARD }), /^a node slot holds a card, a tool slot an item$/);
  for (const x of [{ worth: 5 }, { joined: false }, { worth: 0, joined: true }]) { refused(checkSlot({ kind: 'node', ...x }), /^worth and joined describe a node with a card in it$/); refused(checkSlot({ kind: 'tool', ...x }), /^worth and joined describe/); }
  for (const card of [null, 5, [], 'card']) refused(checkSlot({ kind: 'node', card }), /^the card must be an object$/);
  for (const id of ['XYZ', 'abc', '0123456789abcdef0', 5, Array.from('0123456789abcdef')]) refused(checkSlot({ kind: 'node', card: { ...CARD, id } }), /^the card id must be 16 lowercase hex characters$/);
  refused(checkSlot({ kind: 'node', card: { ...CARD, rarity: 'mythic' } }), /^the card rarity must be one of common, uncommon, rare, epic, legendary$/);
  for (const rarity of ['common', 'legendary']) assert.equal(checkSlot({ kind: 'node', card: { ...CARD, rarity } }).ok, true, rarity);
  for (const worth of [-1000000, 1000000, 1.5, '5', null]) refused(checkSlot({ kind: 'node', card: CARD, worth }), /^worth must be a whole number of millionths from -999999 to 999999$/);
  for (const worth of [-999999, 999999, 0]) assert.equal(checkSlot({ kind: 'node', card: CARD, worth }).ok, true, String(worth));
  for (const joined of ['no', 0, null]) refused(checkSlot({ kind: 'node', card: CARD, joined }), /^joined must be true or false$/);
  for (const item of [null, 5, [], 'item']) refused(checkSlot({ kind: 'tool', item }), /^the item must be an object$/);
  for (const id of ['XYZ', 'abc', 5]) refused(checkSlot({ kind: 'tool', item: { ...ITEM, id } }), /^the item id must be 16 lowercase hex characters$/);
  refused(checkSlot({ kind: 'tool', item: { ...ITEM, tier: 'great' } }), /^the item tier must be one of prototype, works, proven$/);
  assert.equal(checkSlot({ kind: 'tool', item: { ...ITEM, tier: 'prototype' } }).ok, true);
  const trap = Object.defineProperty({}, 'kind', { get() { throw new Error('boom'); }, enumerable: true });
  refused(checkSlot(trap), /^the slot could not be read$/);
});

test('a worth is written as it is read: a sign and thousands separators', () => {
  assert.deepEqual([19727, 41696, -39000, 0, 1, -1, 999, 1000, -1000, 999999, -999999, 100005].map(worthText), ['+19,727', '+41,696', '-39,000', '0', '+1', '-1', '+999', '+1,000', '-1,000', '+999,999', '-999,999', '+100,005']);
  for (const x of [1000000, -1000000, 1.5, '5', null]) assert.equal(worthText(x), null, String(x));
});

test('slots re-draw byte for byte: pinned in every theme, and every fact of a slot is on it', () => {
  for (const t of THEME_IDS) { const h = createHash('sha256'); for (const s of SLOTS) h.update(Buffer.from(draw(s, t))); assert.equal(h.digest('hex'), PINS[t], t); }
  assert.equal(sha(draw(SLOTS[1], 'blockcraft-v1', 112, 128)), PINS.big);
  const edges = createHash('sha256'); for (const worth of [-1, 0, 1]) edges.update(Buffer.from(draw({ kind: 'node', card: CARD, worth })));
  assert.equal(edges.digest('hex'), PINS.edges, 'a gain in the good colour, a loss in the bad, nothing at all in neither');
  assert.equal(new Set(SLOTS.map((s) => sha(draw(s)))).size, SLOTS.length, 'every slot its own picture');
  const base = draw(SLOTS[1]);
  for (const s of [{ ...SLOTS[1], worth: 19728 }, { ...SLOTS[1], worth: -19727 }, { ...SLOTS[1], worth: 0 }, { ...SLOTS[1], card: { ...CARD, id: idOf('other') } }, { ...SLOTS[1], card: { ...CARD, rarity: 'uncommon' } }, { ...SLOTS[1], joined: false }]) assert.equal(same(base, draw(s)), false, JSON.stringify(s));
  const tool = draw(SLOTS[5]);
  for (const s of [{ kind: 'tool', item: { ...ITEM, id: idOf('other') } }, { kind: 'tool', item: { ...ITEM, tier: 'works' } }, { kind: 'tool', item: { ...ITEM, tier: 'prototype' } }, { kind: 'tool' }]) assert.equal(same(tool, draw(s)), false, JSON.stringify(s));
  assert.equal(same(draw({ kind: 'node', card: CARD, worth: 5, joined: false }), draw({ kind: 'node', card: CARD, worth: 6, joined: false })), true, 'an unjoined node shows no worth');
  const px = draw(SLOTS[3], 'lcd-v1', 112, 128), seen = new Set();
  for (let i = 0; i < px.length; i += 3) seen.add((px[i] << 16) | (px[i + 1] << 8) | px[i + 2]);
  assert.deepEqual([...seen].sort((a, b) => a - b), [0x0f1210, 0x4a5048, 0x9aa095, 0xd8dccf], 'the pocket screen is four shades');
});

test('sizes: a whole-number scale of 56 x 64, centred; everything from 32 to 2048 paints; the painter never throws', () => {
  for (const [w, h, k] of [[56, 64, 1], [112, 128, 2], [168, 192, 3], [32, 32, 1], [2048, 32, 1], [57, 2048, 1], [200, 129, 2]]) {
    const r = paintSlot(SLOTS[1], 'synthwave-v1', w, h);
    assert.equal(r.ok, true); assert.equal(r.scale, k); assert.equal(r.px.length, w * h * 3);
  }
  const one = draw(SLOTS[1], 'blockcraft-v1'), two = draw(SLOTS[1], 'blockcraft-v1', 112, 128), wide = draw(SLOTS[1], 'blockcraft-v1', 96, 64), tall = draw(SLOTS[1], 'blockcraft-v1', 56, 100), narrow = draw(SLOTS[1], 'blockcraft-v1', 40, 64);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 56; x++) for (let c = 0; c < 3; c++) {
    assert.equal(two[((2 * y) * 112 + 2 * x) * 3 + c], one[(y * 56 + x) * 3 + c]);
    assert.equal(wide[(y * 96 + x + 20) * 3 + c], one[(y * 56 + x) * 3 + c], 'wider: the tile sits in the middle');
    assert.equal(tall[((y + 18) * 56 + x) * 3 + c], one[(y * 56 + x) * 3 + c], 'taller: the tile sits in the middle');
    if (x >= 8 && x < 48) assert.equal(narrow[(y * 40 + x - 8) * 3 + c], one[(y * 56 + x) * 3 + c], 'narrower: its middle shows');
  }
  for (const [w, h] of [[31, 64], [56, 31], [2049, 64], [56, 2049], [56.5, 64], ['56', 64], [null, 64]]) refused(paintSlot(SLOTS[1], 'synthwave-v1', w, h), /^width and height must be whole numbers from 32 to 2048$/);
  for (const t of ['', 'synthwave', 'toString', null]) refused(paintSlot(SLOTS[1], t, 56, 64), /^unknown theme$/);
  refused(paintSlot({ kind: 'robot' }, 'synthwave-v1', 56, 64), /^kind must be/);
  const circular = {}; circular.self = circular;
  for (const x of [null, undefined, 5n, Symbol('s'), circular, { kind: 'node', card: circular }, new Proxy({}, { get() { throw new Error('x'); } })]) {
    assert.doesNotThrow(() => paintSlot(x, 'synthwave-v1', 56, 64));
    assert.equal(paintSlot(x, 'synthwave-v1', 56, 64).ok, false);
  }
});

test('the kitted badge: one pip for each node slot, lit for each one fielded', () => {
  const h = createHash('sha256');
  for (const slots of [2, 3, 4]) for (let f = 0; f <= slots; f++) {
    const b = kitBadge(f, slots);
    assert.equal(b.ok, true); assert.equal(b.w, slots * 5 + 3); assert.equal(b.h, 9); assert.equal(b.px.length, b.w * 9 * 4);
    let lit = 0; for (let n = 0; n < slots; n++) if (b.px[(4 * b.w + 4 + n * 5) * 4] === 0x2b) lit++;
    assert.equal(lit, f, f + ' of ' + slots + ' lit');
    h.update(Buffer.from(b.px));
  }
  assert.equal(h.digest('hex'), PINS.badges);
  const big = kitBadge(2, 3, 4), small = kitBadge(2, 3);
  assert.equal(big.w, 72); for (let y = 0; y < 36; y += 3) for (let x = 0; x < 72; x += 3) for (let c = 0; c < 4; c++) assert.equal(big.px[(y * 72 + x) * 4 + c], small.px[((y >> 2) * 18 + (x >> 2)) * 4 + c]);
  for (const [f, s] of [[0, 1], [0, 5], [3, 2], [-1, 2], [1.5, 3], [1, '3'], [null, 2]]) refused(kitBadge(f, s), /^(slots must be a whole number from 2 to 4|fielded must be a whole number from 0 to the slots)$/);
  refused(kitBadge(0, 1), /^slots must be/); refused(kitBadge(3, 2), /^fielded must be/);
  for (const scale of [0, 17, 1.5, '2']) refused(kitBadge(1, 2, scale), /^scale must be a whole number from 1 to 16$/);
  assert.equal(kitBadge(4, 4, 16).ok, true); assert.equal(kitBadge(0, 2, 1).ok, true);
});

test('the gear painter keeps the kernel rules, building on the card engine and the UI kit only', () => {
  assert.deepEqual(violations(readFileSync(new URL('./gear.mjs', import.meta.url), 'utf8'), { imports: ['./kardart.mjs', './ui.mjs'] }), []);
});
