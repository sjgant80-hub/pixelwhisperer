// costcase.test.mjs - the cost case reads every external figure from the sourced basis, floors not top ends, like for like, CPI on
// later years, and never throws. Run with: node --test kards/costcase.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { DEFAULTS, BASIS_KEYS, sourcesOf, over, costCase, verdict } from './costcase.mjs';
import { BASIS } from './basis.mjs';

const RAW = readFileSync(new URL('./vendor/basis.json', import.meta.url));
const VENDOR = JSON.parse(readFileSync(new URL('./vendor/SOURCES.json', import.meta.url), 'utf8'));
const base = (patch) => ({ ...BASIS, ...patch });
const fig = (k, value) => base({ [k]: { ...BASIS[k], value } });
const IN = { drawMs: 25 };
const money = (x) => 'GBP' + x.toFixed(2);

test('the basis is vendored byte for byte, and the module the page imports is the same JSON', () => {
  const pin = VENDOR.files.find((f) => f.path === 'kards/vendor/basis.json');
  assert.equal(createHash('sha256').update(RAW).digest('hex'), pin.sha256);
  assert.equal(pin.sha256, '83e9c2effa2f81596dcfa7110f030940032c1910cdf928d27d628ae59d73bb42');
  assert.equal(RAW.includes(13), false, 'LF only, as git stores it');
  assert.deepEqual(BASIS, JSON.parse(RAW.toString('utf8')));
  for (const k of BASIS_KEYS) assert.match(String(BASIS[k].what || ''), /\w/, k + ' says what it is');
});

test('costCase: the default case, every line from the sourced basis', () => {
  const r = costCase(BASIS, IN);
  assert.equal(r.ok, true);
  assert.deepEqual(r.inputs, { ...DEFAULTS, drawMs: 25 });
  assert.deepEqual(r.lines, { staff: 4917.5, fees: 0, themes: 0, kwh: 0.000104, powerPence: 0.0026 });
  assert.deepEqual(r.perYear, { today: 4917.5, engine: 0 });
  assert.deepEqual(r.over, { today: 15214.55, engine: 0 });
  assert.deepEqual([r.adopt, r.hoursOff, r.savingFirstYear, r.savingOver, r.paybackMonths], [314.72, 250, 4602.78, 14899.83, 1]);
});

test('costCase: the arithmetic, spelled out apart from the kernel', () => {
  const w = BASIS.wageMedianHourly.value, c = BASIS.cpi.value, p = BASIS.electricityPencePerKwh.value, W = BASIS.laptopExtraWatts.value;
  const x = { cardsPerYear: 200, minutesPerCard: 5, feePerCard: 12.5, adoptHours: 40, themeHoursPerYear: 20, drawMs: 40, drawsPerCard: 50, years: 5 };
  const r = costCase(BASIS, x), rd = (v) => Math.round(v * 100) / 100;
  const staff = 200 * 5 / 60 * w, fees = 200 * 12.5, themes = 20 * w, kwh = 200 * 50 * 40 / 3600000 * W / 1000, power = kwh * p / 100, adopt = 40 * w;
  const ov = (v) => { let t = 0, f = 1; for (let y = 0; y < 5; y++) { t += v * f; f *= 1 + c; } return rd(t); };
  assert.deepEqual(r.lines, { staff: rd(staff), fees: 2500, themes: rd(themes), kwh: Math.round(kwh * 1e6) / 1e6, powerPence: Math.round(power * 100 * 10000) / 10000 });
  assert.deepEqual(r.perYear, { today: rd(staff + fees), engine: rd(themes + power) });
  assert.deepEqual(r.over, { today: ov(staff + fees), engine: ov(themes + power) });
  assert.equal(r.adopt, rd(adopt));
  assert.equal(r.hoursOff, rd(200 * 5 / 60 - 20));
  assert.ok(r.hoursOff < 0, 'more theme hours than art hours: the engine adds staff time, and the case says so');
  assert.equal(r.savingFirstYear, rd(staff + fees - themes - power - adopt));
  assert.equal(r.savingOver, rd(ov(staff + fees) - ov(themes + power) - adopt));
  assert.equal(r.paybackMonths, Math.ceil(adopt * 12 / (staff + fees - themes - power)));
  assert.deepEqual([r.lines.staff, r.lines.themes, r.over.today, r.over.engine, r.savingOver, r.paybackMonths], [327.83, 393.4, 15043.39, 2092.8, 12163.79, 4]);
});

