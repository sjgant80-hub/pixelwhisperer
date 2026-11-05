// costcase.mjs - the cost case for card art, for the page's "For the people who decide" brochure: what a year of card art costs a
// team today, and what it costs once every card's face is drawn by the engine. Every external figure is read from the vendored,
// sourced basis (kards/vendor/basis.json, through kards/basis.mjs); the counts, minutes, hours and fees are the reader's own, and
// the draw time is measured on the reader's own device. Floors, never top ends: staff time at the UK median hourly wage with
// employer on-costs left out; CPI applied to every later year on both sides. Like for like: the same team designs on both sides
// (theme hours stay on the engine's side), and the engine's only running cost is the electricity of drawing on a device already
// in use. No price of ours appears here: these are the buyer's own costs. Pure, total, deterministic: garbage in gives
// { ok: false, why }, never a throw.

export const DEFAULTS = Object.freeze({ cardsPerYear: 1000, minutesPerCard: 15, feePerCard: 0, adoptHours: 16, themeHoursPerYear: 0, drawsPerCard: 1, years: 3 });
export const BASIS_KEYS = Object.freeze(['wageMedianHourly', 'cpi', 'electricityPencePerKwh', 'laptopExtraWatts']);

const isNum = (x) => typeof x === 'number' && Number.isFinite(x) && x >= 0;
const within = (x, top) => isNum(x) && x <= top;
const whole = (x, lo, top) => Number.isInteger(x) && x >= lo && x <= top;
const r2 = (x) => Math.round(x * 100) / 100;
const r4 = (x) => Math.round(x * 10000) / 10000;
const r6 = (x) => Math.round(x * 1000000) / 1000000;

/** the basis figures the case reads, each a sourced number; null when one is missing or unreadable */
function figures(basis) {
  const b = basis || {}, f = (k) => b[k] || {};
  const out = { wage: f('wageMedianHourly').value, cpi: f('cpi').value, pence: f('electricityPencePerKwh').value, watts: f('laptopExtraWatts').value };
  return Object.values(out).every(isNum) ? out : null;
}

/** where each figure came from, for the page to list beside the numbers: [{ key, what, value, source }] */
export function sourcesOf(basis) {
  try { return BASIS_KEYS.map((k) => ({ key: k, what: basis[k].what, value: basis[k].value, source: basis[k].source })); } catch { return []; }
}

/** a yearly cost carried over `years`, rising by CPI each year after the first */
export function over(perYear, cpi, years) {
  let total = 0, factor = 1;
  for (let y = 0; y < years; y++) { total += perYear * factor; factor *= 1 + cpi; }
  return r2(total);
}

/**
 * The case. input: { cardsPerYear (whole, 0 to 1e9), minutesPerCard (staff minutes each card's art takes today, 0 to 6000),
 * feePerCard (what you pay outside for each card's art, GBP, 0 to 100000), adoptHours (one-off, 0 to 100000), themeHoursPerYear
 * (staff hours a year designing new themes, 0 if you use the published ones, 0 to 100000), drawMs (one face's draw time measured on
 * this device, above 0 to 60000: required), drawsPerCard (times each card is drawn in a year, whole, 1 to 1e6), years (whole, 1 to 10) },
 * every field but drawMs optional (DEFAULTS above). -> { ok: true, inputs, lines, perYear, over, adopt, hoursOff, savingFirstYear,
 * savingOver, paybackMonths } | { ok: false, why }
 */
export function costCase(basis, input) {
  try {
    const f = figures(basis);
    if (!f) return { ok: false, why: 'a sourced basis with every figure the case reads' };
    const i = { ...DEFAULTS, ...(input || {}) };
    if (!whole(i.cardsPerYear, 0, 1e9)) return { ok: false, why: 'cards a year: a whole number from 0 to 1,000,000,000' };
    if (!within(i.minutesPerCard, 6000)) return { ok: false, why: 'minutes of staff time a card: 0 to 6,000' };
    if (!within(i.feePerCard, 100000)) return { ok: false, why: 'the outside fee a card: 0 to 100,000' };
    if (!within(i.adoptHours, 100000)) return { ok: false, why: 'hours to adopt: 0 to 100,000' };
    if (!within(i.themeHoursPerYear, 100000)) return { ok: false, why: 'theme hours a year: 0 to 100,000' };
    if (!within(i.drawMs, 60000) || i.drawMs === 0) return { ok: false, why: 'the draw time measured on this device, in milliseconds: above 0, up to 60,000' };
    if (!whole(i.drawsPerCard, 1, 1e6)) return { ok: false, why: 'draws a card a year: a whole number from 1 to 1,000,000' };
    if (!whole(i.years, 1, 10)) return { ok: false, why: 'years: a whole number from 1 to 10' };
    const staffHours = i.cardsPerYear * i.minutesPerCard / 60;                                   // the art, in staff time, a year
    const staff = staffHours * f.wage;
    const fees = i.cardsPerYear * i.feePerCard;                                                  // what goes outside for it, a year
    const themes = i.themeHoursPerYear * f.wage;                                                 // the engine's side: the team still designs themes
    const kwh = i.cardsPerYear * i.drawsPerCard * i.drawMs / 3600000 * f.watts / 1000;           // every draw, on a device already in use
    const power = kwh * f.pence / 100;
    const adopt = i.adoptHours * f.wage;                                                         // one-off, in the first year
    const perYear = { today: r2(staff + fees), engine: r2(themes + power) };
    const total = { today: over(staff + fees, f.cpi, i.years), engine: over(themes + power, f.cpi, i.years) };
    const yearly = staff + fees - themes - power;
    return {
      ok: true, inputs: i,
      lines: { staff: r2(staff), fees: r2(fees), themes: r2(themes), kwh: r6(kwh), powerPence: r4(power * 100) },
      perYear, over: total, adopt: r2(adopt), hoursOff: r2(staffHours - i.themeHoursPerYear),
      savingFirstYear: r2(yearly - adopt), savingOver: r2(total.today - total.engine - adopt),
      paybackMonths: yearly > 0 ? Math.ceil(adopt * 12 / yearly) : null,
    };
  } catch { return { ok: false, why: 'the inputs could not be read' }; }
}

/** One plain sentence for a result of costCase. money formats pounds for the reader's locale. */
export function verdict(r, money) {
  if (!r.ok) return 'Not yet: ' + r.why + '.';
  const y = r.inputs.years, span = y === 1 ? 'in the first year' : 'over ' + y + ' years';
  if (r.savingOver >= 0) return 'On these numbers the engine saves ' + money(r.savingOver) + ' ' + span + ', adoption included.';
  return 'On these numbers the engine costs ' + money(-r.savingOver) + ' more than it saves ' + span + (r.paybackMonths === null ? ': your card art costs less today than running it would.' : '; it repays its adoption after ' + r.paybackMonths + ' months.');
}

export default { DEFAULTS, BASIS_KEYS, sourcesOf, over, costCase, verdict };
