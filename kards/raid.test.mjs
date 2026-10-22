// raid.test.mjs - the raid painter: the eight bosses, the published health rule, a raid read once and refused with a reason
// when it is not one, the boss that stands and the boss that falls, every fact on the picture, and the pins that freeze it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { BOSSES, bossHealth, bossSprite, checkRaid, paintRaid, checkChapter, paintChapter } from './raid.mjs';
import { THEMES } from './kardart.mjs';
import { idOf } from './corpus.mjs';
import { violations } from './source-check.mjs';

const sha = (u8) => createHash('sha256').update(u8).digest('hex');
const same = (a, b) => Buffer.from(a).equals(Buffer.from(b));
const refused = (r, why) => { assert.equal(r.ok, false); assert.equal(typeof r.why, 'string'); if (why) assert.match(r.why, why); };
const THEME_IDS = Object.keys(THEMES);   // every published theme: a theme that some painter cannot draw turns this red
const KEYS = ['hospital-admissions', 'hospital-clinical', 'hospital-pharmacy', 'hospital-history', 'hospital-discharge', 'bank-credit', 'adult-employer', 'credit-billing'];
const RAID = Object.freeze({ dataset: 'hospital', department: 'admissions', best: 554000, attempts: 12 });
const LOOT = Object.freeze({ id: idOf('first-admissions'), rarity: 'epic', title: 'Admit Oracle' });
const FALLEN = Object.freeze({ ...RAID, best: 612300, attempts: 31, loot: LOOT });
const draw = (r, theme = 'synthwave-v1', w = 240, h = 160) => { const x = paintRaid(r, theme, w, h); assert.equal(x.ok, true, x.why); return x.px; };
const PINS = {   // the published raid pictures and boss sprites: a change to how a raid is drawn is a new theme id, as with the cards
  'blueprint-v1': 'a7559c81b755b8d0ebbdc7caa38f943a1791801b11fa7d5ca675bc0088ee7bc1',
  sprites: 'b6091ff50f06447a66e3e1495d28c085c36a8313b8a4dba102013f874ae5eb31', 'synthwave-v1': 'ed91658642c0f7df50f045926fa0cfe7caa7b6fcbc701bf2c70e39b743aac3a0', 'blockcraft-v1': 'e08d60969fb080ea25fed9945ce34edd2e4522c430addeb0d3e92b9d10532800', 'lcd-v1': '6475caca258a2dbe507e3714baae351ec063730ea3a9930afd132793e71e268d', 'memphis-v1': 'd54ef2610e11751dcfbd02a7216e77d35c232aac14bb4b466c47e5ad70f94215',
  fallen: '01cc1c1c1b4dc47d99a61ad6447d1012a08e98360fc74d00aed3b526b871414f', unscored: '091005edd0360e0b7d12aba876a30357431494b15fa054c8229590d632c430f8', wide: 'a07a63817ede2f09396a993aeb12327a1498ab75b1e7385b04a99c00aa78cf14',
};

