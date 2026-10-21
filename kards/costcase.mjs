// costcase.mjs - the cost case for adopting the card art engine, computed from YOUR numbers. Whole numbers only (money in minor
// units: pence or cents), total (bad input is { ok: false, why }), and it holds no price of ours: every figure that comes out is
// arithmetic on the four numbers that go in. The engine itself draws on the reader's own device, so its marginal cost per card is 0.
const no = (why) => ({ ok: false, why });
const whole = (n, max) => Number.isInteger(n) && n >= 0 && n <= max;

/**
 * { cards: cards a year, perCard: what one card's art costs you today (minor units), hours: hours to adopt, rate: cost of an hour (whole major units) }
 * -> { ok: true, today (a year's art, minor units), adoption (one-off, minor units), saving (first year, may be negative), payback (cards until adoption is repaid, null if art is free today) } | { ok: false, why }
 */
export function costCase(x) {
  try {
    if (typeof x !== 'object' || x === null) return no('give { cards, perCard, hours, rate }');
    const { cards, perCard, hours, rate } = x;
    if (!whole(cards, 1000000000)) return no('cards a year must be a whole number from 0 to 1,000,000,000');
    if (!whole(perCard, 1000000)) return no('cost per card must be a whole number of pence or cents from 0 to 1,000,000');
    if (!whole(hours, 100000)) return no('hours to adopt must be a whole number from 0 to 100,000');
    if (!whole(rate, 100000)) return no('cost per hour must be a whole number from 0 to 100,000');
    const today = cards * perCard, adoption = hours * rate * 100;
    return { ok: true, today, adoption, saving: today - adoption, payback: perCard > 0 ? Math.floor((adoption + perCard - 1) / perCard) : null };
  } catch (e) { return no('the numbers could not be read'); }
}

/** One plain sentence for a result of costCase. money and count format minor units and cards for the reader's locale. */
export function verdict(r, money, count) {
  if (!r.ok) return 'Not yet: ' + r.why + '.';
  if (r.saving >= 0) return 'On these numbers the first year saves ' + money(r.saving) + '.';
  return 'On these numbers the first year costs ' + money(-r.saving) + ' more than it saves' + (r.payback === null ? ': art is free today, so there is nothing to repay.' : '; it repays after ' + count(r.payback) + ' cards.');
}
