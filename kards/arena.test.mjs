// arena.test.mjs - the duel painter: a duel read once and refused with a reason when it is not one, the published tally
// rule, the same duel always the same bytes, every fact of a duel on the picture, and the pins that freeze it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { checkDuel, duelScore, paintDuel } from './arena.mjs';
import { THEMES } from './kardart.mjs';
import { idOf } from './corpus.mjs';
import { violations } from './source-check.mjs';

const sha = (u8) => createHash('sha256').update(u8).digest('hex');
const same = (a, b) => Buffer.from(a).equals(Buffer.from(b));
const refused = (r, why) => { assert.equal(r.ok, false); assert.equal(typeof r.why, 'string'); if (why) assert.match(r.why, why); };
const THEME_IDS = Object.keys(THEMES);   // every published theme: a theme that some painter cannot draw turns this red
const CASES = Array.from({ length: 48 }, (_, n) => { const h = parseInt(idOf('case-' + n).slice(0, 4), 16); return [h & 1, (h >> 1) & 1]; });
const DUEL = Object.freeze({ left: { id: idOf('duel-left'), rarity: 'epic', rating: 1640, title: 'Churn Hunter' }, right: { id: idOf('duel-right'), rarity: 'rare', rating: 1585, title: 'Bank Sentinel' }, cases: CASES, decided: 30 });
const draw = (d, theme = 'synthwave-v1', w = 240, h = 160) => { const r = paintDuel(d, theme, w, h); assert.equal(r.ok, true, r.why); return r.px; };
const PINS = {   // the published duel pictures: a change to how a duel is drawn is a new theme id, as with the cards
  'blueprint-v1': '6f2e12cb96d74947ccaa47077382450c2dca90e1d215aeb30933ac1fe87cf692',
  kitted: 'd7ea7cedcbea4fec7cefc1843733440b540489256c12962f5690eaae1204a98d',
  draw: '047a04d557e478ce68b77f0c198fde0a0c6514e917904ef50e660ab2f94db97d',
  'synthwave-v1': 'e270ce29d81798b6070c6690115666d5ea48afaa3c7443084e83ba538e4c75b3', 'blockcraft-v1': '5ed4ab440a3001bd36fdef6ee2e6cdf71d1989df46321dab33c3411a55329575', 'lcd-v1': 'd4d8481bf42b10471a6f33534d02ebf905388a82f5ec43d79f9f10baac7de820', 'memphis-v1': '384a22051dc18fa6ae76f8feb77d5848e46dfeec882280697ed55e944aca88c9',
  win: 'd50d7552e1182ef9688b09dc4076ec12ef7178fd0c32b81248d9fc20fc7250cd', refused: '4767b9218e022e90371dedc55b8dd0cc1ddc029eccce5c14c4e5ae140a584b68', ready: '4ce5623c1adf306964856d119cb4a483353ce30d5f4164e76eb1d8188831c72e', full: 'b46e59f5cbaad62bdb52f25841f0064267c9f3330a912259e728044bcb304ea5', wide: '3b9ce9b4053bb58104517b7e49013f23f0c65a69d3c04559194e173d7f473d80',
};

