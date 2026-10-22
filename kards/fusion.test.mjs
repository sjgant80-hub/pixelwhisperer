// fusion.test.mjs - the Fusion Lab: a fusion read once and refused with a reason when it is not one, the verdict worked out from
// the record (kept only when the fused card beats both parents), every fact on the picture and nothing undecided or unknown, the
// family tree (a card the device does not hold drawn as unknown), the size contract, and the pins that freeze them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { MAX_TRIES, checkFusion, fusionVerdict, paintFusion, checkLineage, paintLineage } from './fusion.mjs';
import { THEMES, RAR, creatureFront } from './kardart.mjs';
import { idOf } from './corpus.mjs';
import { violations } from './source-check.mjs';

const sha = (u8) => createHash('sha256').update(u8).digest('hex');
const same = (a, b) => Buffer.from(a).equals(Buffer.from(b));
const refused = (r, why) => { assert.equal(r.ok, false); assert.equal(typeof r.why, 'string'); if (why) assert.match(r.why, why); };
const THEME_IDS = Object.keys(THEMES);
const A = { id: idOf('parent-a'), rarity: 'rare', gate: 874000, title: 'Churn Seer' }, B = { id: idOf('parent-b'), rarity: 'epic', gate: 861500, title: 'Basket Oracle' };
const FUSED = { id: idOf('fused'), rarity: 'legendary', gate: 878300, title: 'Churn Basket' };
const KEPT = { a: A, b: B, tried: 4, fused: FUSED };
const REFUSED = { a: A, b: B, tried: 12, best: 873900 };
const READY = { ...KEPT, decided: 0 }, FUSING = { ...KEPT, decided: 2 };
const STATES = [READY, FUSING, { ...KEPT, decided: 3 }, KEPT, REFUSED, { ...REFUSED, decided: 8 }, { a: A, b: B, tried: 3, best: null }, { a: A, b: B, tried: 5 }, { a: { ...A, title: '' }, b: { ...B, title: 'Fourteen chars' }, tried: 1, fused: { id: FUSED.id, rarity: 'common', gate: 1000000 } }];
const draw = (f, theme = 'synthwave-v1', w = 240, h = 160) => { const r = paintFusion(f, theme, w, h); assert.equal(r.ok, true, r.why); return r.px; };
const tree = (n, r, parents) => ({ id: idOf('tree-' + n), ...(r ? { rarity: r } : {}), ...(parents ? { parents } : {}) });
const TREE = tree(0, 'legendary', [tree(1, 'rare', [tree(3, 'common', [tree(7, 'uncommon'), tree(8, 'rare')]), tree(4)]), tree(2, 'epic', [tree(5, 'legendary'), tree(6, 'epic', [tree(13, 'common'), tree(14, 'rare')])])]);
const drawTree = (t, theme = 'synthwave-v1', w = 240, h = 160) => { const r = paintLineage(t, theme, w, h); assert.equal(r.ok, true, r.why); return r.px; };
const rgb = (px, x, y, w = 240) => (px[(y * w + x) * 3] << 16) | (px[(y * w + x) * 3 + 1] << 8) | px[(y * w + x) * 3 + 2];
const colours = (px) => { const s = new Set(); for (let i = 0; i < px.length; i += 3) s.add((px[i] << 16) | (px[i + 1] << 8) | px[i + 2]); return [...s].sort((a, b) => a - b); };
const PINS = {};