test('the eight bosses: one per department that never cleared 0.6, each its own sprite', () => {
  assert.deepEqual(BOSSES.map((b) => b.key), KEYS);
  assert.deepEqual(BOSSES.map((b) => [b.dataset, b.department]), KEYS.map((k) => [k.slice(0, k.indexOf('-')), k.slice(k.indexOf('-') + 1)]));
  assert.deepEqual(BOSSES.map((b) => b.name), ['THE WAITING ROOM', 'THE TRIAGE EYE', 'THE PILL GOLEM', 'THE CHART LICH', 'THE REVOLVING DOOR', 'THE VAULT WYRM', 'THE BRIEFCASE TITAN', 'THE INVOICE HYDRA']);
  assert.ok(Object.isFrozen(BOSSES) && BOSSES.every(Object.isFrozen));
  const all = createHash('sha256'), looks = new Set();
  for (const key of KEYS) {
    const s = bossSprite(key);
    assert.equal(s.ok, true); assert.equal(s.w, 32); assert.equal(s.h, 32); assert.equal(s.px.length, 32 * 32 * 4);
    let ink = 0;
    for (let i = 0; i < 1024; i++) if (s.px[i * 4 + 3]) ink++;
    assert.ok(ink > 300 && ink < 1000, key + ' has a body: ' + ink);
    for (let i = 0; i < 1024; i++) if (s.px[i * 4 + 3]) { const a = s.px[i * 4 + 3]; assert.equal(a, 255); }
    looks.add(sha(s.px)); all.update(Buffer.from(s.px));
    const big = bossSprite(key, 3);
    assert.equal(big.w, 96);
    for (let y = 0; y < 96; y += 5) for (let x = 0; x < 96; x += 5) for (let c = 0; c < 4; c++) assert.equal(big.px[(y * 96 + x) * 4 + c], s.px[((y / 3 | 0) * 32 + (x / 3 | 0)) * 4 + c]);
  }
  assert.equal(looks.size, 8, 'eight bosses, eight sprites');
  assert.equal(all.digest('hex'), PINS.sprites);
  for (const key of ['hospital', 'bank-credits', '', null, 5, 'toString']) refused(bossSprite(key), /^the boss must be one of hospital-admissions, /);
  for (const scale of [0, 17, 1.5, '2', null]) refused(bossSprite(KEYS[0], scale), /^scale must be a whole number from 1 to 16$/);
  assert.equal(bossSprite(KEYS[0], 16).w, 512);
});

test('the published health rule: a boss is its distance to the bar, max(0, 600000 - best) in millionths of GATE', () => {
  assert.deepEqual([null, 0, 1, 500000, 554000, 599999, 600000, 600001, 1000000].map(bossHealth), [600000, 600000, 599999, 100000, 46000, 1, 0, 0, 0]);
  for (const x of [-1, 1000001, 1.5, '554000', undefined, NaN]) assert.equal(bossHealth(x), null, String(x));
});

test('a raid: read once, and anything that is not one refused with a reason', () => {
  assert.deepEqual(checkRaid(RAID), { ok: true, r: { key: 'hospital-admissions', best: 554000, attempts: 12, loot: null } });
  assert.deepEqual(checkRaid(FALLEN), { ok: true, r: { key: 'hospital-admissions', best: 612300, attempts: 31, loot: { id: LOOT.id, rarity: 'epic', ri: 3, title: 'Admit Oracle' } } });
  assert.equal(checkRaid({ dataset: 'bank', department: 'credit', best: null }).r.attempts, 0, 'attempts default to none');
  for (const k of KEYS) assert.equal(checkRaid({ dataset: k.slice(0, k.indexOf('-')), department: k.slice(k.indexOf('-') + 1), best: 0 }).ok, true, k);
  for (const x of [null, 5, 'raid', []]) refused(checkRaid(x), /^the raid must be an object$/);
  for (const [dataset, department] of [['hospital', 'surgery'], ['telco', 'churn'], ['hospital', null], [5, 'admissions'], ['hospital-admissions', ''], [['hospital'], 'admissions'], ['hospital', ['admissions']], [['hospital'], ['admissions']]]) refused(checkRaid({ ...RAID, dataset, department }), /^the boss must be one of /);
  for (const best of [-1, 1000001, 1.5, '554000', undefined]) refused(checkRaid({ ...RAID, best }), /^best must be a whole number of millionths from 0 to 1000000, or null$/);
  for (const best of [0, 599999]) assert.equal(checkRaid({ ...RAID, best }).ok, true);
  for (const attempts of [-1, 100000, 2.5, '3', null]) refused(checkRaid({ ...RAID, attempts }), /^attempts must be a whole number from 0 to 99999$/);
  assert.equal(checkRaid({ ...RAID, attempts: 99999 }).ok, true);
  refused(checkRaid({ ...RAID, loot: LOOT }), /^loot comes only when the boss falls$/);
  refused(checkRaid({ ...RAID, best: null, loot: LOOT }), /^loot comes only when the boss falls$/);
  for (const best of [600000, 1000000]) { refused(checkRaid({ ...RAID, best }), /^a fallen boss leaves loot: the first card to clear the bar$/); assert.equal(checkRaid({ ...RAID, best, loot: LOOT }).ok, true); }
  for (const loot of [null, 5, []]) refused(checkRaid({ ...FALLEN, loot }), /^loot must be an object$/);
  for (const id of ['XYZ', 'abc', '0123456789abcdef0', 5, null, Array.from('0123456789abcdef')]) refused(checkRaid({ ...FALLEN, loot: { ...LOOT, id } }), /^the loot id must be 16 lowercase hex characters$/);
  refused(checkRaid({ ...FALLEN, loot: { ...LOOT, rarity: 'mythic' } }), /^the loot rarity must be one of common, uncommon, rare, epic, legendary$/);
  for (const rarity of ['common', 'legendary']) assert.equal(checkRaid({ ...FALLEN, loot: { ...LOOT, rarity } }).ok, true, rarity);
  for (const title of ['T'.repeat(25), 'a/b', 5]) refused(checkRaid({ ...FALLEN, loot: { ...LOOT, title } }), /^the loot title must be at most 24 characters/);
  for (const title of ['T'.repeat(24), undefined]) assert.equal(checkRaid({ ...FALLEN, loot: { ...LOOT, title } }).ok, true);
  const trap = Object.defineProperty({}, 'dataset', { get() { throw new Error('boom'); }, enumerable: true });
  refused(checkRaid(trap), /^the raid could not be read$/);
});