test('costCase: the figures move with the basis, not with anything typed', () => {
  assert.equal(costCase(fig('wageMedianHourly', 30), IN).lines.staff, 1000 * 15 / 60 * 30);
  assert.equal(costCase(fig('wageMedianHourly', 30), IN).adopt, 16 * 30);
  assert.equal(costCase(fig('cpi', 0), IN).over.today, 3 * 4917.5);
  assert.equal(costCase(fig('cpi', 0.1), { ...IN, years: 2 }).over.today, Math.round(4917.5 * 2.1 * 100) / 100);
  assert.equal(costCase(fig('electricityPencePerKwh', 100), { ...IN, drawsPerCard: 3600, drawMs: 1000 }).lines.powerPence, 1000 * 3600 * 1000 / 3600000 * 15 / 1000 * 100);
  assert.equal(costCase(fig('laptopExtraWatts', 0), { ...IN, drawsPerCard: 1000 }).lines.powerPence, 0);
  assert.equal(costCase(fig('laptopExtraWatts', 30), { ...IN, drawsPerCard: 1000 }).lines.kwh, Math.round(1000 * 1000 * 25 / 3600000 * 30 / 1000 * 1000000) / 1000000);
});

test('costCase: like for like, the team still designs on the engine side, and the only running cost is the electricity of a draw', () => {
  const r = costCase(BASIS, { ...IN, themeHoursPerYear: 10, drawsPerCard: 100000, drawMs: 60000, cardsPerYear: 1000 });
  const power = 1000 * 100000 * 60000 / 3600000 * 15 / 1000 * 24.51 / 100;
  assert.equal(r.perYear.engine, Math.round((10 * 19.67 + power) * 100) / 100);
  assert.equal(r.perYear.today, costCase(BASIS, IN).perYear.today, 'what it costs today does not depend on the engine');
  const fee = costCase(BASIS, { ...IN, minutesPerCard: 0, feePerCard: 2 });
  assert.deepEqual([fee.lines.staff, fee.lines.fees, fee.perYear.today, fee.hoursOff], [0, 2000, 2000, 0]);
});

test('costCase: boundaries hold at both ends of every input', () => {
  for (const ok of [{ cardsPerYear: 0 }, { cardsPerYear: 1e9 }, { minutesPerCard: 0 }, { minutesPerCard: 6000 }, { minutesPerCard: 0.5 }, { feePerCard: 0 }, { feePerCard: 100000 },
    { adoptHours: 0 }, { adoptHours: 100000 }, { themeHoursPerYear: 0 }, { themeHoursPerYear: 100000 }, { drawMs: 60000 }, { drawMs: 0.001 }, { drawsPerCard: 1 }, { drawsPerCard: 1e6 }, { years: 1 }, { years: 10 }]) {
    assert.equal(costCase(BASIS, { ...IN, ...ok }).ok, true, JSON.stringify(ok));
  }
  assert.equal(costCase(BASIS, { ...IN, years: 1 }).over.today, 4917.5);
  const none = costCase(BASIS, { ...IN, cardsPerYear: 0, adoptHours: 0 });
  assert.deepEqual([none.perYear.today, none.perYear.engine, none.savingOver, none.paybackMonths], [0, 0, 0, null], 'no art and no adoption: nothing saved, nothing to repay');
  assert.equal(costCase(BASIS, { ...IN, cardsPerYear: 0 }).paybackMonths, null, 'nothing saved a year: it never repays');
  assert.equal(costCase(BASIS, { ...IN, adoptHours: 0 }).paybackMonths, 0, 'nothing to repay: repaid at once');
  assert.equal(costCase(BASIS, { ...IN, minutesPerCard: 0, themeHoursPerYear: 1 }).paybackMonths, null, 'the engine side costs more a year: no payback');
});