test('a fusion: read once, and anything that is not one refused with a reason', () => {
  assert.equal(MAX_TRIES, 12);
  assert.deepEqual(checkFusion(KEPT), { ok: true, f: { a: { id: A.id, rarity: 'rare', ri: 2, title: 'Churn Seer', gate: 874000 }, b: { id: B.id, rarity: 'epic', ri: 3, title: 'Basket Oracle', gate: 861500 }, tried: 4, fused: { id: FUSED.id, rarity: 'legendary', ri: 4, title: 'Churn Basket', gate: 878300 }, best: undefined, decided: 4, beat: 874000 } });
  assert.deepEqual(checkFusion(REFUSED).f, { ...checkFusion(KEPT).f, tried: 12, fused: null, best: 873900, decided: 12 });
  assert.equal(checkFusion({ ...REFUSED, fused: null }).ok, true, 'fused: null is a refused fusion');
  assert.equal(checkFusion({ a: { ...A, title: undefined }, b: B, tried: 1 }).f.a.title, '', 'a title is optional');
  for (const x of [null, undefined, 5, 'fusion', []]) refused(checkFusion(x), /^the fusion must be an object$/);
  for (const [k, msg] of [['a', /^a must be an object$/], ['b', /^b must be an object$/]]) for (const v of [null, 5, [], 'card']) refused(checkFusion({ ...KEPT, [k]: v }), msg);
  for (const id of ['XYZ', 'abc', A.id + '0', 5, Array.from(A.id)]) { refused(checkFusion({ ...KEPT, a: { ...A, id } }), /^a id must be 16 lowercase hex characters$/); refused(checkFusion({ ...KEPT, b: { ...B, id } }), /^b id must be 16 lowercase hex/); }
  for (const rarity of ['mythic', '', null]) refused(checkFusion({ ...KEPT, a: { ...A, rarity } }), /^a rarity must be one of common, uncommon, rare, epic, legendary$/);
  for (const r of ['common', 'legendary']) assert.equal(checkFusion({ ...KEPT, a: { ...A, rarity: r } }).ok, true, r);
  for (const title of ['x'.repeat(17), 'Churn~Seer', 5, null]) refused(checkFusion({ ...KEPT, b: { ...B, title } }), /^b title must be at most 16 characters from A-Z a-z 0-9 space & \. - and the apostrophe$/);
  assert.equal(checkFusion({ ...KEPT, b: { ...B, title: "Sixteen chars &'" } }).ok, true, 'sixteen characters');
  for (const gate of [-1, 1000001, 1.5, '874000', null, undefined]) refused(checkFusion({ ...KEPT, a: { ...A, gate } }), /^a gate must be a whole number of millionths from 0 to 1000000$/);
  for (const [ga, gb] of [[0, 0], [1000000, 999999]]) assert.equal(checkFusion({ a: { ...A, gate: ga }, b: { ...B, gate: gb }, tried: 1 }).ok, true, ga + ' ' + gb);
  refused(checkFusion({ ...KEPT, b: { ...B, id: A.id } }), /^a card is not fused with itself$/);
  for (const tried of [0, 13, 1.5, '4', null, undefined, -1]) refused(checkFusion({ ...KEPT, tried }), /^tried must be a whole number from 1 to 12$/);
  for (const tried of [1, 12]) assert.equal(checkFusion({ ...KEPT, tried }).f.tried, tried);
  for (const fused of [5, [], 'card']) refused(checkFusion({ ...KEPT, fused }), /^the fused card must be an object$/);
  refused(checkFusion({ ...KEPT, fused: { ...FUSED, id: 'nope' } }), /^the fused card id must be 16 lowercase hex characters$/);
  refused(checkFusion({ ...KEPT, fused: { ...FUSED, title: 'x'.repeat(17) } }), /^the fused card title must be at most 16/);
  for (const gate of [undefined, -1, 1.5]) refused(checkFusion({ ...KEPT, fused: { ...FUSED, gate } }), /^the fused card gate must be a whole number of millionths from 0 to 1000000$/);
  for (const id of [A.id, B.id]) refused(checkFusion({ ...KEPT, fused: { ...FUSED, id } }), /^the fused card is a new card, not one of its parents$/);
  for (const gate of [874000, 861500, 0]) refused(checkFusion({ ...KEPT, fused: { ...FUSED, gate } }), /^a fused card beats both parents: its gate must be above both of theirs$/);
  assert.equal(checkFusion({ ...KEPT, fused: { ...FUSED, gate: 874001 } }).ok, true, 'one millionth above the better parent is better');
  assert.equal(checkFusion({ a: { ...A, gate: 500000 }, b: { ...B, gate: 600000 }, tried: 1, fused: { ...FUSED, gate: 600001 } }).f.beat, 600000, 'the line to beat is the better parent, whichever side');
  for (const best of [null, 0, 873900]) refused(checkFusion({ ...KEPT, best }), /^best is for a refused fusion: a kept one shows its fused card\x27s GATE$/);
  for (const best of [874001, 1000000, -1, 1.5, '873900', []]) refused(checkFusion({ ...REFUSED, best }), /^the best try of a refused fusion did not beat both parents: a whole number of millionths up to the better parent\x27s GATE, or null$/);
  for (const best of [874000, 0, null, undefined]) assert.equal(checkFusion({ ...REFUSED, best }).f.best, best, 'best ' + best);
  for (const decided of [-1, 5, 1.5, '2', null]) refused(checkFusion({ ...KEPT, decided }), /^decided must be a whole number from 0 to the number tried$/);
  for (const decided of [0, 4]) assert.equal(checkFusion({ ...KEPT, decided }).f.decided, decided);
  refused(checkFusion({ ...KEPT, get tried() { throw new Error('toxic'); } }), /^the fusion could not be read$/);
});

