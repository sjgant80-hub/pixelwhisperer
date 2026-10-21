// costcase.test.mjs - the cost case is exact arithmetic on the reader's own numbers, and refuses everything else.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { costCase, verdict } from './costcase.mjs';

const GOOD = { cards: 10000, perCard: 250, hours: 16, rate: 60 };
const refused = (r, why) => { assert.equal(r.ok, false); assert.equal(typeof r.why, 'string'); if (why) assert.match(r.why, why); };

test('the arithmetic is exact: a year of art, the one-off adoption, the first-year saving, the payback in cards', () => {
  assert.deepEqual(costCase(GOOD), { ok: true, today: 2500000, adoption: 96000, saving: 2404000, payback: 384 });
  assert.deepEqual(costCase({ cards: 0, perCard: 250, hours: 0, rate: 0 }), { ok: true, today: 0, adoption: 0, saving: 0, payback: 0 });
  assert.deepEqual(costCase({ cards: 1, perCard: 1, hours: 1, rate: 1 }), { ok: true, today: 1, adoption: 100, saving: -99, payback: 100 });   // it can lose: a negative saving is shown, not hidden
  assert.deepEqual(costCase({ cards: 100, perCard: 0, hours: 5, rate: 40 }), { ok: true, today: 0, adoption: 20000, saving: -20000, payback: null });   // free art today: there is nothing to pay back
  assert.equal(costCase({ cards: 1000, perCard: 7, hours: 1, rate: 1 }).payback, 15);   // 100 / 7 rounds UP: 14 cards would not repay it
  assert.equal(costCase({ cards: 1000, perCard: 100, hours: 1, rate: 1 }).payback, 1);  // an exact division is not rounded up
  assert.equal(costCase({ cards: 1000, perCard: 5, hours: 1, rate: 1 }).payback, 20);
  assert.equal(costCase({ cards: 1000, perCard: 3, hours: 2, rate: 1 }).payback, 67);   // 200 / 3 = 66.67 -> 67
});

test('the limits are exact and the largest inputs stay whole numbers', () => {
  const big = costCase({ cards: 1000000000, perCard: 1000000, hours: 100000, rate: 100000 });
  assert.deepEqual(big, { ok: true, today: 1e15, adoption: 1e12, saving: 1e15 - 1e12, payback: 1000000 });
  assert.ok(Number.isSafeInteger(big.today) && Number.isSafeInteger(big.saving));
  for (const [k, max] of [['cards', 1000000000], ['perCard', 1000000], ['hours', 100000], ['rate', 100000]]) {
    assert.equal(costCase({ ...GOOD, [k]: 0 }).ok, true, k + ' 0');
    assert.equal(costCase({ ...GOOD, [k]: max }).ok, true, k + ' max');
    refused(costCase({ ...GOOD, [k]: max + 1 }));
    refused(costCase({ ...GOOD, [k]: -1 }));
  }
});

test('anything that is not whole numbers is refused with the field named, never thrown', () => {
  for (const [k, why] of [['cards', /cards/], ['perCard', /cost per card/], ['hours', /hours/], ['rate', /per hour/]]) {
    for (const bad of [1.5, -1, NaN, Infinity, '5', '', null, undefined, true, [5], 5n, {}, () => 5]) refused(costCase({ ...GOOD, [k]: bad }), why);
    const missing = { ...GOOD }; delete missing[k];
    refused(costCase(missing), why);
  }
  for (const x of [null, undefined, 5, 'x', true, 5n, () => {}, Symbol('s')]) refused(costCase(x), /give/);
  const toxic = { get cards() { throw new Error('toxic'); }, perCard: 1, hours: 1, rate: 1 };
  refused(costCase(toxic), /could not be read/);
  assert.doesNotThrow(() => costCase(new Proxy({}, { get() { throw new Error('toxic'); } })));
  assert.equal(costCase([]).ok, false);
});

test('the sentence says what the numbers say: a saving, a loss with its payback, free art, and a refusal', () => {
  const money = (n) => 'M' + n, count = (n) => 'C' + n;
  assert.equal(verdict(costCase(GOOD), money, count), 'On these numbers the first year saves M2404000.');
  assert.equal(verdict(costCase({ cards: 0, perCard: 250, hours: 0, rate: 0 }), money, count), 'On these numbers the first year saves M0.');   // exactly nothing is still not a loss
  assert.equal(verdict(costCase({ cards: 5, perCard: 1, hours: 16, rate: 60 }), money, count), 'On these numbers the first year costs M95995 more than it saves; it repays after C96000 cards.');
  assert.equal(verdict(costCase({ cards: 10000, perCard: 0, hours: 16, rate: 60 }), money, count), 'On these numbers the first year costs M96000 more than it saves: art is free today, so there is nothing to repay.');
  assert.equal(verdict(costCase({ ...GOOD, cards: -1 }), money, count), 'Not yet: cards a year must be a whole number from 0 to 1,000,000,000.');
  assert.equal(verdict({ ok: true, saving: -1, payback: 0 }, money, count), 'On these numbers the first year costs M1 more than it saves; it repays after C0 cards.');   // a payback of 0 is a number, not "free"
});