test('a duel: read once, and anything that is not one refused with a reason', () => {
  const c = checkDuel(DUEL);
  assert.equal(c.ok, true);
  assert.deepEqual(c.d.left, { id: DUEL.left.id, rarity: 'epic', ri: 3, rating: 1640, title: 'Churn Hunter', kit: null });
  assert.deepEqual(checkDuel({ ...DUEL, left: { ...DUEL.left, kit: { slots: 4, fielded: 3, extra: 1 } } }).d.left.kit, { slots: 4, fielded: 3 }, 'a kit: its node slots and how many are fielded');
  for (const kit of [{ slots: 2, fielded: 0 }, { slots: 4, fielded: 4 }, { slots: 3, fielded: 2 }]) assert.equal(checkDuel({ ...DUEL, right: { ...DUEL.right, kit } }).ok, true, JSON.stringify(kit));
  for (const kit of [{ slots: 1, fielded: 0 }, { slots: 5, fielded: 0 }, { slots: 2, fielded: 3 }, { slots: 2, fielded: -1 }, { slots: 2.5, fielded: 1 }, { slots: '3', fielded: 1 }, { fielded: 1 }, [], 'kit', 5, Object.assign([], { slots: 3, fielded: 1 }), Object.assign(function kit() {}, { slots: 3, fielded: 1 })]) refused(checkDuel({ ...DUEL, right: { ...DUEL.right, kit } }), /^right kit must be { slots: 2 to 4, fielded: 0 to slots }$/);
  assert.equal(c.d.decided, 30); assert.equal(c.d.result, null); assert.deepEqual(c.d.cases, CASES);
  assert.equal(checkDuel({ ...DUEL, decided: undefined }).d.decided, 48, 'every case is decided unless it says otherwise');
  const { decided, ...noDecided } = DUEL;
  assert.equal(checkDuel(noDecided).d.decided, 48);
  for (const result of ['left', 'right', 'refused', 'draw', null]) assert.equal(checkDuel({ ...DUEL, result }).d.result, result);
  assert.equal(checkDuel({ ...DUEL, left: { ...DUEL.left, title: undefined } }).d.left.title, '', 'a title is optional');
  for (const x of [null, 5, 'duel', []]) refused(checkDuel(x), /^the duel must be an object$/);
  for (const [side, other] of [['left', 'right'], ['right', 'left']]) {
    const d = (s) => ({ ...DUEL, [side]: s });
    for (const s of [null, 5, []]) refused(checkDuel(d(s)), new RegExp('^' + side + ' must be an object$'));
    for (const id of ['XYZ', 'abc', '0123456789abcdef0', 5, null, Array.from('0123456789abcdef')]) refused(checkDuel(d({ ...DUEL[side], id })), new RegExp('^' + side + ' id must be 16 lowercase hex characters$'));
    refused(checkDuel(d({ ...DUEL[side], rarity: 'mythic' })), new RegExp('^' + side + ' rarity must be one of common, uncommon, rare, epic, legendary$'));
    for (const rarity of ['common', 'legendary']) assert.equal(checkDuel(d({ ...DUEL[side], rarity })).ok, true, rarity);
    for (const rating of [-1, 10000, 1.5, '1600', null]) refused(checkDuel(d({ ...DUEL[side], rating })), new RegExp('^' + side + ' rating must be a whole number from 0 to 9999$'));
    for (const rating of [0, 9999]) assert.equal(checkDuel(d({ ...DUEL[side], rating })).ok, true);
    for (const title of ['T'.repeat(17), 'a/b', 5]) refused(checkDuel(d({ ...DUEL[side], title })), new RegExp('^' + side + ' title must be at most 16 characters'));
    assert.equal(checkDuel(d({ ...DUEL[side], title: 'T'.repeat(16) })).ok, true);
    assert.ok(other);
  }
  refused(checkDuel({ ...DUEL, right: { ...DUEL.right, id: DUEL.left.id } }), /^a card does not duel itself$/);
  for (const cases of [[], 'x', null, Array.from({ length: 193 }, () => [1, 0])]) refused(checkDuel({ ...DUEL, cases, decided: 0 }), /^cases must be an array of 1 to 192$/);
  assert.equal(checkDuel({ ...DUEL, cases: Array.from({ length: 192 }, () => [1, 0]), decided: 192 }).ok, true, '192 cases');
  assert.equal(checkDuel({ ...DUEL, cases: [[0, 1]], decided: 1 }).ok, true, 'one case');
  for (const bad of [[1], [1, 0, 1], [2, 0], [0, -1], ['1', 0], [true, 0], null, 'hit']) refused(checkDuel({ ...DUEL, cases: [bad], decided: 1 }), /^every case must be \[leftHit, rightHit\], each 0 or 1$/);
  for (const d of [-1, 49, 1.5, '3', null]) refused(checkDuel({ ...DUEL, decided: d }), /^decided must be a whole number from 0 to the number of cases$/);
  for (const d of [0, 48]) assert.equal(checkDuel({ ...DUEL, decided: d }).ok, true);
  for (const result of ['win', 'LEFT', 'Draw', '', 0]) refused(checkDuel({ ...DUEL, result }), /^result must be left, right, refused, draw or null$/);
  const trap = Object.defineProperty({}, 'left', { get() { throw new Error('boom'); }, enumerable: true });
  refused(checkDuel(trap), /^the duel could not be read$/);
});