test('the verdict is worked out from the record: kept only when the fused card beats both parents, refused when none did', () => {
  assert.deepEqual(fusionVerdict(KEPT), { ok: true, kept: true, beat: 874000, gate: 878300, tried: 4, tries: 4 });
  assert.deepEqual(fusionVerdict(REFUSED), { ok: true, kept: false, beat: 874000, gate: null, tried: 12, tries: 12 });
  assert.deepEqual(fusionVerdict({ ...KEPT, decided: 3 }), { ok: true, kept: null, beat: 874000, gate: null, tried: 3, tries: 4 }, 'while the tries are shown there is no verdict');
  assert.deepEqual(fusionVerdict(READY), { ok: true, kept: null, beat: 874000, gate: null, tried: 0, tries: 4 });
  assert.deepEqual(fusionVerdict({ ...REFUSED, decided: 11 }), { ok: true, kept: null, beat: 874000, gate: null, tried: 11, tries: 12 });
  refused(fusionVerdict(null), /^the fusion must be an object$/);
});

test('the picture: every fact of a fusion is on it, nothing undecided or unknown is, and the same fusion is always the same bytes', () => {
  for (const t of THEME_IDS) {
    const h = createHash('sha256');
    for (const f of STATES) { const px = draw(f, t); assert.equal(same(px, draw(f, t)), true, 'deterministic'); h.update(px); }
    PINS[t] = h.digest('hex');
    assert.equal(new Set(STATES.map((f) => sha(draw(f, t)))).size, STATES.length, t + ': every state its own picture');
  }
  for (const base of [KEPT, FUSING, REFUSED]) {
    const px = draw(base);
    for (const ch of [
      { a: { ...base.a, id: idOf('other-a') } }, { a: { ...base.a, rarity: 'common' } }, { a: { ...base.a, gate: base.a.gate + 100 } }, { a: { ...base.a, title: 'Churn Seen' } },
      { b: { ...base.b, id: idOf('other-b') } }, { b: { ...base.b, rarity: 'uncommon' } }, { b: { ...base.b, gate: base.b.gate + 100 } }, { b: { ...base.b, title: '' } },
      { tried: base.tried - 1, ...(base.decided === undefined ? {} : { decided: 1 }) },
    ]) assert.equal(same(px, draw({ ...base, ...ch })), false, JSON.stringify(ch).slice(0, 80));
  }
  for (const ch of [{ fused: { ...FUSED, id: idOf('another') } }, { fused: { ...FUSED, rarity: 'epic' } }, { fused: { ...FUSED, title: 'Churn Baskets' } }, { fused: { ...FUSED, title: undefined } }, { fused: { ...FUSED, gate: 878400 } }]) assert.equal(same(draw(KEPT), draw({ ...KEPT, ...ch })), false, JSON.stringify(ch));
  for (const ch of [{ best: 873800 }, { best: null }, { best: undefined }, { best: 0 }]) assert.equal(same(draw(REFUSED), draw({ ...REFUSED, ...ch })), false, 'best ' + ch.best);
  assert.equal(same(draw({ ...REFUSED, best: null }), draw({ ...REFUSED, best: undefined })), false, 'no live child is not the same as not known');
  for (const d of [0, 1, 2, 3]) assert.equal(same(draw({ ...KEPT, decided: d }), draw({ ...KEPT, decided: d + 1 })), false, 'decided ' + d);
  for (const ch of [{ fused: { ...FUSED, id: idOf('another') } }, { fused: { ...FUSED, rarity: 'common', title: 'Other', gate: 990000 } }]) assert.ok(same(draw(FUSING), draw({ ...FUSING, ...ch })), 'what is not yet decided is not shown');
  assert.ok(same(draw({ ...FUSING, fused: undefined }), draw(FUSING)), 'not even whether it will be kept');
  for (const best of [873800, null, undefined]) assert.ok(same(draw({ ...REFUSED, decided: 8, best }), draw({ ...REFUSED, decided: 8 })), 'a refusal\x27s best is not shown before its end');
  assert.equal(same(draw({ a: A, b: B, tried: 1 }), draw({ a: A, b: B, tried: 2 })), false, 'a try never made is not one that was');
  const px = draw(KEPT), fr = creatureFront(FUSED.id), q = [...Array(126).keys()].find((n) => fr.px[n * 4 + 3]);
  assert.equal(rgb(px, 102 + (q % 9) * 4, 36 + Math.floor(q / 9) * 4), (fr.px[q * 4] << 16) | (fr.px[q * 4 + 1] << 8) | fr.px[q * 4 + 2], 'the fused card stands in the chamber, 4 px a voxel');
  for (const [p, x0] of [[A, 16], [B, 188]]) {
    const f2 = creatureFront(p.id), q2 = [...Array(126).keys()].find((n) => f2.px[n * 4 + 3]);
    assert.equal(rgb(px, x0 + (q2 % 9) * 4 + 3, 37 + Math.floor(q2 / 9) * 4 + 3), (f2.px[q2 * 4] << 16) | (f2.px[q2 * 4 + 1] << 8) | f2.px[q2 * 4 + 2], 'each parent on its pedestal');
  }
  assert.equal(rgb(px, 48 + 3 * 12 + 4, 145), 0xffd23c, 'the kept try is the gold bar, in its own slot'); assert.notEqual(rgb(draw(REFUSED), 48 + 3 * 12 + 4, 145), 0xffd23c);
  assert.notEqual(rgb(draw({ ...KEPT, tried: 5 }), 48 + 3 * 12 + 4, 145), 0xffd23c, 'tried five: the gold bar is the fifth');
  assert.equal(rgb(px, 86, 10), 0xffd23c, 'a kept fusion wears the gold stamp'); assert.notEqual(rgb(draw(REFUSED), 86, 10), 0xffd23c); assert.notEqual(rgb(draw(FUSING), 86, 10), 0xffd23c);
  assert.equal(rgb(draw(REFUSED), 2, 60), 0x7a1020, 'a refused one, the red ribbon'); assert.notEqual(rgb(px, 2, 60), 0x7a1020); assert.notEqual(rgb(draw({ ...REFUSED, decided: 8 }), 2, 60), 0x7a1020);
});