test('costCase: each bad input refused with its reason', () => {
  const why = (i) => costCase(BASIS, { ...IN, ...i }).why;
  for (const v of [-1, 1e9 + 1, 2.5, '5', NaN, null, true]) assert.equal(why({ cardsPerYear: v }), 'cards a year: a whole number from 0 to 1,000,000,000', String(v));
  for (const v of [-0.1, 6000.5, '5', NaN, Infinity, null]) assert.equal(why({ minutesPerCard: v }), 'minutes of staff time a card: 0 to 6,000', String(v));
  for (const v of [-0.01, 100000.01, 'x', Infinity]) assert.equal(why({ feePerCard: v }), 'the outside fee a card: 0 to 100,000', String(v));
  for (const v of [-1, 100000.5, 'x']) assert.equal(why({ adoptHours: v }), 'hours to adopt: 0 to 100,000', String(v));
  for (const v of [-1, 100000.5, [1]]) assert.equal(why({ themeHoursPerYear: v }), 'theme hours a year: 0 to 100,000', String(v));
  for (const v of [0, -5, 60000.5, '25', NaN, undefined]) assert.equal(why({ drawMs: v }), 'the draw time measured on this device, in milliseconds: above 0, up to 60,000', String(v));
  assert.equal(costCase(BASIS, {}).why, 'the draw time measured on this device, in milliseconds: above 0, up to 60,000', 'the draw time is measured, never assumed');
  assert.equal(costCase(BASIS, null).ok, false);
  for (const v of [0, 1e6 + 1, 1.5, '1']) assert.equal(why({ drawsPerCard: v }), 'draws a card a year: a whole number from 1 to 1,000,000', String(v));
  for (const v of [0, 11, 2.5, '3']) assert.equal(why({ years: v }), 'years: a whole number from 1 to 10', String(v));
});

test('costCase: refuses a basis missing or spoiling any figure it reads, and never throws', () => {
  const refused = { ok: false, why: 'a sourced basis with every figure the case reads' };
  assert.deepEqual(costCase(null, IN), refused);
  assert.deepEqual(costCase(undefined, IN), refused);
  for (const k of BASIS_KEYS) {
    const b = { ...BASIS }; delete b[k];
    assert.deepEqual(costCase(b, IN), refused, k + ' missing');
    for (const bad of [-1, '19.67', Infinity, NaN, null]) assert.deepEqual(costCase(fig(k, bad), IN), refused, k + ' = ' + String(bad));
    assert.equal(costCase(fig(k, 0), IN).ok, true, k + ' = 0 is a figure');
  }
  const toxic = new Proxy({}, { get() { throw new Error('toxic'); } });
  assert.deepEqual(costCase(BASIS, { get drawMs() { throw new Error('toxic'); } }), { ok: false, why: 'the inputs could not be read' });
  assert.equal(costCase(BASIS, toxic).ok, false);
  assert.doesNotThrow(() => costCase(toxic, IN));
  assert.equal(costCase(toxic, IN).ok, false);
});

test('over: CPI on every year after the first, compounding', () => {
  assert.equal(over(100, 0.1, 1), 100);
  assert.equal(over(100, 0.1, 2), 210);
  assert.equal(over(100, 0.1, 3), 331);
  assert.equal(over(100, 0, 4), 400);
  assert.equal(over(100, 0.1, 0), 0);
});

test('sourcesOf: every figure the case reads, with what it is, its value and where it came from', () => {
  const s = sourcesOf(BASIS);
  assert.deepEqual(s.map((x) => x.key), [...BASIS_KEYS]);
  for (const x of s) { assert.equal(x.value, BASIS[x.key].value); assert.equal(x.what, BASIS[x.key].what); }
  assert.deepEqual(s.filter((x) => x.source).map((x) => x.key), ['wageMedianHourly', 'cpi', 'electricityPencePerKwh', 'laptopExtraWatts']);
  for (const x of s) assert.match(x.source, /^https:\/\//);
  assert.deepEqual(sourcesOf(null), []);
  assert.deepEqual(sourcesOf({}), []);
});

test('verdict: one plain sentence, a saving or a loss said straight', () => {
  assert.equal(verdict(costCase(BASIS, IN), money), 'On these numbers the engine saves GBP14899.83 over 3 years, adoption included.');
  assert.equal(verdict(costCase(BASIS, { ...IN, years: 1 }), money), 'On these numbers the engine saves GBP4602.78 in the first year, adoption included.');
  assert.equal(verdict(costCase(BASIS, { ...IN, cardsPerYear: 0, adoptHours: 0 }), money), 'On these numbers the engine saves GBP0.00 over 3 years, adoption included.');
  assert.equal(verdict(costCase(BASIS, { ...IN, cardsPerYear: 20, minutesPerCard: 5, adoptHours: 40, years: 1 }), money), 'On these numbers the engine costs GBP754.02 more than it saves in the first year; it repays its adoption after 289 months.');
  assert.equal(verdict(costCase(BASIS, { ...IN, cardsPerYear: 0 }), money), 'On these numbers the engine costs GBP314.72 more than it saves over 3 years: your card art costs less today than running it would.');
  assert.equal(verdict(costCase(BASIS, { ...IN, years: 0 }), money), 'Not yet: years: a whole number from 1 to 10.');
});