test('the published tally: a side ranked a case better when it hit and the other missed; the rest are ties', () => {
  const four = { ...DUEL, cases: [[1, 0], [0, 1], [1, 1], [0, 0]] };
  assert.deepEqual(duelScore({ ...four, decided: 4 }), { ok: true, left: 1, right: 1, ties: 2, decided: 4, cases: 4 });
  assert.deepEqual(duelScore({ ...four, decided: 1 }), { ok: true, left: 1, right: 0, ties: 0, decided: 1, cases: 4 }, 'only decided cases count');
  assert.deepEqual(duelScore({ ...four, cases: [[1, 0], [1, 0], [0, 1]], decided: 3 }), { ok: true, left: 2, right: 1, ties: 0, decided: 3, cases: 3 });
  const s = duelScore(DUEL);
  assert.equal(s.left + s.right + s.ties, 30);
  refused(duelScore({ ...DUEL, decided: 99 }), /^decided must be/);
});

test('duels re-draw byte for byte: pinned in every theme and every state', () => {
  for (const t of THEME_IDS) assert.equal(sha(draw(DUEL, t, 480, 320)), PINS[t], t);
  assert.equal(sha(draw({ ...DUEL, decided: 48, result: 'left' }, 'blockcraft-v1', 480, 320)), PINS.win);
  assert.equal(sha(draw({ ...DUEL, decided: 48, result: 'refused' }, 'memphis-v1', 480, 320)), PINS.refused);
  assert.equal(sha(draw({ ...DUEL, cases: CASES.concat(CASES).slice(0, 64), decided: 64, result: 'draw' }, 'lcd-v1', 480, 320)), PINS.draw, 'a draw, on the 64 cases a DIGI duel deals');
  assert.equal(sha(draw({ ...DUEL, decided: 0 }, 'lcd-v1', 480, 320)), PINS.ready);
  assert.equal(sha(draw({ ...DUEL, cases: Array.from({ length: 192 }, (_, n) => CASES[n % 48]), decided: 150, result: 'right' }, 'synthwave-v1', 480, 320)), PINS.full);
  assert.equal(sha(draw(DUEL, 'synthwave-v1', 1200, 630)), PINS.wide);
  assert.equal(sha(draw({ ...DUEL, left: { ...DUEL.left, kit: { slots: 4, fielded: 3 } }, right: { ...DUEL.right, kit: { slots: 2, fielded: 0 } } }, 'blockcraft-v1', 480, 320)), PINS.kitted, 'kitted: the node slots of each card, lit as they are fielded');
});

