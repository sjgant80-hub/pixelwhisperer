// build.test.mjs - builds and combos: a build read once and refused with a reason when it is not one, the published lift rule (a
// name only on a build that beats its best part), the sigil grown from the recipe, every fact on the card, the job board, the size
// contract, and the pins that freeze them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { KINDS, ROLES, METHODS, SIZES, COMBO_WORDS, checkBuild, buildLift, buildSigil, comboName, paintBuild, checkJobs, paintJobs, checkSheet, paintSheet, checkBook, paintBook } from './build.mjs';
import { identicon } from './ui.mjs';
import { THEMES, creatureFront } from './kardart.mjs';
import { idOf } from './corpus.mjs';
import { violations } from './source-check.mjs';

const sha = (u8) => createHash('sha256').update(u8).digest('hex');
const same = (a, b) => Buffer.from(a).equals(Buffer.from(b));
const refused = (r, why) => { assert.equal(r.ok, false); assert.equal(typeof r.why, 'string'); if (why) assert.match(r.why, why); };
const THEME_IDS = Object.keys(THEMES);
const id = (s) => idOf('build-' + s);
const JOB = { set: 'hospital', title: 'The Waiting Room', bar: 600000 };
const KIT = { job: JOB, kind: 'kit', parts: [{ id: id('lead'), rarity: 'rare', role: 'lead', gate: 571000 }, { id: id('n1'), rarity: 'uncommon', role: 'node', gate: 552000 }, { id: id('n2'), rarity: 'epic', role: 'node', gate: 560500 }, { id: id('tool'), role: 'tool' }], gate: 612400, cases: 240, reruns: 7, combo: true, finder: 'a3f1d2c4b5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e9c07' };
const PARTY = { job: JOB, kind: 'party', parts: [1, 2, 3, 4, 5].map((n) => ({ id: id('m' + n), rarity: ['common', 'uncommon', 'rare', 'epic', 'legendary'][n - 1], role: 'member', gate: 560000 + n * 3000 })), gate: 570100, reruns: 2 };
const FUSION = { job: { set: 'bank', title: 'Credit Gate', bar: 780582 }, kind: 'fusion', parts: [{ id: id('p1'), rarity: 'rare', role: 'parent', gate: 770582 }, { id: id('p2'), role: 'parent', gate: 765000 }], gate: 762000, reruns: 1 };
const TRAIN = { job: { set: 'telco', bar: 828213 }, kind: 'training', parts: [{ id: id('teach'), rarity: 'legendary', role: 'teacher', gate: 818213 }, { id: id('data'), rarity: 'common', role: 'data' }], method: 'distil', student: { id: id('student'), rarity: 'uncommon', size: 'tiny' }, gate: 821000 };
const BARE = { job: JOB, kind: 'kit', parts: [{ id: id('alone'), rarity: 'epic', role: 'lead' }] };
const BUILDS = [{ ...KIT, reveal: true }, KIT, PARTY, FUSION, TRAIN, BARE];
const draw = (b, theme = 'synthwave-v1', w = 192, h = 280) => { const r = paintBuild(b, theme, w, h); assert.equal(r.ok, true, r.why); return r.px; };
const rgb = (px, x, y, w) => (px[(y * w + x) * 3] << 16) | (px[(y * w + x) * 3 + 1] << 8) | px[(y * w + x) * 3 + 2];
const colours = (px) => { const s = new Set(); for (let i = 0; i < px.length; i += 3) s.add((px[i] << 16) | (px[i + 1] << 8) | px[i + 2]); return [...s].sort((a, b) => a - b); };
const BOARD = { jobs: [{ set: 'shop', bar: 931634, cleared: true, builds: 3 }, { set: 'telco', bar: 828213, cleared: false, builds: 0 }, { set: 'adult', title: 'Employer', bar: 600000, cleared: true, builds: 1 }, { set: 'bank', title: 'Credit Gate', bar: 600000, cleared: false, builds: 0 }, { set: 'hospital', title: 'The Waiting Room', bar: 600000, cleared: true, builds: 12 }] };
const drawBoard = (b, theme = 'synthwave-v1', w = 240, h = 160) => { const r = paintJobs(b, theme, w, h); assert.equal(r.ok, true, r.why); return r.px; };
const PINS = {};