test('every theme keeps its palette: the pocket screen four shades, the blueprint inks its creatures', () => {
  for (const f of STATES) assert.deepEqual(colours(draw(f, 'lcd-v1')), [0x0f1210, 0x4a5048, 0x9aa095, 0xd8dccf], 'the pocket screen is four shades');
  const px = draw(KEPT, 'blueprint-v1'), fr = creatureFront(FUSED.id);
  for (let q = 0; q < 126; q++) if (fr.px[q * 4 + 3]) assert.ok([0x0e3b78, 0x3468b0, 0x9cc3f0, 0xeef5ff].includes(rgb(px, 102 + (q % 9) * 4 + 1, 36 + Math.floor(q / 9) * 4 + 1)), 'inked voxel ' + q);
});

test('sizes: a whole-number scale of 240 x 160, the lab in the middle; everything from 64 to 2048 paints; the painters never throw', () => {
  for (const [w, h, k] of [[240, 160, 1], [480, 320, 2], [720, 480, 3], [64, 64, 1], [2048, 64, 1], [64, 2048, 1], [479, 320, 1], [480, 319, 1]]) {
    const r = paintFusion(KEPT, 'synthwave-v1', w, h);
    assert.equal(r.ok, true); assert.equal(r.scale, k, w + 'x' + h); assert.equal(r.px.length, w * h * 3);
  }
  const one = draw(KEPT, 'blockcraft-v1'), two = draw(KEPT, 'blockcraft-v1', 480, 320), wide = draw(KEPT, 'blockcraft-v1', 400, 160), tall = draw(KEPT, 'blockcraft-v1', 240, 250), narrow = draw(KEPT, 'blockcraft-v1', 200, 160), odd = draw(KEPT, 'blockcraft-v1', 241, 161);
  const tone = drawTree(TREE, 'blockcraft-v1'), ttwo = drawTree(TREE, 'blockcraft-v1', 480, 320), twide = drawTree(TREE, 'blockcraft-v1', 400, 200);
  for (let y = 0; y < 160; y++) for (let x = 0; x < 240; x++) {
    assert.equal(rgb(two, 2 * x, 2 * y, 480), rgb(one, x, y), 'twice the size: each pixel a 2 x 2 block');
    assert.equal(rgb(wide, x + 80, y, 400), rgb(one, x, y), 'wider: the lab in the middle');
    assert.equal(rgb(tall, x, y + 45, 240), rgb(one, x, y), 'taller: the lab in the middle');
    if (x >= 20 && x < 220) assert.equal(rgb(narrow, x - 20, y, 200), rgb(one, x, y), 'narrower: its middle shows');
    assert.equal(rgb(odd, x + 1, y, 241), rgb(one, x, y), 'one pixel more: the same lab, the spare column on the left and the spare row below');
    assert.equal(rgb(ttwo, 2 * x, 2 * y, 480), rgb(tone, x, y), 'a tree at twice the size');
    assert.equal(rgb(twide, x + 80, y + 20, 400), rgb(tone, x, y), 'a tree in the middle of a bigger picture');
  }
  for (const [w, h] of [[63, 160], [240, 63], [2049, 160], [240, 2049], [240.5, 160], ['240', 160], [null, 160]]) { refused(paintFusion(KEPT, 'synthwave-v1', w, h), /^width and height must be whole numbers from 64 to 2048$/); refused(paintLineage(TREE, 'synthwave-v1', w, h), /^width and height must be whole numbers from 64 to 2048$/); }
  for (const t of ['', 'synthwave', 'toString', null, 5]) { refused(paintFusion(KEPT, t, 240, 160), /^unknown theme$/); refused(paintLineage(TREE, t, 240, 160), /^unknown theme$/); }
  refused(paintFusion({ ...KEPT, decided: 9 }, 'synthwave-v1', 240, 160), /^decided must be/);
  refused(paintLineage({ id: 'x' }, 'synthwave-v1', 240, 160), /^every card id must be/);
  const h = createHash('sha256');
  for (const [w, hh] of [[64, 64], [720, 480], [2048, 160], [241, 1000]]) { h.update(draw(REFUSED, 'memphis-v1', w, hh)); h.update(drawTree(TREE, 'lcd-v1', w, hh)); }
  PINS.sizes = h.digest('hex');
  const circular = {}; circular.self = circular;
  for (const x of [null, undefined, 5n, Symbol('s'), circular, { ...KEPT, a: circular }, { ...KEPT, tried: 5n }, { id: idOf('x'), rarity: 'rare', parents: [circular, circular] }, new Proxy({}, { get() { throw new Error('x'); } })]) {
    for (const fn of [paintFusion, paintLineage]) { assert.doesNotThrow(() => fn(x, 'synthwave-v1', 240, 160)); assert.equal(fn(x, 'synthwave-v1', 240, 160).ok, false); }
    for (const fn of [checkFusion, fusionVerdict, checkLineage]) assert.doesNotThrow(() => fn(x));
  }
});