test('every fact of a duel is on the picture', () => {
  const base = draw(DUEL);
  const differs = (d, what) => assert.equal(same(base, draw(d)), false, what);
  differs({ ...DUEL, left: { ...DUEL.left, id: idOf('another') } }, 'the left card');
  differs({ ...DUEL, right: { ...DUEL.right, id: idOf('another') } }, 'the right card');
  differs({ ...DUEL, left: { ...DUEL.left, rarity: 'legendary' } }, 'a rarity');
  differs({ ...DUEL, right: { ...DUEL.right, rating: 1586 } }, 'a rating');
  differs({ ...DUEL, left: { ...DUEL.left, title: 'Churn Huntes' } }, 'a title');
  const kitted = (kit) => draw({ ...DUEL, left: { ...DUEL.left, kit } });
  for (const [a, b] of [[null, { slots: 2, fielded: 0 }], [{ slots: 2, fielded: 0 }, { slots: 2, fielded: 1 }], [{ slots: 3, fielded: 2 }, { slots: 4, fielded: 2 }], [{ slots: 4, fielded: 3 }, { slots: 4, fielded: 4 }]]) assert.equal(same(kitted(a), kitted(b)), false, JSON.stringify(a) + ' to ' + JSON.stringify(b));
  differs({ ...DUEL, decided: 31 }, 'one more case decided');
  differs({ ...DUEL, decided: 29 }, 'one fewer');
  differs({ ...DUEL, cases: CASES.map((c, n) => (n === 5 ? [1 - c[0], c[1]] : c)) }, 'one hit or miss');
  differs({ ...DUEL, cases: CASES.map((c, n) => (n === 29 ? [c[0], 1 - c[1]] : c)) }, 'the latest case');
  differs({ ...DUEL, cases: CASES.concat([[1, 1]]) }, 'one more case in the batch');
  for (const result of ['left', 'right', 'refused', 'draw']) differs({ ...DUEL, result }, result);
  const ends = ['left', 'right', 'refused', 'draw'].map((result) => sha(draw({ ...DUEL, result })));
  assert.equal(new Set(ends).size, 4, 'four endings, four pictures');
  assert.equal(same(draw({ ...DUEL, result: 'left' }), draw({ ...DUEL, result: 'right' })), false, 'which side won');
  const marks = [[1, 0], [0, 1], [1, 1], [0, 0]].map((c) => draw({ ...DUEL, cases: [c], decided: 1 }));
  assert.equal(new Set(marks.map((m) => sha(m))).size, 4, 'each of the four outcomes of a case looks different');
});

test('sizes: a whole-number scale of 240 x 160, the arena centred, everything from 64 to 2048 paints; the painter never throws', () => {
  for (const [w, h, k] of [[240, 160, 1], [480, 320, 2], [1200, 630, 3], [64, 64, 1], [2048, 64, 1], [64, 2048, 1], [719, 479, 2]]) {
    const r = paintDuel(DUEL, 'synthwave-v1', w, h);
    assert.equal(r.ok, true); assert.equal(r.scale, k); assert.equal(r.px.length, w * h * 3);
  }
  const one = draw(DUEL, 'blockcraft-v1', 240, 160), two = draw(DUEL, 'blockcraft-v1', 480, 320);
  for (let y = 0; y < 320; y += 7) for (let x = 0; x < 480; x += 5) for (let c = 0; c < 3; c++) assert.equal(two[(y * 480 + x) * 3 + c], one[((y >> 1) * 240 + (x >> 1)) * 3 + c]);
  const wide = draw(DUEL, 'blockcraft-v1', 480, 160), tall = draw(DUEL, 'blockcraft-v1', 240, 320);
  for (let y = 0; y < 160; y += 3) for (let x = 0; x < 240; x += 3) for (let c = 0; c < 3; c++) {
    assert.equal(wide[(y * 480 + x + 120) * 3 + c], one[(y * 240 + x) * 3 + c], 'wider: the arena sits in the middle');
    assert.equal(tall[((y + 80) * 240 + x) * 3 + c], one[(y * 240 + x) * 3 + c], 'taller: the arena sits in the middle');
  }
  for (const [w, h] of [[241, 160], [242, 161], [479, 160], [481, 321], [719, 160], [2048, 319], [64, 64]]) {   // no pixel from outside the canvas: blockcraft never draws pure black
    const px = draw({ ...DUEL, result: 'left' }, 'blockcraft-v1', w, h);
    for (let i = 0; i < px.length; i += 3) assert.ok(px[i] + px[i + 1] + px[i + 2] > 0, w + ' x ' + h + ': a pixel from outside the canvas at ' + i / 3);
  }
  const narrow = draw(DUEL, 'blockcraft-v1', 200, 160);
  for (let y = 0; y < 160; y += 3) for (let x = 0; x < 200; x += 3) assert.equal(narrow[(y * 200 + x) * 3], one[(y * 240 + x + 20) * 3], 'narrower: its middle shows');
  for (const [w, h] of [[63, 160], [240, 63], [2049, 160], [240, 2049], [240.5, 160], ['240', 160], [null, 160]]) refused(paintDuel(DUEL, 'synthwave-v1', w, h), /^width and height must be whole numbers from 64 to 2048$/);
  for (const t of ['', 'synthwave', 'toString', '__proto__', null, 5]) refused(paintDuel(DUEL, t, 240, 160), /^unknown theme$/);
  refused(paintDuel({ ...DUEL, decided: 99 }, 'synthwave-v1', 240, 160), /^decided must be/);
  const px = draw(DUEL, 'lcd-v1', 480, 320), seen = new Set();
  for (let i = 0; i < px.length; i += 3) seen.add((px[i] << 16) | (px[i + 1] << 8) | px[i + 2]);
  assert.deepEqual([...seen].sort((a, b) => a - b), [0x0f1210, 0x4a5048, 0x9aa095, 0xd8dccf], 'the pocket screen is four shades');
  const circular = {}; circular.self = circular;
  for (const x of [null, undefined, 5n, Symbol('s'), circular, { left: circular }, { ...DUEL, cases: [circular] }, new Proxy({}, { get() { throw new Error('x'); } })]) {
    assert.doesNotThrow(() => paintDuel(x, 'synthwave-v1', 240, 160));
    assert.doesNotThrow(() => paintDuel(DUEL, x, 240, 160));
    assert.equal(paintDuel(x, 'synthwave-v1', 240, 160).ok, false);
  }
});

