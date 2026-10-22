// build.test.mjs - builds and combos: a build read once and refused with a reason when it is not one, the published lift rule (a
// name only on a build that beats its best part), the sigil grown from the recipe, every fact on the card, the job board, the size
// contract, and the pins that freeze them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { KINDS, ROLES, METHODS, SIZES, COMBO_WORDS, checkBuild, buildLift, buildSigil, comboName, paintBuild, checkJobs, paintJobs } from './build.mjs';
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

test('the pins: builds and the job board, frozen byte for byte', () => {
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
  };
  assert.deepEqual(Object.keys(PINS).sort(), [...THEME_IDS, ...THEME_IDS.map((t) => 'jobs ' + t), 'sizes'].sort());
  assert.deepEqual(PINS, want);
});

test('the build painter keeps the kernel rules, building on the card engine and the UI kit only', () => {
  assert.deepEqual(violations(readFileSync(new URL('./build.mjs', import.meta.url), 'utf8'), { imports: ['./kardart.mjs', './ui.mjs'] }), []);
});