test('raids re-draw byte for byte: pinned in every theme, standing and fallen', () => {
  for (const t of THEME_IDS) assert.equal(sha(draw(RAID, t, 480, 320)), PINS[t], t);
  assert.equal(sha(draw(FALLEN, 'blockcraft-v1', 480, 320)), PINS.fallen);
  assert.equal(sha(draw({ dataset: 'credit', department: 'billing', best: null }, 'memphis-v1', 480, 320)), PINS.unscored);
  assert.equal(sha(draw({ ...FALLEN, dataset: 'bank', department: 'credit' }, 'synthwave-v1', 1200, 630)), PINS.wide);
});

test('every fact of a raid is on the picture', () => {
  const base = draw(RAID);
  const differs = (r, what) => assert.equal(same(base, draw(r)), false, what);
  for (const k of KEYS.slice(1)) differs({ ...RAID, dataset: k.slice(0, k.indexOf('-')), department: k.slice(k.indexOf('-') + 1) }, k);
  differs({ ...RAID, best: 554100 }, 'the best score, by a ten-thousandth');
  differs({ ...RAID, best: null }, 'no score yet');
  differs({ ...RAID, attempts: 13 }, 'one more try');
  differs({ ...RAID, attempts: 1 }, 'one try');
  assert.equal(same(draw({ ...RAID, best: 400000 }), draw({ ...RAID, best: 450000 })), false, 'below chance the bar stays full, and the numbers still show');
  const fallen = draw(FALLEN);
  differs(FALLEN, 'a boss falls');
  for (const loot of [{ ...LOOT, id: idOf('another') }, { ...LOOT, rarity: 'legendary' }, { ...LOOT, title: 'Admit Oraclf' }, { ...LOOT, title: '' }]) assert.equal(same(fallen, draw({ ...FALLEN, loot })), false, JSON.stringify(loot));
  assert.equal(same(fallen, draw({ ...FALLEN, best: 612400 })), false, 'the GATE that cleared it');
});

