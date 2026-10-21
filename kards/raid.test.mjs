// raid.test.mjs - the raid painter: the eight bosses, the published health rule, a raid read once and refused with a reason
// when it is not one, the boss that stands and the boss that falls, every fact on the picture, and the pins that freeze it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { BOSSES, bossHealth, bossSprite, checkRaid, paintRaid } from './raid.mjs';
import { THEMES } from './kardart.mjs';
import { idOf } from './corpus.mjs';
import { violations } from './source-check.mjs';

const sha = (u8) => createHash('sha256').update(u8).digest('hex');
const same = (a, b) => Buffer.from(a).equals(Buffer.from(b));
const refused = (r, why) => { assert.equal(r.ok, false); assert.equal(typeof r.why, 'string'); if (why) assert.match(r.why, why); };
const THEME_IDS = Object.keys(THEMES).slice(0, 4);
const KEYS = ['hospital-admissions', 'hospital-clinical', 'hospital-pharmacy', 'hospital-history', 'hospital-discharge', 'bank-credit', 'adult-employer', 'credit-billing'];
const RAID = Object.freeze({ dataset: 'hospital', department: 'admissions', best: 554000, attempts: 12 });
const LOOT = Object.freeze({ id: idOf('first-admissions'), rarity: 'epic', title: 'Admit Oracle' });
const FALLEN = Object.freeze({ ...RAID, best: 612300, attempts: 31, loot: LOOT });
const draw = (r, theme = 'synthwave-v1', w = 240, h = 160) => { const x = paintRaid(r, theme, w, h); assert.equal(x.ok, true, x.why); return x.px; };
const PINS = {   // the published raid pictures and boss sprites: a change to how a raid is drawn is a new theme id, as with the cards
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

test('the raid painter keeps the kernel rules, building on the card engine and the UI kit only', () => {
  assert.deepEqual(violations(readFileSync(new URL('./raid.mjs', import.meta.url), 'utf8'), { imports: ['./kardart.mjs', './ui.mjs'] }), []);
});