test('a family tree: a fused card over its parents and theirs, four generations; a card not held here is unknown, never invented', () => {
  const c = checkLineage(TREE);
  assert.equal(c.ok, true); assert.equal(c.t.ri, 4); assert.equal(c.t.parents.length, 2); assert.equal(c.t.parents[0].parents[0].parents[1].id, idOf('tree-8'));
  assert.deepEqual(c.t.parents[0].parents[1], { id: idOf('tree-4'), ri: null, parents: [] }, 'not held here: no rarity, no parents');
  assert.deepEqual(checkLineage({ id: A.id, rarity: 'rare' }), { ok: true, t: { id: A.id, ri: 2, parents: [] } }, 'a first card has no parents');
  assert.deepEqual(checkLineage({ id: A.id, rarity: 'common', parents: [] }).t, { id: A.id, ri: 0, parents: [] });
  assert.deepEqual(checkLineage({ id: A.id }), { ok: true, t: { id: A.id, ri: null, parents: [] } });
  for (const x of [null, 5, [], 'tree']) refused(checkLineage(x), /^every card in the tree must be an object$/);
  refused(checkLineage(tree(0, 'rare', [tree(1, 'rare'), null])), /^every card in the tree must be an object$/);
  refused(checkLineage({ id: 'nope', rarity: 'rare' }), /^every card id must be 16 lowercase hex characters$/);
  for (const rarity of ['mythic', null, '']) refused(checkLineage(tree(0, 'rare', [tree(1, 'rare'), { id: idOf('x'), rarity }])), /^every rarity must be one of common, uncommon, rare, epic, legendary \(or none, for a card this device does not hold\)$/);
  for (const parents of [[tree(1, 'rare')], [tree(1, 'rare'), tree(2, 'rare'), tree(3, 'rare')], 'two', null]) refused(checkLineage({ ...tree(0, 'rare'), parents }), /^a card has two parents, or none$/);
  refused(checkLineage({ id: A.id, parents: [tree(1, 'rare'), tree(2, 'rare')] }), /^a card this device does not hold is drawn alone: its parents are not known here$/);
  refused(checkLineage(tree(0, 'rare', [tree(1, 'rare', [tree(2, 'rare', [tree(3, 'rare', [tree(4, 'rare'), tree(5, 'rare')]), tree(6, 'rare')]), tree(7, 'rare')]), tree(8, 'rare')])), /^a tree shows four generations: the card and three above it$/);
  refused(checkLineage(tree(0, 'rare', [tree(1, 'rare'), tree(1, 'epic')])), /^a card is not fused with itself$/);
  for (const parents of [[tree(0, 'rare'), tree(1, 'rare')], [tree(1, 'rare'), tree(0)]]) refused(checkLineage(tree(0, 'rare', parents)), /^a card is not its own parent$/);
  refused(checkLineage({ id: A.id, rarity: 'rare', get parents() { throw new Error('toxic'); } }), /^the tree could not be read$/);
  assert.equal(checkLineage(tree(0, 'rare', [tree(1, 'rare', [tree(3, 'rare'), tree(4, 'rare')]), tree(2, 'rare', [tree(3, 'rare'), tree(4, 'rare')])])).ok, true, 'an ancestor may stand in two places');

  const px = drawTree(TREE), R = RAR[4];
  assert.equal(rgb(px, 110, 4), R.hi, 'the card at the top, framed in its rarity');
  assert.equal(rgb(px, 108, 2), 0xffd23c, 'a fused card wears a gold ring'); assert.notEqual(rgb(drawTree({ id: TREE.id, rarity: 'legendary' }), 108, 2), 0xffd23c);
  const fr = creatureFront(TREE.id), q = [...Array(126).keys()].find((n) => fr.px[n * 4 + 3]);
  assert.equal(rgb(px, 111 + (q % 9) * 2, 5 + Math.floor(q / 9) * 2), (fr.px[q * 4] << 16) | (fr.px[q * 4 + 1] << 8) | fr.px[q * 4 + 2], 'its creature at 2 px a voxel');
  const bare = drawTree({ id: TREE.id, rarity: 'legendary' });
  for (const [cx, y] of [[64, 44], [176, 44], [36, 84], [92, 84], [148, 84], [204, 84], [22, 124], [50, 124], [190, 124], [218, 124]]) assert.notEqual(rgb(px, cx - 10, y), rgb(bare, cx - 10, y), 'a block at ' + cx + ',' + y);
  assert.equal(rgb(px, 120, 36), rgb(px, 120, 37), 'a wire down from the card');
  assert.equal(rgb(px, 92 - 10, 84), 0x2be8ff, 'the unknown card: a dashed outline'); assert.notEqual(rgb(px, 92 - 9, 84), 0x2be8ff, 'dashed');
  const unknownElsewhere = structuredClone(TREE); unknownElsewhere.parents[0].parents[1].id = idOf('someone-else');
  assert.ok(same(px, drawTree(unknownElsewhere)), 'an unknown card shows nothing of its id');
  const known = structuredClone(TREE); known.parents[0].parents[1].rarity = 'rare';
  assert.equal(same(px, drawTree(known)), false, 'held, it is drawn');
  const edits = [[(t) => { t.parents[0].parents[0].parents[0].id = idOf('edit'); }, 'a great-grandparent'], [(t) => { t.parents[1].parents[1].parents[1].rarity = 'common'; }, 'another'], [(t) => { t.parents[1].parents[0].rarity = 'rare'; }, 'a grandparent'], [(t) => { t.parents[0].id = idOf('edit2'); }, 'a parent'], [(t) => { t.rarity = 'epic'; }, 'the card'], [(t) => { delete t.parents[1].parents[1].parents[1].rarity; }, 'one becomes unknown']];
  for (const [edit, what] of edits) { const t2 = structuredClone(TREE); edit(t2); assert.equal(same(px, drawTree(t2)), false, what); }
  for (const t of THEME_IDS) { const h = createHash('sha256'); for (const tr of [TREE, TREE.parents[1], { id: A.id, rarity: 'common' }, { id: A.id }]) h.update(drawTree(tr, t)); PINS['tree ' + t] = h.digest('hex'); }
  for (const tr of [TREE, TREE.parents[0]]) assert.deepEqual(colours(drawTree(tr, 'lcd-v1')), [0x0f1210, 0x4a5048, 0x9aa095, 0xd8dccf]);
});