test('sizes: a whole-number scale of 240 x 160, the raid centred, everything from 64 to 2048 paints; the painter never throws', () => {
  for (const [w, h, k] of [[240, 160, 1], [480, 320, 2], [1200, 630, 3], [64, 64, 1], [2048, 64, 1], [64, 2048, 1], [719, 479, 2]]) {
    const r = paintRaid(FALLEN, 'synthwave-v1', w, h);
    assert.equal(r.ok, true); assert.equal(r.scale, k); assert.equal(r.px.length, w * h * 3);
  }
  const one = draw(RAID, 'blockcraft-v1', 240, 160), two = draw(RAID, 'blockcraft-v1', 480, 320);
  for (let y = 0; y < 320; y += 7) for (let x = 0; x < 480; x += 5) for (let c = 0; c < 3; c++) assert.equal(two[(y * 480 + x) * 3 + c], one[((y >> 1) * 240 + (x >> 1)) * 3 + c]);
  const wide = draw(RAID, 'blockcraft-v1', 480, 160), tall = draw(RAID, 'blockcraft-v1', 240, 320);
  for (let y = 0; y < 160; y += 3) for (let x = 0; x < 240; x += 3) for (let c = 0; c < 3; c++) {
    assert.equal(wide[(y * 480 + x + 120) * 3 + c], one[(y * 240 + x) * 3 + c], 'wider: the raid sits in the middle');
    assert.equal(tall[((y + 80) * 240 + x) * 3 + c], one[(y * 240 + x) * 3 + c], 'taller: the raid sits in the middle');
  }
  for (const [w, h] of [[241, 160], [242, 161], [479, 160], [481, 321], [719, 160], [2048, 319], [64, 64]]) {   // no pixel from outside the canvas: a blockcraft raid never draws pure black
    const px = draw(RAID, 'blockcraft-v1', w, h);
    for (let i = 0; i < px.length; i += 3) assert.ok(px[i] + px[i + 1] + px[i + 2] > 0, w + ' x ' + h + ': a pixel from outside the canvas at ' + i / 3);
  }
  for (const [w, h] of [[63, 160], [240, 63], [2049, 160], [240, 2049], [240.5, 160], ['240', 160], [null, 160]]) refused(paintRaid(RAID, 'synthwave-v1', w, h), /^width and height must be whole numbers from 64 to 2048$/);
  for (const t of ['', 'synthwave', 'toString', '__proto__', null, 5]) refused(paintRaid(RAID, t, 240, 160), /^unknown theme$/);
  refused(paintRaid({ ...RAID, best: 700000 }, 'synthwave-v1', 240, 160), /^a fallen boss leaves loot/);
  for (const r of [RAID, FALLEN]) {
    const px = draw(r, 'lcd-v1', 480, 320), seen = new Set();
    for (let i = 0; i < px.length; i += 3) seen.add((px[i] << 16) | (px[i + 1] << 8) | px[i + 2]);
    assert.deepEqual([...seen].sort((a, b) => a - b), [0x0f1210, 0x4a5048, 0x9aa095, 0xd8dccf], 'the pocket screen is four shades');
  }
  const circular = {}; circular.self = circular;
  for (const x of [null, undefined, 5n, Symbol('s'), circular, { ...FALLEN, loot: circular }, new Proxy({}, { get() { throw new Error('x'); } })]) {
    assert.doesNotThrow(() => paintRaid(x, 'synthwave-v1', 240, 160));
    assert.doesNotThrow(() => paintRaid(RAID, x, 240, 160));
    assert.equal(paintRaid(x, 'synthwave-v1', 240, 160).ok, false);
  }
});