test('a build: read once, and anything that is not one refused with a reason', () => {
  assert.deepEqual(KINDS, ['kit', 'party', 'fusion', 'training']); assert.deepEqual(METHODS, ['distil', 'merge', 'tune']); assert.deepEqual(SIZES, ['tiny', 'small', 'base']);
  assert.deepEqual(ROLES, { kit: ['lead', 'node', 'tool', 'voice'], party: ['member'], fusion: ['parent'], training: ['data', 'teacher'] });
  assert.ok([KINDS, ROLES, METHODS, SIZES, ...Object.values(ROLES)].every(Object.isFrozen));
  const k = checkBuild(KIT);
  assert.equal(k.ok, true);
  assert.deepEqual(k.b, { job: { set: 'hospital', title: 'The Waiting Room', bar: 600000 }, kind: 'kit', parts: [{ id: id('lead'), ri: 2, gate: 571000, role: 'lead' }, { id: id('n1'), ri: 1, gate: 552000, role: 'node' }, { id: id('n2'), ri: 3, gate: 560500, role: 'node' }, { id: id('tool'), ri: null, gate: null, role: 'tool' }], gate: 612400, cases: 240, combo: true, finder: 'a3f1d2c4b5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e9c07', reruns: 7, method: null, student: null, reveal: false, best: 571000, lift: 41400, name: comboName(KIT).name });
  assert.equal(checkBuild(PARTY).b.name, null, 'a build that is not a combo carries no name');
  assert.deepEqual(checkBuild(TRAIN).b.student, { id: id('student'), ri: 1, size: 'tiny' });
  assert.equal(checkBuild({ ...TRAIN, student: { id: id('student'), size: 'base' } }).b.student.ri, null, 'a student not held here');
  assert.equal(checkBuild({ ...BARE, job: { set: 'shop', bar: 0 } }).b.job.title, '', 'a title is optional');
  for (const x of [null, 5, 'build', []]) refused(checkBuild(x), /^the build must be an object$/);
  for (const job of [null, 5, []]) refused(checkBuild({ ...BARE, job }), /^the job must be an object$/);
  for (const set of ['health', '', null]) refused(checkBuild({ ...BARE, job: { ...JOB, set } }), /^the job set must be one of telco, shop, bank, adult, hospital, credit, custom$/);
  for (const title of ['x'.repeat(25), 'Wait~Room', 5, null]) refused(checkBuild({ ...BARE, job: { ...JOB, title } }), /^the job title must be at most 24 characters/);
  assert.equal(checkBuild({ ...BARE, job: { ...JOB, title: 'x'.repeat(24) } }).ok, true);
  for (const bar of [-1, 1010001, 1.5, '6', null, undefined]) refused(checkBuild({ ...BARE, job: { ...JOB, bar } }), /^the job bar must be a whole number of millionths from 0 to 1010000$/);
  for (const bar of [0, 1010000]) assert.equal(checkBuild({ ...BARE, job: { ...JOB, bar } }).ok, true);
  for (const kind of ['deck', '', null]) refused(checkBuild({ ...BARE, kind }), /^kind must be kit, party, fusion or training$/);
  for (const parts of [[], 'x', null, Array.from({ length: 7 }, (_, n) => ({ id: id('x' + n), role: 'member' }))]) refused(checkBuild({ ...PARTY, parts }), /^parts must be an array of 1 to 6$/);
  assert.equal(checkBuild({ ...PARTY, parts: Array.from({ length: 6 }, (_, n) => ({ id: id('x' + n), role: 'member' })) }).ok, true, 'six parts');
  for (const p of [null, 5, []]) refused(checkBuild({ ...BARE, parts: [p] }), /^a part must be an object$/);
  for (const pid of ['nope', 5, id('x') + '0']) refused(checkBuild({ ...BARE, parts: [{ id: pid, role: 'lead' }] }), /^a part id must be 16 lowercase hex characters$/);
  for (const rarity of ['mythic', null, '']) refused(checkBuild({ ...BARE, parts: [{ id: id('x'), rarity, role: 'lead' }] }), /^a part rarity must be one of common, uncommon, rare, epic, legendary \(or none, for a card this device does not hold\)$/);
  for (const gate of [-1, 1000001, 1.5, '5', null]) refused(checkBuild({ ...BARE, parts: [{ id: id('x'), role: 'lead', gate }] }), /^a part gate must be a whole number of millionths from 0 to 1000000$/);
  for (const gate of [0, 1000000]) assert.equal(checkBuild({ ...BARE, parts: [{ id: id('x'), role: 'lead', gate }] }).ok, true);
  refused(checkBuild({ ...BARE, parts: [{ id: id('x'), role: 'member' }] }), /^a kit takes parts in the roles lead, node, tool, voice$/);
  refused(checkBuild({ ...PARTY, parts: [{ id: id('x'), role: 'lead' }, { id: id('y'), role: 'member' }] }), /^a party takes parts in the roles member$/);
  refused(checkBuild({ ...TRAIN, parts: [{ id: id('x'), role: 'parent' }] }), /^a training takes parts in the roles data, teacher$/);
  refused(checkBuild({ ...PARTY, parts: [{ id: id('x'), role: 'member' }, { id: id('x'), role: 'member' }] }), new RegExp('^a card is in a build once: ' + id('x') + '$'));
  for (const parts of [[{ id: id('x'), role: 'node' }], [{ id: id('x'), role: 'lead' }, { id: id('y'), role: 'lead' }]]) refused(checkBuild({ ...BARE, parts }), /^a kit has one lead$/);
  for (const parts of [[{ id: id('x'), role: 'parent' }], [1, 2, 3].map((n) => ({ id: id('p' + n), role: 'parent' }))]) refused(checkBuild({ ...FUSION, parts }), /^a fusion has two parents$/);
  refused(checkBuild({ ...PARTY, parts: [{ id: id('x'), role: 'member' }] }), /^a party has 2 to 6 members$/);
  assert.equal(checkBuild({ ...PARTY, parts: PARTY.parts.slice(0, 2) }).ok, true, 'a party of two');
  for (const gate of [-1, 1000001, 1.5, '5']) refused(checkBuild({ ...BARE, gate }), /^the build gate must be a whole number of millionths from 0 to 1000000$/);
  for (const reruns of [-1, 100000, 1.5, '1', null]) refused(checkBuild({ ...BARE, reruns }), /^reruns must be a whole number from 0 to 99999$/);
  assert.equal(checkBuild({ ...BARE, reruns: 99999 }).ok, true);
  for (const method of [undefined, 'boil', null]) refused(checkBuild({ ...TRAIN, method }), /^a training run names its method: distil, merge or tune$/);
  for (const student of [undefined, null, 5]) refused(checkBuild({ ...TRAIN, student }), /^the student must be an object$/);
  refused(checkBuild({ ...TRAIN, student: { ...TRAIN.student, id: 'nope' } }), /^the student id must be 16 lowercase hex characters$/);
  refused(checkBuild({ ...TRAIN, student: { ...TRAIN.student, rarity: 'mythic' } }), /^the student rarity must be one of/);
  for (const size of ['huge', '', undefined]) refused(checkBuild({ ...TRAIN, student: { ...TRAIN.student, size } }), /^the student size must be tiny, small or base$/);
  refused(checkBuild({ ...TRAIN, student: { ...TRAIN.student, id: id('teach') } }), /^the student is a new card, not one of its sources$/);
  refused(checkBuild({ ...TRAIN, student: { ...TRAIN.student, gate: 5 } }), /^the student gate is the build gate$/);
  for (const extra of [{ method: 'distil' }, { student: TRAIN.student }]) refused(checkBuild({ ...KIT, ...extra }), /^method and student describe a training run$/);
  for (const v of [1, 'yes', null]) { refused(checkBuild({ ...KIT, reveal: v }), /^combo and reveal must be true or false$/); refused(checkBuild({ ...KIT, combo: v }), /^combo and reveal must be true or false$/); }
  refused(checkBuild({ ...FUSION, combo: true }), /^only a build that beats its best part is a combo$/);
  refused(checkBuild({ ...KIT, gate: 571000 }), /^only a build that beats its best part is a combo$/, 'equal is not better');
  assert.equal(checkBuild({ ...KIT, name: 'TYPED' }).b.name, comboName(KIT).name, 'a name is never typed: one given is not read');
  for (const cases of [0, 1000000, 1.5, '240', -1]) refused(checkBuild({ ...KIT, cases }), /^cases is how many held-out cases it was measured on: a whole number from 1 to 999999$/);
  for (const cases of [1, 999999]) assert.equal(checkBuild({ ...KIT, cases }).b.cases, cases);
  refused(checkBuild({ ...BARE, cases: 240 }), /^cases count the cases a measured build was scored on$/);
  for (const finder of ['nope', 'A'.repeat(64), 'a'.repeat(63), 5]) refused(checkBuild({ ...KIT, finder }), /^the finder of a combo is its first prover's public key: 64 lowercase hex characters$/);
  refused(checkBuild({ ...PARTY, finder: 'a3f1d2c4b5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e9c07' }), /^the finder of a combo/, 'only a combo has a finder');
  assert.equal(checkBuild({ ...KIT, finder: undefined }).b.finder, null, 'a combo may not name its finder');
  assert.equal(checkBuild({ ...KIT, gate: 571001 }).ok, true, 'one millionth better is');
  refused(checkBuild({ ...KIT, gate: undefined, cases: undefined }), /^only a build that beats/, 'not measured, not a combo');
  refused(checkBuild({ ...KIT, parts: KIT.parts.map((p) => ({ ...p, gate: undefined })) }), /^only a build that beats/, 'nothing to beat, not a combo');
  refused(checkBuild({ ...BARE, reveal: true }), /^a reveal shows a combo$/);
  assert.equal(checkBuild({ ...KIT, combo: false, finder: undefined, reveal: false }).ok, true, 'a build that beats its parts need not be a combo yet');
  refused(checkBuild({ ...KIT, get parts() { throw new Error('toxic'); } }), /^the build could not be read$/);
});

test('the published lift: the build GATE minus the best GATE among its parts, and whether it clears the bar', () => {
  assert.deepEqual(buildLift(KIT), { ok: true, lift: 41400, best: 571000, gate: 612400, cleared: true });
  assert.deepEqual(buildLift(FUSION), { ok: true, lift: -8582, best: 770582, gate: 762000, cleared: false });
  assert.deepEqual(buildLift(TRAIN), { ok: true, lift: 2787, best: 818213, gate: 821000, cleared: false }, 'a student against its best source');
  assert.deepEqual(buildLift(BARE), { ok: true, lift: null, best: null, gate: null, cleared: null }, 'not measured');
  assert.deepEqual(buildLift({ ...BARE, gate: 600000 }), { ok: true, lift: null, best: null, gate: 600000, cleared: true }, 'measured, nothing to beat, at the bar');
  assert.equal(buildLift({ ...BARE, gate: 599999 }).cleared, false);
  assert.equal(buildLift({ ...KIT, combo: false, finder: undefined, gate: 571000 }).lift, 0);
  refused(buildLift(null), /^the build must be an object$/);
});

test('the sigil: a rune grown from the recipe, the same pattern in all eight eighths, edged where it meets the empty', () => {
  const S = buildSigil(KIT);
  assert.equal(S.ok, true); assert.equal(S.cells.length, 256); assert.equal(S.colors.length, 3);
  assert.deepEqual(buildSigil(KIT), S, 'deterministic');
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const v = S.cells[y * 16 + x];
    assert.ok(v <= 3);
    assert.equal(S.cells[y * 16 + 15 - x], v, 'mirrored across'); assert.equal(S.cells[(15 - y) * 16 + x], v, 'mirrored down'); assert.equal(S.cells[x * 16 + y], v, 'mirrored on the diagonal');
    if (v === 3) assert.ok([[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].some(([u, w]) => u >= 0 && w >= 0 && u < 16 && w < 16 && [1, 2].includes(S.cells[w * 16 + u])), 'an edge touches the rune at ' + x + ',' + y);
    if (v === 0) assert.ok(![[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].some(([u, w]) => u >= 0 && w >= 0 && u < 16 && w < 16 && [1, 2].includes(S.cells[w * 16 + u])), 'every cell beside the rune is edged, at ' + x + ',' + y);
  }
  assert.notEqual(S.colors[0], S.colors[1], 'two colours');
  const seen = new Set();
  for (let n = 0; n < 200; n++) seen.add(Buffer.from(buildSigil({ ...BARE, parts: [{ id: idOf('sigil-' + n), role: 'lead' }] }).cells).toString('hex'));
  assert.ok(seen.size >= 199, 'two hundred recipes, two hundred runes: ' + seen.size);
  const accents = new Set(), inks = new Set();
  for (let n = 0; n < 64; n++) { const s = buildSigil({ ...BARE, parts: [{ id: idOf('hue-' + n), role: 'lead' }] }); inks.add(s.colors[0]); accents.add(s.colors[1]); assert.notEqual(s.colors[0], s.colors[1]); }
  assert.ok(inks.size >= 7 && accents.size >= 7, 'the colours vary: ' + inks.size + ' ' + accents.size);
  const base = Buffer.from(S.cells).toString('hex');
  for (const b of [{ ...KIT, kind: 'kit', parts: [KIT.parts[0], KIT.parts[2], KIT.parts[1], KIT.parts[3]] }, { ...KIT, parts: [KIT.parts[0], KIT.parts[1], KIT.parts[2], { ...KIT.parts[3], role: 'voice' }] }, { ...KIT, parts: [KIT.parts[0], KIT.parts[1], KIT.parts[2], { ...KIT.parts[3], id: id('other') }] }]) assert.notEqual(Buffer.from(buildSigil(b).cells).toString('hex'), base, 'the order, a role, an id');
  assert.equal(Buffer.from(buildSigil({ ...KIT, gate: 700000, reruns: 9, combo: false, finder: undefined }).cells).toString('hex'), base, 'the sigil is the recipe, not its results');
  const names = new Set();
  for (let n = 0; n < 200; n++) { const nm = comboName({ ...BARE, parts: [{ id: idOf('name-' + n), role: 'lead' }] }).name, [w1, w2] = nm.split(' '); assert.ok(COMBO_WORDS.first.includes(w1) && COMBO_WORDS.second.includes(w2), nm); names.add(nm); }
  assert.ok(names.size >= 150, 'two hundred recipes, many names: ' + names.size);
  assert.equal(comboName(KIT).name, comboName({ ...KIT, gate: 700000, combo: false, finder: undefined }).name, 'the name is the recipe, not its results');
  assert.notEqual(comboName(KIT).name, comboName({ ...KIT, parts: [KIT.parts[0], KIT.parts[2], KIT.parts[1], KIT.parts[3]] }).name, 'the order of its parts');
  assert.deepEqual([COMBO_WORDS.first.length, COMBO_WORDS.second.length], [32, 32]); assert.ok(Object.isFrozen(COMBO_WORDS) && Object.isFrozen(COMBO_WORDS.first) && Object.isFrozen(COMBO_WORDS.second));
  for (const w of [...COMBO_WORDS.first, ...COMBO_WORDS.second]) { assert.match(w, /^[A-Z]{3,8}$/); assert.equal(/EARN|SELL|BUY|WORTH|PRICE|ALIVE|LIVING|KCC|AIRDROP/.test(w), false, w + ' passes the word gate'); }
  assert.equal(new Set([...COMBO_WORDS.first, ...COMBO_WORDS.second]).size, 64, 'no word twice');
  refused(comboName(null), /^the build must be an object$/);
  assert.deepEqual(buildSigil({ ...KIT, parts: KIT.parts.map((p) => ({ ...p, rarity: undefined })) }), S, 'nor whether its cards are held');
  refused(buildSigil(null), /^the build must be an object$/);
});

test('the build card: every fact of a build on it, and the same build always the same bytes', async () => {
  for (const t of THEME_IDS) {
    const h = createHash('sha256');
    for (const b of BUILDS) { const px = draw(b, t); assert.equal(px.length, 192 * 280 * 3); assert.equal(same(px, draw(b, t)), true); h.update(px); }
    PINS[t] = h.digest('hex');
    assert.equal(new Set(BUILDS.map((b) => sha(draw(b, t)))).size, BUILDS.length, t + ': every build its own card');
  }
  const base = draw(KIT);
  for (const ch of [{ job: { ...JOB, set: 'adult' } }, { job: { ...JOB, title: 'Pharmacy' } }, { job: { ...JOB, title: '' } }, { job: { ...JOB, bar: 612400 } }, { gate: 612500 }, { reruns: 8 }, { reruns: 1 }, { cases: 241 }, { cases: undefined }, { combo: false, finder: undefined }, { finder: undefined }, { finder: 'b' + KIT.finder.slice(1) }, { reveal: true },
    { parts: [{ ...KIT.parts[0], rarity: 'epic' }, ...KIT.parts.slice(1)] }, { parts: [{ ...KIT.parts[0], gate: 571100 }, ...KIT.parts.slice(1)] }, { parts: [...KIT.parts.slice(0, 3), { ...KIT.parts[3], rarity: 'common' }] }, { parts: KIT.parts.slice(0, 3) }]) assert.equal(same(base, draw({ ...KIT, ...ch })), false, JSON.stringify(ch).slice(0, 70));
  const train = draw(TRAIN);
  for (const ch of [{ method: 'merge' }, { student: { ...TRAIN.student, size: 'base' } }, { student: { ...TRAIN.student, rarity: undefined } }, { student: { ...TRAIN.student, id: id('other-student') } }]) assert.equal(same(train, draw({ ...TRAIN, ...ch })), false, JSON.stringify(ch));
  const plain = { ...KIT, combo: false, finder: undefined };
  assert.equal(same(draw({ ...plain, gate: 571000 }), draw({ ...plain, gate: 571001 })), false, 'a lift of 0 is not one above it');
  assert.equal(same(draw({ ...plain, gate: 571000 }), draw({ ...plain, gate: 570999 })), false, 'nor one below it');
  assert.equal(same(draw({ ...BARE, gate: 600000 }), draw({ ...BARE, gate: 599999 })), false, 'clearing the bar shows');
  const rows = (px, a, b) => px.subarray(a * 192 * 3, b * 192 * 3), mask = (px, a, b) => { const p = rgb(px, 9, 173, 192); return Array.from({ length: (b - a) * 192 }, (_, n) => rgb(px, n % 192, a + Math.floor(n / 192), 192) !== p); };
  assert.equal(same(rows(draw({ ...BARE, gate: 600000 }), 207, 216), rows(draw({ ...BARE, gate: 605000 }), 207, 216)), true, 'a GATE exactly at the bar clears it');
  assert.equal(same(rows(draw({ ...BARE, gate: 600000 }), 207, 216), rows(draw({ ...BARE, gate: 595000 }), 207, 216)), false, 'and one under it is short');
  const [at0, up, down] = [571000, 571001, 570999].map((gate) => draw({ ...plain, gate }));
  assert.deepEqual(mask(at0, 177, 194), mask(up, 177, 194), 'a lift of exactly 0 is written +0.0000'); assert.notDeepEqual(mask(at0, 177, 194), mask(down, 177, 194), 'and a lift below it with a minus');
  assert.notDeepEqual(colours(rows(at0, 177, 194)), colours(rows(down, 177, 194)), 'a lift of 0 is not inked as a loss'); assert.notDeepEqual(colours(rows(at0, 177, 194)), colours(rows(up, 177, 194)), 'nor as a gain');
  assert.equal(same(rows(at0, 252, 270), rows(up, 252, 270)), true, 'a lift of 0 is no anti-combo'); assert.equal(same(rows(at0, 252, 270), rows(down, 252, 270)), false, 'a lift below it is');
  const px = draw(KIT), fr = creatureFront(id('lead')), q = [...Array(126).keys()].find((n) => fr.px[n * 4 + 3]);
  const gap = 44, cx = 8 + Math.floor(gap / 2), x0 = cx - Math.floor(27 / 2), y0 = 152 - 42;
  assert.equal(rgb(px, x0 + (q % 9) * 3, y0 + Math.floor(q / 9) * 3, 192), (fr.px[q * 4] << 16) | (fr.px[q * 4 + 1] << 8) | fr.px[q * 4 + 2], 'the lead stands first, 3 px a voxel');
  const S = buildSigil(KIT), sq = [...S.cells.keys()].find((n) => S.cells[n] === 1);
  assert.equal(rgb(px, 96 - 24 + (sq % 16) * 3 + 1, 66 - 24 + Math.floor(sq / 16) * 3 + 1, 192), S.colors[0], 'the sigil in its medallion, 3 px a cell');
  assert.equal(rgb(px, 0, 0, 192), 0xffd23c, 'a combo is framed in gold'); assert.notEqual(rgb(draw(PARTY), 0, 0, 192), 0xffd23c);
  assert.equal(rgb(px, 8, 256, 192), 0xffd23c, 'its name on a gold ribbon');
  const f = (await import('./ui.mjs')).identicon(KIT.finder, 1); assert.equal(rgb(px, 11 + 4, 256 + 4, 192), (f.px[44 * 3] << 16) | (f.px[44 * 3 + 1] << 8) | f.px[44 * 3 + 2], 'its finder\'s face on the ribbon');
  assert.equal(rgb(draw(FUSION), 8, 256, 192), 0x7a1020, 'an anti-combo on a red one'); assert.notEqual(rgb(draw(PARTY.parts ? { ...PARTY, gate: 600000 } : PARTY), 8, 256, 192), 0x7a1020, 'a lift above zero, unnamed: no ribbon');
  for (const b of BUILDS) assert.deepEqual(colours(draw(b, 'lcd-v1')).filter((c) => ![0x0f1210, 0x4a5048, 0x9aa095, 0xd8dccf].includes(c)), [], 'the pocket screen is four shades');
});

test('sizes: the card scaled to the nearest pixel, 64 to 1024 each way; the painters never throw', () => {
  const one = draw(KIT, 'blockcraft-v1'), two = draw(KIT, 'blockcraft-v1', 384, 560);
  for (let y = 0; y < 560; y += 3) for (let x = 0; x < 384; x += 3) assert.equal(rgb(two, x, y, 384), rgb(one, x >> 1, y >> 1, 192));
  const h = createHash('sha256');
  for (const [w, hh] of [[64, 64], [1024, 1024], [100, 333]]) h.update(draw(TRAIN, 'memphis-v1', w, hh));
  PINS.sizes = h.digest('hex');
  for (const [w, hh] of [[63, 280], [192, 63], [1025, 280], [192, 1025], [192.5, 280], ['192', 280], [null, 280]]) refused(paintBuild(KIT, 'synthwave-v1', w, hh), /^width and height must be whole numbers from 64 to 1024$/);
  for (const t of ['', 'synthwave', 'toString', null]) { refused(paintBuild(KIT, t, 192, 280), /^unknown theme$/); refused(paintJobs(BOARD, t, 240, 160), /^unknown theme$/); }
  refused(paintBuild({ ...KIT, kind: 'deck' }, 'synthwave-v1', 192, 280), /^kind must be/);
  const circular = {}; circular.self = circular;
  for (const x of [null, undefined, 5n, Symbol('s'), circular, { ...KIT, parts: [circular] }, { ...KIT, job: circular }, new Proxy({}, { get() { throw new Error('x'); } })]) {
    for (const fn of [paintBuild, paintJobs]) { assert.doesNotThrow(() => fn(x, 'synthwave-v1', 192, 280)); assert.equal(fn(x, 'synthwave-v1', 192, 280).ok, false); }
    for (const fn of [checkBuild, buildLift, buildSigil, checkJobs]) assert.doesNotThrow(() => fn(x));
  }
});

test('the job board: each job a note pinned up, its business, its name, its bar, how many builds cleared it', () => {
  assert.deepEqual(checkJobs(BOARD).jobs[4], { set: 'hospital', title: 'The Waiting Room', bar: 600000, cleared: true, builds: 12 });
  assert.equal(checkJobs(BOARD).jobs[0].title, '');
  for (const x of [null, 5, [], {}, { jobs: [] }, { jobs: 'x' }, { jobs: Array(10).fill(BOARD.jobs[0]) }]) refused(checkJobs(x), /^the board holds 1 to 9 jobs: \{ jobs: \[\.\.\.\] \}$/);
  assert.equal(checkJobs({ jobs: Array(9).fill(BOARD.jobs[1]) }).ok, true, 'nine jobs');
  for (const j of [null, 5]) refused(checkJobs({ jobs: [j] }), /^every job must be an object$/);
  refused(checkJobs({ jobs: [{ ...BOARD.jobs[0], set: 'x' }] }), /^the job set must be/);
  refused(checkJobs({ jobs: [{ ...BOARD.jobs[0], bar: -1 }] }), /^the job bar must be/);
  refused(checkJobs({ jobs: [{ ...BOARD.jobs[0], title: 'x'.repeat(25) }] }), /^the job title must be/);
  for (const cleared of [1, 'yes', null]) refused(checkJobs({ jobs: [{ ...BOARD.jobs[0], cleared }] }), /^a job cleared is true or false$/);
  for (const builds of [-1, 100000, 1.5, '3']) refused(checkJobs({ jobs: [{ ...BOARD.jobs[0], builds }] }), /^a job builds is a whole number from 0 to 99999$/);
  for (const j of [{ cleared: true, builds: 0 }, { cleared: false, builds: 1 }]) refused(checkJobs({ jobs: [{ ...BOARD.jobs[0], ...j }] }), /^a job is cleared exactly when a build has cleared it$/);
  refused(checkJobs({ get jobs() { throw new Error('x'); } }), /^the board could not be read$/);
  for (const t of THEME_IDS) PINS['jobs ' + t] = sha(drawBoard(BOARD, t));
  const base = drawBoard(BOARD);
  for (const ch of [{ set: 'credit' }, { title: 'Shopfront' }, { bar: 931734 }, { cleared: false, builds: 0 }, { builds: 4 }]) assert.equal(same(base, drawBoard({ jobs: [{ ...BOARD.jobs[0], ...ch }, ...BOARD.jobs.slice(1)] })), false, JSON.stringify(ch));
  assert.equal(same(drawBoard({ jobs: BOARD.jobs.slice(0, 4) }), base), false, 'every job is on the board');
  assert.equal(same(drawBoard({ jobs: [{ ...BOARD.jobs[2], builds: 1 }] }), drawBoard({ jobs: [{ ...BOARD.jobs[2], builds: 2 }] })), false, 'one build, or two');
  assert.equal(same(drawBoard({ jobs: [{ ...BOARD.jobs[1], title: 'EIGHTCHR' }] }), drawBoard({ jobs: [{ ...BOARD.jobs[1], title: 'EIGHTCHS' }] })), false, 'eight letters show whole');
  assert.ok(same(drawBoard({ jobs: [{ ...BOARD.jobs[1], title: 'NINE LETTERS' }] }), drawBoard({ jobs: [{ ...BOARD.jobs[1], title: 'NINE LETTXXX' }] })), 'past eight, seven and an ellipsis');
  for (const [w, h, k] of [[240, 160, 1], [480, 320, 2], [720, 480, 3], [64, 64, 1], [2048, 160, 1]]) assert.equal(paintJobs(BOARD, 'synthwave-v1', w, h).scale, k);
  const one = drawBoard(BOARD), two = drawBoard(BOARD, 'synthwave-v1', 480, 320), wide = drawBoard(BOARD, 'synthwave-v1', 260, 170), narrow = drawBoard(BOARD, 'synthwave-v1', 200, 160);
  for (let y = 0; y < 160; y += 2) for (let x = 0; x < 240; x += 2) { assert.equal(rgb(two, 2 * x, 2 * y, 480), rgb(one, x, y, 240)); assert.equal(rgb(wide, x + 10, y + 5, 260), rgb(one, x, y, 240)); if (x >= 20 && x < 220) assert.equal(rgb(narrow, x - 20, y, 200), rgb(one, x, y, 240)); }
  assert.notEqual(rgb(wide, 9, 50, 260), rgb(wide, 10, 50, 260), 'the board\'s outline against the wall');
  assert.equal(rgb(wide, 9, 50, 260), rgb(one, 1, 1, 240), 'beyond the board, the wall in its wood');
  assert.equal(rgb(wide, 250, 50, 260), rgb(one, 1, 1, 240)); assert.equal(rgb(wide, 100, 4, 260), rgb(one, 1, 1, 240)); assert.equal(rgb(wide, 100, 165, 260), rgb(one, 1, 1, 240));
  for (const [w, hh] of [[63, 160], [240, 2049], [240.5, 160], ['240', 160]]) refused(paintJobs(BOARD, 'synthwave-v1', w, hh), /^width and height must be whole numbers from 64 to 2048$/);
  assert.deepEqual(colours(drawBoard(BOARD, 'lcd-v1')), [0x0f1210, 0x4a5048, 0x9aa095, 0xd8dccf], 'the pocket screen is four shades');
  for (const c of colours(drawBoard(BOARD, 'blueprint-v1'))) assert.ok([0x0e3b78, 0x3468b0, 0x9cc3f0, 0xeef5ff].includes(c), 'blueprint inks ' + c.toString(16));
});

// the build sheet: receipts and proofs shaped as the game's measure() and proofOf() make them, read as they are
const KEY = [1, 2, 3, 4].map((n) => sha('key-' + n)), X = ' \u00d7 ';
const P = (s, title, alone, contribution) => ({ card: id(s), head: sha('head-' + s), title, domains: 'hospital', gate: alone === null ? null : alone + 4000, joined: alone !== null, why: alone === null ? 'a better-proven part fields hospital' : null, alone, contribution });
const COMBO_SHEET = { job: JOB, receipt: { kind: 'build', build: sha('build-combo'), data: 'hospital:ground-1', parts: [P('sc', 'Night Nurse', null, null), P('sb', 'Ward Watch', 560500, 9000), P('sa', 'Triage Sentinel', 571000, 21000)], fielded: 2, gate: 612400, best: 571000, lift: 41400, n: 240, verdict: 'combo', name: 'Triage Sentinel' + X + 'Ward Watch' }, proof: { ok: true, verdict: 'combo', proven: true, keys: KEY.slice(0, 3), finder: KEY[0], refused: [] }, held: [id('sa'), id('sc')] };
const ANTI_SHEET = { job: { set: 'bank', title: 'Credit Gate', bar: 780582 }, receipt: { kind: 'build', build: sha('build-anti'), data: 'bank:ground-2', parts: [P('aa', 'Census Scout', 770582, -2000), P('ab', 'Credit Oracle', 765000, -8000)], fielded: 2, gate: 762000, best: 770582, lift: -8582, n: 180, verdict: 'anti', name: 'Census Scout' + X + 'Credit Oracle' }, proof: { proven: false, keys: [KEY[3]], finder: KEY[3] } };
const PLAIN_SHEET = { job: { set: 'telco', bar: 828213 }, receipt: { kind: 'build', build: sha('build-plain'), data: 'telco', parts: [P('pa', 'Roaming Prophet', 818213, 0), P('pb', 'Plan Whisperer', null, null)], fielded: 1, gate: 818213, best: 818213, lift: 0, n: 1, verdict: 'plain', name: 'Roaming Prophet' } };
const FULL_TITLES = ['A', "O'Hara & Sons Retail", 'Vault Keeper', 'Late Payer Radar', 'Abcdefghijklmnopqrstuvwx', 'Churn Hunter'];
const FULL_SHEET = { job: { set: 'adult', title: 'Employer', bar: 600000 }, receipt: { kind: 'build', build: sha('build-full'), data: 'adult:ground-4', parts: FULL_TITLES.map((t, i) => P('f' + i, t, i < 5 ? 590000 - i * 2000 : null, i < 5 ? [1000000, 1500, 0, -1500, -1000000][i] : null)), fielded: 5, gate: 593000, best: 590000, lift: 3000, n: 999999, verdict: 'plain', name: FULL_TITLES.slice(0, 5).join(X) }, proof: { proven: true, keys: KEY.slice(0, 2), finder: KEY[0] }, held: FULL_TITLES.map((t, i) => id('f' + i)) };
const SHEETS = [COMBO_SHEET, ANTI_SHEET, PLAIN_SHEET, FULL_SHEET];
const ink = (s, t = 'synthwave-v1', w = 400, h = 210) => { const r = paintSheet(s, t, w, h); assert.equal(r.ok, true, r.why); return r.px; };
const withReceipt = (s, patch) => ({ ...s, receipt: { ...s.receipt, ...patch } });
const whyOf = (x) => checkSheet(x).why;
const region = (px, x0, y0, x1, y1) => { const out = []; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) out.push(rgb(px, x, y, 400)); return out; };
const cset = (cs) => [...new Set(cs)].sort((a, b) => a - b);
const vox = (fr, q) => (fr.px[q * 4] << 16) | (fr.px[q * 4 + 1] << 8) | fr.px[q * 4 + 2];
const solid = (fr) => [...Array(126).keys()].find((n) => fr.px[n * 4 + 3]);

test('a build sheet: the game\'s own receipt and proof, read as they are, and refused with a reason when the numbers do not add up', () => {
  const c = checkSheet(COMBO_SHEET);
  assert.equal(c.ok, true, c.why);
  assert.deepEqual(c.s, { job: JOB, build: sha('build-combo'), rows: [
    { card: id('sa'), title: 'Triage Sentinel', joined: true, alone: 571000, contribution: 21000, held: true },
    { card: id('sb'), title: 'Ward Watch', joined: true, alone: 560500, contribution: 9000, held: false },
    { card: id('sc'), title: 'Night Nurse', joined: false, alone: null, contribution: null, held: true }],
  fielded: 2, gate: 612400, best: 571000, lift: 41400, n: 240, verdict: 'combo', proof: { proven: true, keys: 3, finder: KEY[0] } });
  const plain = { job: JOB, receipt: { ...COMBO_SHEET.receipt, parts: COMBO_SHEET.receipt.parts.map(({ card, title, joined, alone, contribution }) => ({ card, title, joined, alone, contribution })) } };
  delete plain.receipt.kind;
  assert.deepEqual(checkSheet(plain).s.rows.map((r) => r.held), [null, null, null], 'what it does not draw is left unread; no held list, no marks');
  assert.equal(checkSheet(plain).s.proof, null);
  for (const s of [ANTI_SHEET, PLAIN_SHEET, FULL_SHEET]) assert.equal(checkSheet(s).ok, true, whyOf(s));
  assert.deepEqual(checkSheet(withReceipt(COMBO_SHEET, { name: 'Ward Watch' + X + 'Triage Sentinel' })).s.rows.map((r) => r.title), ['Ward Watch', 'Triage Sentinel', 'Night Nurse'], 'the rows field in the name\'s order');
  assert.equal(checkSheet(withReceipt(COMBO_SHEET, { data: 'hospital' })).ok, true, 'a ground named for its business alone');
  const twin = withReceipt(ANTI_SHEET, { parts: [P('aa', 'Twin', 770582, -2000), P('ab', 'Twin', 765000, -8000)], name: 'Twin' + X + 'Twin' });
  assert.deepEqual(checkSheet(twin).s.rows.map((r) => r.card), [id('aa'), id('ab')], 'two parts of one title');

  const R = (patch) => whyOf(withReceipt(COMBO_SHEET, patch)), two = COMBO_SHEET.receipt.parts.slice(1), bench = COMBO_SHEET.receipt.parts[0];
  for (const x of [null, [], 5]) assert.equal(whyOf(x), 'the sheet must be an object');
  assert.match(whyOf({ ...COMBO_SHEET, job: { set: 'x', bar: 1 } }), /^the job set must be/);
  for (const receipt of [null, 5, []]) assert.equal(whyOf({ ...COMBO_SHEET, receipt }), 'the receipt must be an object');
  for (const build of ['x', sha('a').toUpperCase(), sha('a') + '0', 5]) assert.equal(R({ build }), 'the receipt build is the build id: 64 lowercase hex characters');
  for (const data of ['bank:ground-1', 'hospitalx', 7, ':hospital']) assert.equal(R({ data }), 'the receipt is for another business than the job: its data must name hospital');
  for (const parts of ['x', [two[1]], FULL_TITLES.concat('Seventh').map((t, i) => P('n' + i, t, null, null))]) assert.equal(R({ parts }), 'a receipt has 2 to 6 parts');
  for (const p of [5, null, { ...two[0], card: 'X'.repeat(16) }, { ...two[0], card: id('x').slice(1) }]) assert.equal(R({ parts: [p, two[1]] }), 'every part is a card: 16 lowercase hex characters');
  assert.equal(R({ parts: [two[1], two[1]] }), 'the same card is in the build twice');
  for (const title of ['', 'x'.repeat(25), 'Bad!', 5, 'Triage\u00d7']) assert.equal(R({ parts: [{ ...two[0], title }, two[1]] }), 'a part title is 1 to 24 characters from A-Z a-z 0-9 space & . - and the apostrophe', String(title));
  for (const joined of ['yes', 1, undefined]) assert.equal(R({ parts: [{ ...two[0], joined }, two[1]] }), 'a part joined is true or false');
  const NUMS = 'a part that fields has its alone GATE and its contribution in whole millionths; a benched one has null for both';
  for (const ch of [{ alone: null }, { alone: 1000001 }, { alone: -1 }, { contribution: null }, { contribution: 1000001 }, { contribution: -1000001 }, { contribution: 0.5 }, { contribution: '1' }]) assert.equal(R({ parts: [{ ...two[0], ...ch }, two[1]] }), NUMS, JSON.stringify(ch));
  for (const ch of [{ alone: 5 }, { contribution: 0 }, { alone: undefined }]) assert.equal(R({ parts: [{ ...bench, ...ch }, ...two] }), NUMS, JSON.stringify(ch));
  for (const fielded of [3, 1, '2']) assert.equal(R({ fielded }), 'fielded counts the parts that field, at least one');
  assert.equal(R({ parts: [bench, { ...bench, card: id('sd') }], fielded: 0 }), 'fielded counts the parts that field, at least one');
  for (const ch of [{ gate: -1 }, { gate: 1000001 }, { gate: '612400' }, { best: 1000001 }, { best: null }]) assert.equal(R(ch), 'the receipt gate and best are whole millionths from 0 to 1000000', JSON.stringify(ch));
  assert.equal(checkSheet(withReceipt(COMBO_SHEET, { gate: 1000000, lift: 429000 })).ok, true, 'a perfect GATE');
  assert.equal(R({ best: 560500, lift: 51900 }), 'best is the highest alone GATE among the parts that field');
  assert.equal(R({ lift: 41401 }), 'lift is the gate less the best');
  for (const n of [0, 1000000, 2.5, '240', null]) assert.equal(R({ n }), 'n is how many held-out cases: a whole number from 1 to 999999');
  for (const verdict of ['great', null, 'Combo']) assert.equal(R({ verdict }), 'the verdict is combo, anti or plain');
  assert.equal(R({ gate: 571000, lift: 0 }), 'a combo has two or more parts fielding and a lift above zero');
  assert.equal(checkSheet(withReceipt(COMBO_SHEET, { gate: 571001, lift: 1 })).ok, true, 'one millionth carries a combo');
  assert.equal(whyOf(withReceipt(PLAIN_SHEET, { gate: 818214, lift: 1, verdict: 'combo' })), 'a combo has two or more parts fielding and a lift above zero');
  assert.equal(checkSheet(withReceipt(PLAIN_SHEET, { gate: 818214, lift: 1 })).ok, true, 'one part fielding is plain');
  assert.equal(whyOf(withReceipt(PLAIN_SHEET, { gate: 818212, lift: -1, verdict: 'anti' })), 'an anti-combo has two or more parts fielding and a lift below zero');
  assert.equal(whyOf(withReceipt(ANTI_SHEET, { gate: 770582, lift: 0 })), 'an anti-combo has two or more parts fielding and a lift below zero');
  assert.equal(checkSheet(withReceipt(ANTI_SHEET, { gate: 770581, lift: -1 })).ok, true, 'one millionth carries an anti-combo');
  for (const name of ['Triage Sentinel', 'Triage Sentinel' + X + 'Ward Watch' + X + 'Night Nurse', 'Triage Sentinel' + X + 'Triage Sentinel', 'Triage Sentinel x Ward Watch', 5, undefined, ''])
    assert.equal(R({ name }), 'the name is the fielding parts\' titles, each once, joined by " \u00d7 "', String(name));

  const F = (proof) => whyOf({ ...COMBO_SHEET, proof });
  for (const proof of [5, null, { ...COMBO_SHEET.proof, proven: 'yes' }, { ...COMBO_SHEET.proof, keys: 'x' }, { proven: false, keys: Array(1000).fill(KEY[0]), finder: KEY[0] }]) assert.equal(F(proof), 'the proof is { proven, keys: [up to 999 public keys], finder }');
  const many = Array.from({ length: 999 }, (_, n) => sha('many-' + n));
  assert.equal(checkSheet({ ...COMBO_SHEET, proof: { proven: true, keys: many, finder: many[0] } }).s.proof.keys, 999, 'nine hundred and ninety-nine keys');
  for (const keys of [['x'], [KEY[0], KEY[0]], [KEY[0].toUpperCase()], [5]]) assert.equal(F({ proven: true, keys, finder: keys[0] }), 'the proof keys are public keys, 64 lowercase hex each, each once');
  for (const [keys, finder] of [[[KEY[0], KEY[1]], KEY[1]], [[], KEY[0]], [[KEY[0]], null], [[KEY[0]], undefined], [[], undefined]]) assert.equal(F({ proven: false, keys, finder }), 'the finder is the first key, or null before any');
  assert.equal(F({ proven: true, keys: [], finder: null }), 'a proof proven by no key is not one');
  assert.deepEqual(checkSheet({ ...COMBO_SHEET, proof: { proven: false, keys: [], finder: null } }).s.proof, { proven: false, keys: 0, finder: null }, 'a proof before any re-run');
  assert.equal(F({ ...COMBO_SHEET.proof, verdict: 'anti' }), 'the proof is of another verdict');
  for (const held of ['x', ['zz'], [5], Array(1000).fill(id('sa'))]) assert.equal(whyOf({ ...COMBO_SHEET, held }), 'held lists the card ids this device holds, up to 999');
  assert.equal(checkSheet({ ...COMBO_SHEET, held: Array(999).fill(id('sa')) }).ok, true, 'nine hundred and ninety-nine held');
  assert.equal(whyOf({ ...COMBO_SHEET, receipt: { get build() { throw new Error('x'); } } }), 'the sheet could not be read');
});

test('the build sheet: every number of its receipt on it, its parts in the order they field, the same sheet always the same bytes', () => {
  for (const t of THEME_IDS) {
    const h = createHash('sha256');
    for (const s of SHEETS) { const px = ink(s, t); assert.equal(px.length, 400 * 210 * 3); assert.equal(same(px, ink(s, t)), true); h.update(px); }
    PINS['sheet ' + t] = h.digest('hex');
    assert.equal(new Set(SHEETS.map((s) => sha(ink(s, t)))).size, SHEETS.length, t + ': every sheet its own');
  }
  const base = ink(COMBO_SHEET), parts = COMBO_SHEET.receipt.parts, pf = COMBO_SHEET.proof;
  for (const [label, s] of [
    ['job title', { ...COMBO_SHEET, job: { ...JOB, title: 'Pharmacy' } }], ['no job title', { ...COMBO_SHEET, job: { ...JOB, title: '' } }], ['bar', { ...COMBO_SHEET, job: { ...JOB, bar: 620000 } }],
    ['business', withReceipt({ ...COMBO_SHEET, job: { ...JOB, set: 'adult' } }, { data: 'adult:ground-1' })], ['build id', withReceipt(COMBO_SHEET, { build: sha('build-other') })], ['cases', withReceipt(COMBO_SHEET, { n: 241 })],
    ['a title', withReceipt(COMBO_SHEET, { parts: [parts[0], { ...parts[1], title: 'Ward Watcher' }, parts[2]], name: 'Triage Sentinel' + X + 'Ward Watcher' })],
    ['a benched title', withReceipt(COMBO_SHEET, { parts: [{ ...parts[0], title: 'Night Nurses' }, parts[1], parts[2]] })],
    ['a card', { ...withReceipt(COMBO_SHEET, { parts: [parts[0], { ...parts[1], card: id('sz') }, parts[2]] }), held: [id('sa'), id('sc')] }],
    ['an alone GATE', withReceipt(COMBO_SHEET, { parts: [parts[0], { ...parts[1], alone: 560600 }, parts[2]] })], ['a contribution', withReceipt(COMBO_SHEET, { parts: [parts[0], { ...parts[1], contribution: 9100 }, parts[2]] })],
    ['gate and lift', withReceipt(COMBO_SHEET, { gate: 612500, lift: 41500 })], ['the verdict', { ...withReceipt(COMBO_SHEET, { verdict: 'plain' }), proof: { ...pf, verdict: 'plain' } }],
    ['two keys', { ...COMBO_SHEET, proof: { ...pf, keys: KEY.slice(0, 2) } }], ['the finder', { ...COMBO_SHEET, proof: { ...pf, keys: [KEY[1], KEY[0], KEY[2]], finder: KEY[1] } }], ['not proven', { ...COMBO_SHEET, proof: { ...pf, proven: false } }],
    ['no proof', { ...COMBO_SHEET, proof: undefined }], ['all held', { ...COMBO_SHEET, held: [id('sa'), id('sb'), id('sc')] }], ['no held list', { ...COMBO_SHEET, held: undefined }],
  ]) assert.equal(same(base, ink(s)), false, label);
  const fa = creatureFront(id('sa')), qa = solid(fa), fb = creatureFront(id('sb')), qb = solid(fb), fc = creatureFront(id('sc')), qc = solid(fc);
  assert.equal(rgb(base, 20 + (qa % 9), 74 + Math.floor(qa / 9), 400), vox(fa, qa), 'the first to field heads the rows, a pixel a voxel');
  assert.equal(rgb(base, 20 + (qb % 9), 94 + Math.floor(qb / 9), 400), vox(fb, qb), 'the second next');
  assert.notEqual(rgb(base, 20 + (qc % 9), 114 + Math.floor(qc / 9), 400), vox(fc, qc), 'the benched one last, dimmed');
  const f = identicon(KEY[0], 1);
  assert.equal(rgb(base, 314, 185, 400), (f.px[44 * 3] << 16) | (f.px[44 * 3 + 1] << 8) | f.px[44 * 3 + 2], 'the finder\'s face');
  assert.equal(rgb(base, 0, 0, 400), 0xffd23c, 'a combo framed in gold'); assert.equal(rgb(ink(ANTI_SHEET), 0, 0, 400), 0xc0283c, 'an anti-combo in red'); assert.notEqual(rgb(ink(PLAIN_SHEET), 0, 0, 400), 0xffd23c);
  const panel = rgb(base, 293, 61, 400), bare = ink({ ...COMBO_SHEET, held: undefined });
  assert.deepEqual(cset(region(bare, 265, 63, 289, 73)), [panel], 'no held list, no HELD column'); assert.notDeepEqual(cset(region(base, 265, 63, 289, 73)), [panel]);
  assert.ok(same(ink(PLAIN_SHEET), ink({ ...PLAIN_SHEET, proof: { proven: false, keys: [], finder: null } })), 'a proof with no keys yet is no re-run yet');

  // the edges: a lift of exactly 0, a part that adds exactly 0, a GATE exactly at the bar
  const shape = (px, x0, y0, x1, y1) => region(px, x0, y0, x1, y1).map((c) => c !== panel);
  const [l0, l1, lm] = [[818213, 0], [818214, 1], [818212, -1]].map(([gate, lift]) => ink(withReceipt(PLAIN_SHEET, { gate, lift })));
  assert.deepEqual(shape(l0, 292, 72, 394, 92), shape(l1, 292, 72, 394, 92), 'a lift of 0 is written +0.0000'); assert.notDeepEqual(shape(l0, 292, 72, 394, 92), shape(lm, 292, 72, 394, 92), 'and one below it with a minus');
  assert.notDeepEqual(cset(region(l0, 292, 72, 394, 92)), cset(region(lm, 292, 72, 394, 92)), 'a lift of 0 is not inked as a loss'); assert.notDeepEqual(cset(region(l0, 292, 72, 394, 92)), cset(region(l1, 292, 72, 394, 92)), 'nor as a gain');
  const [c0, c1, cm] = [0, 1, -1].map((contribution) => ink(withReceipt(PLAIN_SHEET, { parts: [{ ...PLAIN_SHEET.receipt.parts[0], contribution }, PLAIN_SHEET.receipt.parts[1]] })));
  assert.deepEqual(shape(c0, 220, 77, 265, 87), shape(c1, 220, 77, 265, 87), 'adding 0 is written +0.0000'); assert.notDeepEqual(shape(c0, 220, 77, 265, 87), shape(cm, 220, 77, 265, 87));
  assert.notDeepEqual(cset(region(c0, 220, 77, 265, 87)), cset(region(cm, 220, 77, 265, 87)), 'adding 0 is not inked as a loss'); assert.notDeepEqual(cset(region(c0, 220, 77, 265, 87)), cset(region(c1, 220, 77, 265, 87)), 'nor as a gain');
  const [b0, b1, bp] = [818213, 818212, 818214].map((bar) => region(ink({ ...PLAIN_SHEET, job: { ...PLAIN_SHEET.job, bar } }), 292, 116, 394, 126));
  assert.deepEqual(b0, b1, 'a GATE exactly at the bar clears it'); assert.notDeepEqual(b0, bp, 'and one under it does not');

  const big = ink(COMBO_SHEET, 'synthwave-v1', 1200, 630), up = new Uint8Array(1200 * 630 * 3);
  for (let y = 0; y < 630; y++) for (let x = 0; x < 1200; x++) up.set(base.subarray(((Math.floor(y / 3)) * 400 + Math.floor(x / 3)) * 3, ((Math.floor(y / 3)) * 400 + Math.floor(x / 3)) * 3 + 3), (y * 1200 + x) * 3);
  assert.ok(same(big, up), 'the share picture: three pixels a pixel');
  const h = createHash('sha256');
  for (const [w, hh] of [[100, 100], [2400, 100], [100, 2400], [333, 777]]) h.update(ink(FULL_SHEET, 'memphis-v1', w, hh));
  PINS['sheet sizes'] = h.digest('hex');
  for (const [w, hh] of [[99, 210], [400, 99], [2401, 210], [400, 2401], [400.5, 210], ['400', 210], [null, 210]]) refused(paintSheet(COMBO_SHEET, 'synthwave-v1', w, hh), /^width and height must be whole numbers from 100 to 2400$/);
  for (const t of ['', 'synthwave', 'toString', null]) refused(paintSheet(COMBO_SHEET, t, 400, 210), /^unknown theme$/);
  refused(paintSheet(withReceipt(COMBO_SHEET, { lift: 1 }), 'synthwave-v1', 400, 210), /^lift is the gate less the best$/);
  const circular = {}; circular.self = circular;
  for (const x of [null, undefined, 5n, Symbol('s'), circular, { ...COMBO_SHEET, receipt: circular }, { ...COMBO_SHEET, proof: circular }, new Proxy({}, { get() { throw new Error('x'); } })]) {
    assert.doesNotThrow(() => paintSheet(x, 'synthwave-v1', 400, 210)); assert.equal(paintSheet(x, 'synthwave-v1', 400, 210).ok, false); assert.doesNotThrow(() => checkSheet(x));
  }
  for (const k of Object.keys(COMBO_SHEET.receipt)) for (const v of [null, undefined, 0, -1, 'x', [], {}, NaN, 1e9]) assert.doesNotThrow(() => paintSheet(withReceipt(COMBO_SHEET, { [k]: v }), 'synthwave-v1', 400, 210), k);
  for (const s of SHEETS) assert.deepEqual(colours(ink(s, 'lcd-v1')).filter((c) => ![0x0f1210, 0x4a5048, 0x9aa095, 0xd8dccf].includes(c)), [], 'the pocket screen is four shades');
});

// the build book: pages shaped as the game's bookOf() makes them, read as they are
const BR = (k, titles, best, lift, keys = 2) => ({ id: sha('receipt-' + k), build: sha('build-' + k), name: titles.join(X), gate: best + lift, best, lift, fielded: titles.length, finder: KEY[k % 4], keys });
const N24 = 'Abcdefghijklmnopqrstuvwx';
const FULL_BOOK = { job: { set: 'hospital', title: 'The Waiting Room', bar: 650000 }, page: {
  combos: [BR(1, ['Triage Sentinel', 'Ward Watch'], 571000, 41400, 3), BR(2, ['Census Scout', 'Credit Oracle', 'Vault Keeper'], 560000, 21000), BR(3, [N24, 'Abcdef'], 590000, 12000, 7), BR(4, ["O'Hara & Sons Retail", 'Late Payer Radar', 'A', 'Churn Hunter'], 580000, 9000),
    BR(5, ['Night Nurse', 'Churn Hunter'], 575000, 8000, 4), BR(6, ['Census Scout', 'Vault Keeper'], 570000, 6000), BR(7, ['A', 'Ward Watch'], 565000, 5500, 99999), BR(8, ['Credit Oracle', 'Night Nurse'], 560000, 5000, 1)],
  anti: [BR(9, ['Ward Watch', 'Census Scout'], 590000, -8582), BR(10, ['Vault Keeper', 'Triage Sentinel'], 585000, -5100, 3)], plain: 3, best: 612400 } };
const CLEARED_BOOK = { job: { set: 'bank', title: 'Credit Gate', bar: 600000 }, page: { combos: [BR(11, ['Triage Sentinel', 'Credit Oracle'], 590000, 22000, 5), BR(12, ['Census Scout', 'Ward Watch'], 585000, 7000)], anti: [BR(13, ['Night Nurse', 'Vault Keeper'], 600000, -6000)], plain: 0, best: 612000 } };
const PLAIN_BOOK = { job: { set: 'telco', bar: 828213 }, page: { combos: [], anti: [], plain: 2, best: 801000 } };
const EMPTY_BOOK = { job: { set: 'adult', title: 'Employer', bar: 600000 }, page: { combos: [], anti: [], plain: 0, best: null } };
const BOOKS = [FULL_BOOK, CLEARED_BOOK, PLAIN_BOOK, EMPTY_BOOK];
const leaf = (b, t = 'synthwave-v1', w = 400, h = 210) => { const r = paintBook(b, t, w, h); assert.equal(r.ok, true, r.why); return r.px; };
const withPage = (b, patch) => ({ ...b, page: { ...b.page, ...patch } });
const bookWhy = (x) => checkBook(x).why;
const lifted = (n, sign) => Array.from({ length: n }, (_, k) => ({ id: sha('many-r' + sign + k), build: sha('many-b' + sign + k), name: 'A' + X + 'B', gate: 500000 + sign * (n - k), best: 500000, lift: sign * (n - k), fielded: 2, finder: KEY[0], keys: 2 })).sort((a, b) => sign * (b.lift - a.lift));

test('a page of the build book: the game\'s own book read as it is, and refused with a reason when it does not add up', () => {
  const c = checkBook(CLEARED_BOOK);
  assert.equal(c.ok, true, c.why);
  const row = (r, combo) => ({ id: r.id, build: r.build, name: r.name, gate: r.gate, lift: r.lift, finder: r.finder, keys: r.keys, combo });
  assert.deepEqual(c.b, { job: { set: 'bank', title: 'Credit Gate', bar: 600000 }, combos: CLEARED_BOOK.page.combos.map((r) => row(r, true)), anti: CLEARED_BOOK.page.anti.map((r) => row(r, false)), plain: 0, best: 612000 });
  assert.deepEqual(checkBook(withPage(CLEARED_BOOK, { combos: CLEARED_BOOK.page.combos.map((r) => ({ ...r, note: 'unread' })) })).b, c.b, 'what it does not draw is left unread');
  for (const b of BOOKS) assert.equal(checkBook(b).ok, true, bookWhy(b));
  const P = (patch) => bookWhy(withPage(CLEARED_BOOK, patch)), r0 = CLEARED_BOOK.page.combos[0], r1 = CLEARED_BOOK.page.combos[1], a0 = CLEARED_BOOK.page.anti[0];
  const C = (ch) => P({ combos: [{ ...r0, ...ch }, r1] }), A = (ch) => P({ anti: [{ ...a0, ...ch }] });
  for (const x of [null, [], 5]) assert.equal(bookWhy(x), 'the book must be an object');
  assert.match(bookWhy({ ...CLEARED_BOOK, job: { set: 'x', bar: 1 } }), /^the job set must be/);
  const PAGE = 'a page of the book is { combos, anti, plain, best }, up to 9999 rows of each';
  for (const page of [null, 5, [], {}, { ...CLEARED_BOOK.page, combos: 'x' }, { ...CLEARED_BOOK.page, anti: 5 }, { ...CLEARED_BOOK.page, combos: Array(10000).fill(r0) }, { ...CLEARED_BOOK.page, anti: Array(10000).fill(a0) }]) assert.equal(bookWhy({ ...CLEARED_BOOK, page }), PAGE);
  assert.equal(checkBook({ ...CLEARED_BOOK, page: { combos: lifted(9999, 1), anti: lifted(9999, -1), plain: 0, best: 509999 } }).ok, true, '9999 of each');
  for (const plain of [-1, 100000, 1.5, '2', null]) assert.equal(P({ plain }), 'plain counts the proven builds that are plain: a whole number from 0 to 99999');
  assert.equal(checkBook(withPage(CLEARED_BOOK, { plain: 99999 })).ok, true);
  for (const ch of [{ id: 'x' }, { build: sha('b').toUpperCase() }, { id: undefined }]) assert.equal(C(ch), 'every row has its receipt id and its build id, 64 lowercase hex each', JSON.stringify(ch));
  assert.equal(P({ combos: [5, r1] }), 'every row has its receipt id and its build id, 64 lowercase hex each');
  const NAMED = 'a row is named by its 2 to 6 fielding parts, their titles joined by " \u00d7 "';
  for (const ch of [{ name: 'Triage Sentinel', fielded: 1 }, { fielded: 3 }, { fielded: '2' }, { name: 5 }, { name: 'A' + X + X + 'B', fielded: 3 }, { name: 'x'.repeat(25) + X + 'B' }, { name: 'Bad!' + X + 'B' }, { name: Array(7).fill('A').join(X), fielded: 7 }, { name: 'A x B' }])
    assert.equal(C(ch), NAMED, JSON.stringify(ch));
  for (const ch of [{ name: Array(6).fill('A').join(X), fielded: 6 }, { name: N24 + X + 'B' }, { name: 'A' + X + 'B' }]) assert.equal(checkBook(withPage(CLEARED_BOOK, { combos: [{ ...r0, ...ch }, r1] })).ok, true, JSON.stringify(ch));
  const NUMS = 'a row has its gate and best in whole millionths, and its lift is the gate less the best';
  for (const ch of [{ gate: -1, lift: -591001 }, { gate: 1000001, lift: 410001 }, { best: 1000001, lift: -388001 }, { best: '590000' }, { lift: 22001 }]) assert.equal(C(ch), NUMS, JSON.stringify(ch));
  assert.equal(C({ gate: 590000, lift: 0 }), 'a combo lifts its build above its best part'); assert.equal(checkBook(withPage(CLEARED_BOOK, { combos: [r0, { ...r1, gate: 585001, lift: 1 }] })).ok, true, 'one millionth up is a combo');
  assert.equal(A({ gate: 600000, lift: 0 }), 'an anti-combo drops its build below its best part'); assert.equal(checkBook(withPage(CLEARED_BOOK, { anti: [{ ...a0, gate: 599999, lift: -1 }] })).ok, true, 'one millionth down is an anti-combo');
  for (const ch of [{ finder: 'x' }, { finder: null }, { keys: 0 }, { keys: 100000 }, { keys: 1.5 }]) assert.equal(C(ch), 'a row has its finder (a public key) and how many keys proved it, 1 to 99999', JSON.stringify(ch));
  assert.equal(P({ combos: [r0, { ...r1, id: r0.id }] }), 'a receipt is in the book once');
  assert.equal(P({ anti: [{ ...a0, id: r0.id }] }), 'a receipt is in the book once');
  const RANK = 'the combos go biggest lift first, a tie to the lower build id', DROP = 'the anti-combos go biggest drop first, a tie to the lower build id';
  assert.equal(P({ combos: [r1, r0] }), RANK);
  const [lo, hi] = [sha('build-tie-1'), sha('build-tie-2')].sort(), tie = (build, k) => ({ ...r1, id: sha('tie-' + k), build });
  assert.equal(checkBook(withPage(CLEARED_BOOK, { combos: [r0, tie(lo, 1), tie(hi, 2)] })).ok, true, 'a tie, the lower build id first');
  assert.equal(P({ combos: [r0, tie(hi, 1), tie(lo, 2)] }), RANK); assert.equal(P({ combos: [r0, tie(lo, 1), tie(lo, 2)] }), RANK);
  const d0 = { ...a0, id: sha('d0'), build: lo }, d1 = { ...a0, id: sha('d1'), build: hi }, deeper = { ...a0, id: sha('d2'), gate: 590000, lift: -10000 };
  assert.equal(checkBook(withPage(CLEARED_BOOK, { anti: [deeper, d0, d1] })).ok, true, 'the biggest drop first, then a tie by build id');
  assert.equal(P({ anti: [d0, deeper] }), DROP); assert.equal(P({ anti: [d1, d0] }), DROP); assert.equal(P({ anti: [d0, { ...d0, id: sha('d3') }] }), DROP);
  const BEST = 'best is the best proven GATE on the page, at least every row\'s, or null when nothing is proven';
  for (const best of [null, 611999, -1, 1000001, '612000']) assert.equal(P({ best }), BEST, String(best));
  assert.equal(checkBook(withPage(CLEARED_BOOK, { best: 1000000 })).ok, true);
  assert.equal(bookWhy(withPage(EMPTY_BOOK, { best: 0 })), BEST); assert.equal(bookWhy(withPage(PLAIN_BOOK, { best: null })), BEST);
  assert.equal(checkBook(withPage(PLAIN_BOOK, { best: 0 })).ok, true, 'plain builds alone have a best');
  assert.equal(bookWhy({ ...CLEARED_BOOK, page: { combos: [], anti: [], get plain() { throw new Error('x'); } } }), 'the book could not be read');
});

test('the build book: a job\'s proven builds ranked on one page, each with its sigil, its finder and its keys; the same page always the same bytes', () => {
  for (const t of THEME_IDS) {
    const h = createHash('sha256');
    for (const b of BOOKS) { const px = leaf(b, t); assert.equal(px.length, 400 * 210 * 3); assert.equal(same(px, leaf(b, t)), true); h.update(px); }
    PINS['book ' + t] = h.digest('hex');
    assert.equal(new Set(BOOKS.map((b) => sha(leaf(b, t)))).size, BOOKS.length, t + ': every page its own');
  }
  const base = leaf(CLEARED_BOOK), pg = CLEARED_BOOK.page, [r0, r1] = pg.combos, a0 = pg.anti[0];
  for (const [label, b] of [
    ['job title', { ...CLEARED_BOOK, job: { ...CLEARED_BOOK.job, title: 'Loans' } }], ['no job title', { ...CLEARED_BOOK, job: { ...CLEARED_BOOK.job, title: '' } }], ['bar', { ...CLEARED_BOOK, job: { ...CLEARED_BOOK.job, bar: 610000 } }],
    ['business', { ...CLEARED_BOOK, job: { ...CLEARED_BOOK.job, set: 'credit' } }], ['best', withPage(CLEARED_BOOK, { best: 613000 })], ['plain', withPage(CLEARED_BOOK, { plain: 1 })],
    ['a name', withPage(CLEARED_BOOK, { combos: [{ ...r0, name: 'Triage Sentinel' + X + 'Credit Oracles' }, r1] })], ['a build id', withPage(CLEARED_BOOK, { combos: [{ ...r0, build: sha('other') }, r1] })],
    ['a gate', withPage(CLEARED_BOOK, { combos: [{ ...r0, gate: 611900, best: 589900 }, r1] })], ['a lift', withPage(CLEARED_BOOK, { combos: [{ ...r0, best: 589900, lift: 22100 }, r1] })],
    ['a finder', withPage(CLEARED_BOOK, { combos: [{ ...r0, finder: KEY[2] }, r1] })], ['keys', withPage(CLEARED_BOOK, { combos: [{ ...r0, keys: 6 }, r1] })], ['an anti-combo\'s keys', withPage(CLEARED_BOOK, { anti: [{ ...a0, keys: 3 }] })],
    ['a row fewer', withPage(CLEARED_BOOK, { combos: [r0] })], ['no anti-combo', withPage(CLEARED_BOOK, { anti: [] })],
  ]) assert.equal(same(base, leaf(b)), false, label);
  const f = identicon(r0.finder, 1);
  assert.equal(rgb(base, 342, 81, 400), (f.px[44 * 3] << 16) | (f.px[44 * 3 + 1] << 8) | f.px[44 * 3 + 2], 'the first combo\'s finder, on the first row');
  const g = identicon(a0.finder, 1);
  assert.equal(rgb(base, 342, 117, 400), (g.px[44 * 3] << 16) | (g.px[44 * 3 + 1] << 8) | g.px[44 * 3 + 2], 'the anti-combo after the combos');
  assert.equal(rgb(base, 0, 0, 400), 0xffd23c, 'a job its best has cleared, framed in gold');
  const at = (bar) => leaf({ ...CLEARED_BOOK, job: { ...CLEARED_BOOK.job, bar } });
  assert.equal(rgb(at(612000), 0, 0, 400), 0xffd23c, 'the best exactly at the bar clears it'); assert.notEqual(rgb(at(612001), 0, 0, 400), 0xffd23c, 'and under it does not');
  assert.notEqual(rgb(leaf(PLAIN_BOOK), 0, 0, 400), 0xffd23c); assert.notEqual(rgb(leaf(EMPTY_BOOK), 0, 0, 400), 0xffd23c, 'nothing proven clears nothing');
  const panel = rgb(base, 200, 61, 400), quiet = (px) => cset(region(px, 44, 184, 140, 194)).join() === String(panel);
  const six = withPage(FULL_BOOK, { combos: FULL_BOOK.page.combos.slice(0, 4) }), seven = withPage(FULL_BOOK, { combos: FULL_BOOK.page.combos.slice(0, 5) });
  assert.ok(quiet(leaf(six)), 'six rows fit, with nothing more to count'); assert.equal(quiet(leaf(seven)), false, 'a seventh is counted');
  assert.equal(same(leaf(seven), leaf(withPage(FULL_BOOK, { combos: FULL_BOOK.page.combos.slice(0, 6) }))), false, 'and the count is how many more');
  const named = (name) => leaf(withPage(CLEARED_BOOK, { combos: [{ ...r0, name }, r1] }));
  assert.equal(same(named(N24 + X + 'Abcdef'), named(N24 + X + 'Abcdeg')), false, 'a name of 33 letters shows whole');
  assert.ok(same(named(N24 + X + 'Abcdefg'), named(N24 + X + 'Abcdefh')), 'past 33, the first 32 and an ellipsis');
  assert.equal(same(named(N24 + X + 'Abcdefg'), named(N24 + X + 'Abcdxfg')), false, 'and the 32 are shown');
  assert.equal(same(leaf(PLAIN_BOOK), leaf(withPage(PLAIN_BOOK, { plain: 1 }))), false, 'plain builds counted');
  assert.equal(same(region(leaf(PLAIN_BOOK), 60, 118, 340, 130), region(leaf({ ...EMPTY_BOOK, job: PLAIN_BOOK.job }), 60, 118, 340, 130)), false, 'plain builds proven, or nothing at all');

  const big = leaf(CLEARED_BOOK, 'synthwave-v1', 1200, 630), up = new Uint8Array(1200 * 630 * 3);
  for (let y = 0; y < 630; y++) for (let x = 0; x < 1200; x++) { const o = (Math.floor(y / 3) * 400 + Math.floor(x / 3)) * 3; up.set(base.subarray(o, o + 3), (y * 1200 + x) * 3); }
  assert.ok(same(big, up), 'the share picture: three pixels a pixel');
  const h = createHash('sha256');
  for (const [w, hh] of [[100, 100], [2400, 100], [100, 2400], [333, 777]]) h.update(leaf(FULL_BOOK, 'blueprint-v1', w, hh));
  PINS['book sizes'] = h.digest('hex');
  for (const [w, hh] of [[99, 210], [400, 99], [2401, 210], [400, 2401], [400.5, 210], ['400', 210], [null, 210]]) refused(paintBook(CLEARED_BOOK, 'synthwave-v1', w, hh), /^width and height must be whole numbers from 100 to 2400$/);
  for (const t of ['', 'synthwave', 'toString', null]) refused(paintBook(CLEARED_BOOK, t, 400, 210), /^unknown theme$/);
  refused(paintBook(withPage(CLEARED_BOOK, { plain: -1 }), 'synthwave-v1', 400, 210), /^plain counts/);
  const circular = {}; circular.self = circular;
  for (const x of [null, undefined, 5n, Symbol('s'), circular, { ...CLEARED_BOOK, page: circular }, { ...CLEARED_BOOK, page: { ...pg, combos: [circular] } }, new Proxy({}, { get() { throw new Error('x'); } })]) {
    assert.doesNotThrow(() => paintBook(x, 'synthwave-v1', 400, 210)); assert.equal(paintBook(x, 'synthwave-v1', 400, 210).ok, false); assert.doesNotThrow(() => checkBook(x));
  }
  for (const k of Object.keys(r0)) for (const v of [null, undefined, 0, -1, 'x', [], {}, NaN, 1e9]) assert.doesNotThrow(() => paintBook(withPage(CLEARED_BOOK, { combos: [{ ...r0, [k]: v }, r1] }), 'synthwave-v1', 400, 210), k);
  for (const b of BOOKS) assert.deepEqual(colours(leaf(b, 'lcd-v1')).filter((c) => ![0x0f1210, 0x4a5048, 0x9aa095, 0xd8dccf].includes(c)), [], 'the pocket screen is four shades');
});

test('the pins: builds, the job board, the build sheets and the build book, frozen byte for byte', () => {
  const want = {
    'synthwave-v1': '4c3f86d5d914ea95db0e143c96db7b3dff76d193eb34733ec7427217caaf95ea',
    'blockcraft-v1': 'cac4ed0fe350a0ee0f2eb9341e928f56b313f1c218ed1df5112db7a1969acd59',
    'lcd-v1': '2941697a53dbaf6b5d99566f92429536b7c69e86b18f6b50c6984fec5fa82090',
    'memphis-v1': 'd8db360d892b1571696638fba8e911e426dbef389578b61efd98bd198a9d59cf',
    'blueprint-v1': '0677d38192264209763d23d21a64806c2e748d4448a44e8147e3f5ff7849a532',
    'sizes': '4f179143815d6fe5372d04da553832a22c9332c92297c4ef03361fcbaaac8800',
    'jobs synthwave-v1': 'e6a5e4d36926b9c7d85695b1410c295ee4b34edda60b5377d16f9743a12d5b69',
    'jobs blockcraft-v1': 'e87917b1479bb32da239758f882953e1424c40bd6de37bdccc3526310b05abfb',
    'jobs lcd-v1': '639bee01b4a476ac87ad6a8dfb5c761313ffa7516c86699c1c90320197aa128e',
    'jobs memphis-v1': '43a837def57f822bc88d290b9df0f077e3e208ea9ff87428cc826f635c1f63d3',
    'jobs blueprint-v1': '9a9ac23561f953595414419ca37c0cc1d716d7292e12cb3d1825139b9fca46b0',
    'sheet synthwave-v1': '50e52ccffe45097214925d4d71e73b0ccce36f9d471e2cab2e3b318f128d87e4',
    'sheet blockcraft-v1': '6ca4062bd69da39b79a1899ba0ed0865ae16140ab837fe1ab30c2776206bf992',
    'sheet lcd-v1': '497cf1139a162703ae96ca63fd324479fd6dadb58601e709c350942d18ae0240',
    'sheet memphis-v1': '5e3d8ce0e608f6687f49d47b790e8abc8189cd1d4d811204564e8a8baa19f6d8',
    'sheet blueprint-v1': 'f50be772bb5247b7a3776e1c0ce20c5349c11aa306d06208a5ac5b336b5051d2',
    'sheet sizes': '06b137d9327abe080afa8076ee4255d6d0e12bbea9820b55e24a5918c4475c9d',
    'book synthwave-v1': '77b39aeb17a3aa93be0a94f9055afd45251abb1a5e79ad7d7aa9c2b974c402a6',
    'book blockcraft-v1': '948f00b30f92bc9cb90c6322de7b27378ab431b41f88cf94d3b9b3c568502ed0',
    'book lcd-v1': 'f3283c1c0a3f02fe3ca64c0130dc812b66fc855f2b49543ceae27ad939e0812f',
    'book memphis-v1': '5590f51830aa7209e36051ee74d6b37506ca8d6c836861c88ddb59a945df5e3e',
    'book blueprint-v1': '40805058a376edc2d86345d8783cfb3b607097b4ef93c37264e3f4a8e55b3972',
    'book sizes': '834b55ebb030994fd1db7c53eb283a737b04efd206fbe90ac13ae281cf440873',
  };
  assert.deepEqual(Object.keys(PINS).sort(), [...THEME_IDS, ...THEME_IDS.map((t) => 'jobs ' + t), 'sizes', ...THEME_IDS.map((t) => 'sheet ' + t), 'sheet sizes', ...THEME_IDS.map((t) => 'book ' + t), 'book sizes'].sort());
  assert.deepEqual(PINS, want);
});

test('the build painter keeps the kernel rules, building on the card engine and the UI kit only', () => {
  assert.deepEqual(violations(readFileSync(new URL('./build.mjs', import.meta.url), 'utf8'), { imports: ['./kardart.mjs', './ui.mjs'] }), []);
});