const fwant = {
  'synthwave-v1': 'f2f2df1e2bded37932b0dfad2349fa4e98f33257aec6db7937b8193b4cd8aa0f',
  'blockcraft-v1': 'a67ee8fb028e97ec6fa74cac01faa13c13eecaf0df60fabdbfbf8fe4bef92eea',
  'lcd-v1': '1eb9568d514c7522915a4c25af317f1fbfc6c7987a18e400fc99047fcb76f35a',
  'memphis-v1': 'f48c1206c2f235566f358831140b97efb25354a977a9ca19b66ec3f87e399667',
  'blueprint-v1': 'b529eba01c59e4bb8435639c96eb7be11de5e3433f5de907d381bec83bb1e787',
};
test('the read-back: one decided case in focus, ringed on the scoreboard, how each side did on it, and which ranked it better', () => {
  const kinds = [CASES.findIndex(([a, b]) => a > b), CASES.findIndex(([a, b]) => b > a), CASES.findIndex(([a, b]) => a === b)];
  assert.ok(kinds.every((k) => k >= 0), 'the batch holds a left case, a right case and a tie');
  const F = (focus, extra = {}) => ({ ...DUEL, decided: 48, ...extra, focus });
  assert.deepEqual(checkDuel(F({ at: 3 })).d.focus, { at: 3, truth: null, scores: null });
  assert.deepEqual(checkDuel(F({ at: 47, truth: 0, scores: [0, 1000000] })).d.focus, { at: 47, truth: 0, scores: [0, 1000000] });
  assert.equal(checkDuel(DUEL).d.focus, null, 'no focus: none');
  for (const f of [null, 5, [], 'case']) refused(checkDuel(F(f)), /^focus must be an object$/);
  for (const at of [-1, 48, 1.5, '3', null, undefined]) refused(checkDuel(F({ at })), /^focus must be on a decided case: at from 0 to decided - 1$/);
  refused(checkDuel(F({ at: 30 }, { decided: 30 })), /^focus must be on a decided case/);
  assert.equal(checkDuel(F({ at: 29 }, { decided: 30 })).ok, true, 'the last decided case');
  refused(checkDuel(F({ at: 0 }, { decided: 0 })), /^focus must be on a decided case/);
  for (const truth of [2, -1, '1', true]) refused(checkDuel(F({ at: 3, truth })), /^a case's truth is 0 or 1$/);
  for (const scores of [[1], [1, 2, 3], [-99000001, 5], [5, 99000001], 'x', [1.5, 2], [1, '2']]) refused(checkDuel(F({ at: 3, scores })), /^scores are \[left, right\], each a whole number of millionths from -99000000 to 99000000 \(the raw score of a mind\)$/);
  for (const scores of [[-99000000, 99000000], [-2750000, 0], [0, 1000001]]) assert.deepEqual(checkDuel(F({ at: 3, scores })).d.focus.scores, scores, 'a raw score: ' + scores);
  assert.equal(same(draw(F({ at: 3, scores: [0, 412000] })), draw(F({ at: 3, scores: [-1, 412000] }))), false, 'a score below 0 shows its sign');
  assert.equal(same(draw(F({ at: 3, scores: [2750000, 412000] })), draw(F({ at: 3, scores: [-2750000, 412000] }))), false, 'and keeps it');
  const base = draw(F({ at: kinds[0] }));
  assert.equal(same(base, draw(DUEL)), false, 'the read-back is on the picture');
  for (const ch of [{ at: kinds[1] }, { at: kinds[2] }, { at: kinds[0], truth: 1 }, { at: kinds[0], truth: 0 }, { at: kinds[0], scores: [831200, 412000] }]) assert.equal(same(base, draw(F(ch))), false, JSON.stringify(ch));
  assert.equal(same(draw(F({ at: kinds[0], truth: 1 })), draw(F({ at: kinds[0], truth: 0 }))), false, 'its truth');
  assert.equal(same(draw(F({ at: kinds[0], scores: [831200, 412000] })), draw(F({ at: kinds[0], scores: [831200, 412100] }))), false, 'the right score');
  assert.equal(same(draw(F({ at: kinds[0], scores: [831200, 412000] })), draw(F({ at: kinds[0], scores: [831300, 412000] }))), false, 'the left score');
  assert.equal(same(draw(F({ at: 3 }, { result: null, decided: 30 })), draw(F({ at: 3 }, { result: null, decided: 31 }))), false, 'it stays a replay: the scoreboard still fills');
  const px = draw(F({ at: 13 })), rgb = (x, y) => (px[(y * 240 + x) * 3] << 16) | (px[(y * 240 + x) * 3 + 1] << 8) | px[(y * 240 + x) * 3 + 2];
  const x = 25 + 13 * 4, y = 129;
  for (const [rx, ry] of [[x - 1, y - 2], [x + 3, y - 2], [x - 1, y + 12], [x - 2, y + 5], [x + 4, y + 5]]) assert.equal(rgb(rx, ry), 0xffffff, 'the ring round case 14 at ' + rx + ',' + ry);
  const second = draw(F({ at: 13 + 48 }, { cases: [...CASES, ...CASES], decided: 96 }));
  assert.equal((second[((129 - 6 + 12 - 2) * 240 + x - 1) * 3] << 16) | (second[((129 - 6 + 12 - 2) * 240 + x - 1) * 3 + 1] << 8) | second[((129 - 6 + 12 - 2) * 240 + x - 1) * 3 + 2], 0xffffff, 'a case on the second line is ringed there');
  const fpins = {};
  for (const t of THEME_IDS) fpins[t] = sha(Buffer.concat([F({ at: kinds[0], truth: 1, scores: [831200, 412000] }), F({ at: kinds[1] }, { result: null, decided: 30 }), F({ at: kinds[2], truth: 0 }, { result: 'refused' }), F({ at: 0, scores: [500000, 500000] }, { result: 'draw' }), F({ at: kinds[0], truth: 0, scores: [0, -2750000] }, { result: 'right' })].map((d) => Buffer.from(draw(d, t)))));
  assert.deepEqual(fpins, fwant, 'the read-back, pinned');
});

test('the arena keeps the kernel rules, building on the card engine and the UI kit only', () => {
  assert.deepEqual(violations(readFileSync(new URL('./arena.mjs', import.meta.url), 'utf8'), { imports: ['./kardart.mjs', './ui.mjs'] }), []);
});