// the campaign's six chapters as DIGI reads them from its drop (src/campaign.mjs chaptersOf), in some states of play
const HOSP = ['hospital-discharge', 'hospital-clinical', 'hospital-history', 'hospital-admissions', 'hospital-pharmacy'], HB = [580771, 565893, 563159, 546728, 539168];
const CHAPTERS = [
  { n: 1, set: 'shop', raids: [], world: { best: 921634, bar: 931634, fallen: true } },
  { n: 2, set: 'telco', raids: [], world: { best: 818213, bar: 828213, fallen: false } },
  { n: 3, set: 'adult', raids: [{ domain: 'adult-employer', best: 572118, fallen: true }], world: { best: 807504, bar: 817504, fallen: false }, now: true },
  { n: 4, set: 'bank', raids: [{ domain: 'bank-credit', best: 569346, fallen: false }], world: { best: 770582, bar: 780582, fallen: false } },
  { n: 5, set: 'hospital', raids: HOSP.slice(0, 2).map((domain, i) => ({ domain, best: HB[i], fallen: false })), world: { best: 580771, bar: 610000, fallen: false } },
  { n: 6, set: 'hospital', raids: HOSP.map((domain, i) => ({ domain, best: HB[i], fallen: i < 2 })), world: { best: 580771, bar: 610000, fallen: false } },
];
const chap = (c, theme = 'synthwave-v1', w = 240, h = 160) => { const x = paintChapter(c, theme, w, h); assert.equal(x.ok, true, x.why); return x.px; };
const cpins = {};
const cwant = {
  'synthwave-v1': '2619d0fd5d9b35edabf02a5a25305742c0683949891b132e37a2614fb5eb1ce8',
  'blockcraft-v1': 'e7465c0036324c19f0d5ff2921b1f03c36ebcd21ca981ce0c26f5d8533c47c99',
  'lcd-v1': 'c64654990d633053b5c267078c44a03658593cdb543604812c0f36debf0bd360',
  'memphis-v1': '2d33cfb21b7fe333cfed27bed07b5ff0757af2e6a6a31cbdad334329bb07cafd',
  'blueprint-v1': '7afc4325a3377ce0a8389e12e3fbc4e10e9936cac51f7544107def1cf918e09b',
  sizes: '3d233247e3e33ecd895bc62a0ad9ffc4df44ee3fae5603256ae31af5de4b66e3',
};
test('a chapter of the campaign: read once, and anything that is not one refused with a reason', () => {
  assert.deepEqual(checkChapter(CHAPTERS[2]), { ok: true, c: { n: 3, set: 'adult', raids: [{ key: 'adult-employer', best: 572118, fallen: true }], world: { best: 807504, bar: 817504, fallen: false }, now: true, cleared: false } });
  assert.equal(checkChapter(CHAPTERS[0]).c.cleared, true, 'every boss fallen: cleared');
  assert.equal(checkChapter(CHAPTERS[0]).c.now, false, 'now is false unless it says');
  assert.equal(checkChapter({ ...CHAPTERS[5], raids: CHAPTERS[5].raids.map((r) => ({ ...r, fallen: true })) }).c.cleared, false, 'not while the world boss stands');
  assert.equal(checkChapter({ ...CHAPTERS[3], world: { ...CHAPTERS[3].world, fallen: true } }).c.cleared, false, 'not while a department boss stands');
  for (const x of [null, 5, 'chapter', []]) refused(checkChapter(x), /^the chapter must be an object$/);
  for (const n of [0, 100, 1.5, '1', null]) refused(checkChapter({ ...CHAPTERS[0], n }), /^n must be a whole number from 1 to 99$/);
  for (const n of [1, 99]) assert.equal(checkChapter({ ...CHAPTERS[0], n }).c.n, n);
  for (const set of ['health', '', null, 'Shop']) refused(checkChapter({ ...CHAPTERS[0], set }), /^set must be one of telco, shop, bank, adult, hospital, credit, custom$/);
  for (const raids of ['x', null, { length: 1 }]) refused(checkChapter({ ...CHAPTERS[0], raids }), /^raids must be an array of at most 5$/);
  refused(checkChapter({ ...CHAPTERS[5], raids: [...CHAPTERS[5].raids, CHAPTERS[5].raids[0]] }), /^raids must be an array of at most 5$/);
  assert.equal(checkChapter(CHAPTERS[5]).ok, true, 'five raids');
  for (const r of [null, 5, []]) refused(checkChapter({ ...CHAPTERS[3], raids: [r] }), /^every raid must be an object$/);
  refused(checkChapter({ ...CHAPTERS[3], raids: [{ domain: 'adult-employer', best: 5, fallen: false }] }), /^every raid is one of this business's bosses: bank-credit$/);
  refused(checkChapter({ ...CHAPTERS[0], raids: [{ domain: 'nope', best: 5, fallen: false }] }), /^every raid is one of this business's bosses: $/);
  refused(checkChapter({ ...CHAPTERS[5], raids: [CHAPTERS[5].raids[0], CHAPTERS[5].raids[0]] }), /^a boss is raided once: hospital-discharge$/);
  for (const best of [-1, 1000001, 1.5, '5', null]) refused(checkChapter({ ...CHAPTERS[3], raids: [{ ...CHAPTERS[3].raids[0], best }] }), /^a raid's best must be a whole number of millionths from 0 to 1000000$/);
  for (const best of [0, 1000000]) assert.equal(checkChapter({ ...CHAPTERS[3], raids: [{ ...CHAPTERS[3].raids[0], best }] }).ok, true);
  for (const fallen of [1, 'yes', null, undefined]) refused(checkChapter({ ...CHAPTERS[3], raids: [{ ...CHAPTERS[3].raids[0], fallen }] }), /^a raid's fallen must be true or false$/);
  for (const world of [null, 5, []]) refused(checkChapter({ ...CHAPTERS[0], world }), /^the world boss must be an object$/);
  for (const w of [{ best: 5, bar: 5 }, { best: 6, bar: 5 }, { best: -1, bar: 5 }, { best: 1000001, bar: 1010000 }, { best: 5, bar: 1010001 }, { best: 5, bar: 7.5 }, { best: '5', bar: 9 }]) refused(checkChapter({ ...CHAPTERS[0], world: { ...w, fallen: false } }), /^the world boss's best and bar are whole numbers of millionths, the bar above the best$/);
  for (const w of [{ best: 5, bar: 6 }, { best: 1000000, bar: 1010000 }, { best: 0, bar: 1 }]) assert.equal(checkChapter({ ...CHAPTERS[0], world: { ...w, fallen: false } }).ok, true, JSON.stringify(w));
  for (const fallen of [0, 'no', null]) refused(checkChapter({ ...CHAPTERS[0], world: { ...CHAPTERS[0].world, fallen } }), /^the world boss's fallen must be true or false$/);
  for (const now of [1, 'yes', null]) refused(checkChapter({ ...CHAPTERS[1], now }), /^now must be true or false$/);
  refused(checkChapter({ ...CHAPTERS[0], now: true }), /^a cleared chapter is not the one to play now$/);
  refused(checkChapter({ ...CHAPTERS[0], get world() { throw new Error('toxic'); } }), /^the chapter could not be read$/);
});

test('a chapter on the picture: every boss, its health, the next one to beat, NOW and CLEARED, and the pins that freeze it', () => {
  for (const t of THEME_IDS) {
    const h = createHash('sha256');
    for (const c of CHAPTERS) { const px = chap(c, t); assert.equal(same(px, chap(c, t)), true); h.update(px); }
    cpins[t] = h.digest('hex');
  }
  assert.equal(new Set(CHAPTERS.map((c) => sha(chap(c)))).size, CHAPTERS.length, 'every chapter its own picture');
  for (const base of [CHAPTERS[3], CHAPTERS[5]]) {
    const px = chap(base);
    const changes = [{ n: base.n + 1 }, { world: { ...base.world, best: base.world.best - 5000 } }, { world: { ...base.world, bar: base.world.bar + 5000 } }, { world: { ...base.world, fallen: true } }, { now: !base.now },
      { raids: base.raids.map((r, i) => (i === base.raids.findIndex((x) => !x.fallen) ? { ...r, best: r.best - 5000 } : r)) }, { raids: base.raids.map((r, i) => (i === base.raids.length - 1 ? { ...r, fallen: !r.fallen } : r)) }];
    for (const ch of changes) assert.equal(same(px, chap({ ...base, ...ch })), false, JSON.stringify(ch).slice(0, 80));
  }
  assert.equal(same(chap(CHAPTERS[4]), chap({ ...CHAPTERS[4], raids: [...CHAPTERS[4].raids].reverse() })), false, 'the order they are played in');
  assert.ok(same(chap(CHAPTERS[2]), chap({ ...CHAPTERS[2], raids: [{ ...CHAPTERS[2].raids[0], best: 100 }] })), 'a fallen boss shows no health');
  assert.ok(same(chap(CHAPTERS[0]), chap({ ...CHAPTERS[0], world: { ...CHAPTERS[0].world, best: 5, bar: 9 } })), 'nor a fallen world boss');
  assert.equal(same(chap(CHAPTERS[3]), chap({ ...CHAPTERS[3], raids: [{ ...CHAPTERS[3].raids[0], best: 569346 - 1500 }] })), false, 'one bar step: 0.1 GATE over the bar\'s width');
  const three = chap(CHAPTERS[4]), four = chap({ ...CHAPTERS[4], raids: HOSP.slice(0, 3).map((domain, i) => ({ domain, best: HB[i], fallen: false })) });
  const bossAt = (px, x, y) => (px[(y * 240 + x) * 3] << 16) | (px[(y * 240 + x) * 3 + 1] << 8) | px[(y * 240 + x) * 3 + 2];
  const B = bossSprite('hospital-discharge', 2), q = [...Array(64 * 64).keys()].find((n) => B.px[n * 4 + 3]), want = (B.px[q * 4] << 16) | (B.px[q * 4 + 1] << 8) | B.px[q * 4 + 2];
  assert.equal(bossAt(three, 40 - 32 + (q % 64), 110 - 64 + Math.floor(q / 64)), want, 'three stops: each boss at 2 px a cell, first at x 40');
  const B1 = bossSprite('hospital-discharge', 1), q1 = [...Array(32 * 32).keys()].find((n) => B1.px[n * 4 + 3]);
  assert.equal(bossAt(four, 30 - 16 + (q1 % 32), 110 - 32 + Math.floor(q1 / 32)), (B1.px[q1 * 4] << 16) | (B1.px[q1 * 4 + 1] << 8) | B1.px[q1 * 4 + 2], 'four stops: 1 px a cell, first at x 30');
  cpins.sizes = sha(Buffer.concat([chap(CHAPTERS[5], 'memphis-v1', 720, 480), chap(CHAPTERS[2], 'lcd-v1', 64, 200), chap(CHAPTERS[0], 'blueprint-v1', 2048, 160)].map((x) => Buffer.from(x))));
  assert.deepEqual(cpins, cwant, 'the chapters, pinned');
  for (const [w, h] of [[63, 160], [240, 2049], [240.5, 160], ['240', 160]]) refused(paintChapter(CHAPTERS[0], 'synthwave-v1', w, h), /^width and height must be whole numbers from 64 to 2048$/);
  for (const t of ['', 'synthwave', 'toString', null]) refused(paintChapter(CHAPTERS[0], t, 240, 160), /^unknown theme$/);
  refused(paintChapter({ ...CHAPTERS[0], n: 0 }, 'synthwave-v1', 240, 160), /^n must be/);
  for (const [w, h, k] of [[240, 160, 1], [480, 320, 2], [720, 480, 3], [64, 64, 1]]) assert.equal(paintChapter(CHAPTERS[5], 'synthwave-v1', w, h).scale, k);
  const one = chap(CHAPTERS[5], 'blockcraft-v1'), two = chap(CHAPTERS[5], 'blockcraft-v1', 480, 320), wide = chap(CHAPTERS[5], 'blockcraft-v1', 400, 160);
  for (let y = 0; y < 160; y += 3) for (let x = 0; x < 240; x += 3) { assert.equal(bossAt(one, x, y), (two[((2 * y) * 480 + 2 * x) * 3] << 16) | (two[((2 * y) * 480 + 2 * x) * 3 + 1] << 8) | two[((2 * y) * 480 + 2 * x) * 3 + 2]); assert.equal(bossAt(one, x, y), (wide[(y * 400 + x + 80) * 3] << 16) | (wide[(y * 400 + x + 80) * 3 + 1] << 8) | wide[(y * 400 + x + 80) * 3 + 2]); }
  const circular = {}; circular.self = circular;
  for (const x of [null, undefined, 5n, Symbol('s'), circular, { ...CHAPTERS[0], raids: [circular] }, new Proxy({}, { get() { throw new Error('x'); } })]) { assert.doesNotThrow(() => paintChapter(x, 'synthwave-v1', 240, 160)); assert.equal(paintChapter(x, 'synthwave-v1', 240, 160).ok, false); }
});

test('the raid painter keeps the kernel rules, building on the card engine and the UI kit only', () => {
  assert.deepEqual(violations(readFileSync(new URL('./raid.mjs', import.meta.url), 'utf8'), { imports: ['./kardart.mjs', './ui.mjs'] }), []);
});