test('the pins: the lab and the trees are frozen, byte for byte', () => {
  const want = {
    'synthwave-v1': '27aee8a7c03b66a200b851c85c9c85c8147f971d2ed90a22dcab3fc62ea57df3',
    'blockcraft-v1': '1013093910b7dcd090c418e26fb9668b213c6f3d434711a5e4453aa080e4857b',
    'lcd-v1': 'd8f6cd2dab0ae56a3ececa73fd8b3f1cd246dac21cecb796961e267b63833b12',
    'memphis-v1': '9c477c1b7ef001e79b5e7fdeeb0fb67ae6a8dda0d3b26bedaafd876b5cbbc195',
    'blueprint-v1': '594517239f9abf13dff001c34bf41b1780a771c350b23f272555a931fe4090ab',
    'sizes': 'a732a7f24f372eea235601280c1f16b32e96b30c82aa61747bae9672f17af764',
    'tree synthwave-v1': '250bb6fd701d03d9db89ff6b5605c5668db301021afe55e2ad9b4880f3addca0',
    'tree blockcraft-v1': '738930409d55242c49e32c6e46eae9b17f2dc01de63a00cf905c0813ddf28729',
    'tree lcd-v1': 'f25ad86959ef548e19516ef1c07bc5e9e0c93a46aa72870e9106674a6f451dba',
    'tree memphis-v1': 'd55a17889cda90d2d14e40f47667fa0c91f4325431ef04d8537045ca7541cba2',
    'tree blueprint-v1': '0d9d9d4160c6e681f0b4801945781ef6bbd1a60fcb7baa48368103926578d3ee',
  };
  assert.deepEqual(Object.keys(PINS).sort(), [...THEME_IDS, ...THEME_IDS.map((t) => 'tree ' + t), 'sizes'].sort(), 'a pin for every theme, every tree theme and the sizes');
  assert.deepEqual(PINS, want);
});

test('the fusion painter keeps the kernel rules, building on the card engine and the UI kit only', () => {
  assert.deepEqual(violations(readFileSync(new URL('./fusion.mjs', import.meta.url), 'utf8'), { imports: ['./kardart.mjs', './ui.mjs'] }), []);
});
