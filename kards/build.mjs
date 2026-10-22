// build.mjs - PixelWhisperer Builds: a build is a recipe of cards for a job, and a combo is a build that does more than any of its
// parts alone. Drawn from the build's own record and nothing else, so the same build gives the same picture.
//
// Built by Kar for the PixelWhisperer repo. Powered by the Konomi architecture, created by Thomas Frumkin.
//
// A job is a business's task with a bar to clear (a raid boss is the first kind of job). A build names its kind (a kit, a party,
// a fusion, or a training run that makes a student card), its parts in their roles, and, once measured on cases none of its parts
// learned from, its own GATE. The published rule buildLift says what it adds: its GATE minus the best GATE among its parts. A
// build may be drawn as a combo only when that lift is above zero; one below zero is drawn as an ANTI-COMBO, because parts that
// make each other worse are a lesson too. Which builds are combos is the game's sealed rule (a margin, re-runs from distinct keys);
// the painter only refuses a combo the numbers cannot carry. Every build has a sigil, a rune grown from its recipe (its kind, and
// each part's role and id in order), and a combo has a name grown the same way from two fixed word tables (comboName), never
// typed: the same recipe always makes the same sigil and the same name. The first key to prove a combo is credited on its card by
// that key's face. A card the device does not hold is drawn as "?", never invented. paintJobs draws the job board: each job a note pinned up with its business's icon, its bar and how many
// builds cleared it. Integer arithmetic only, deterministic, total: bad input is { ok: false, why }, never a throw.
import { RARITIES, RAR, PIXEL, THEMES, DATASETS, ICON_ROWS, creatureFront } from './kardart.mjs';
import { GLYPHS, identicon } from './ui.mjs';

const { newCanvas, rect, dot, at, mul, mix, span, div, PAD } = PIXEL;
const no = (why) => ({ ok: false, why });
const HEX = '0123456789abcdef', TITLE = " &'.-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const isObj = (x) => typeof x === 'object' && x !== null && !Array.isArray(x);
const isId = (s) => typeof s === 'string' && s.length === 16 && Array.from(s).every((c) => HEX.includes(c));
const whole = (n, max) => Number.isInteger(n) && n >= 0 && n <= max;
/** The kinds of build, and the roles each takes its parts in. */
export const KINDS = Object.freeze(['kit', 'party', 'fusion', 'training']);
export const ROLES = Object.freeze({ kit: Object.freeze(['lead', 'node', 'tool', 'voice']), party: Object.freeze(['member']), fusion: Object.freeze(['parent']), training: Object.freeze(['data', 'teacher']) });
/** A training run's methods, and the sizes of the student card it makes. */
export const METHODS = Object.freeze(['distil', 'merge', 'tune']);
export const SIZES = Object.freeze(['tiny', 'small', 'base']);
/** The word tables a combo's name is grown from: an adjective and a noun, each picked by the recipe. */
export const COMBO_WORDS = Object.freeze({
  first: Object.freeze(['IRON', 'SILVER', 'GOLDEN', 'SWIFT', 'QUIET', 'BRIGHT', 'HOLLOW', 'ASHEN', 'AMBER', 'COBALT', 'CRIMSON', 'VELVET', 'STORM', 'FROST', 'EMBER', 'NEON', 'LUNAR', 'SOLAR', 'ARCANE', 'PRISM', 'RUNIC', 'SHADOW', 'STEEL', 'JADE', 'ONYX', 'COPPER', 'AZURE', 'SCARLET', 'TWIN', 'WILD', 'NOBLE', 'CLEVER']),
  second: Object.freeze(['WARDEN', 'ORACLE', 'ENGINE', 'CIRCUIT', 'LANTERN', 'COMPASS', 'ANCHOR', 'BEACON', 'CIPHER', 'FORGE', 'HARBOR', 'KESTREL', 'LOOM', 'MERIDIAN', 'NEXUS', 'ORBIT', 'PILOT', 'QUILL', 'RAVEN', 'SENTRY', 'TALON', 'VECTOR', 'WEAVER', 'ZENITH', 'ARROW', 'BRIDGE', 'CROWN', 'DRAKE', 'FALCON', 'GLYPH', 'HELM', 'SIGNAL']),
});
const TAG = { lead: 'LEAD', node: 'NODE', tool: 'TOOL', voice: 'VOX', member: 'ALLY', parent: 'PRNT', data: 'DATA', teacher: 'TCHR' };

function jobOf(job) {   // a job: { set, title?, bar }
  if (!isObj(job)) return no('the job must be an object');
  if (!DATASETS.includes(job.set)) return no('the job set must be one of ' + DATASETS.join(', '));
  const title = job.title === undefined ? '' : job.title;
  if (typeof title !== 'string' || title.length > 24 || !Array.from(title).every((ch) => TITLE.includes(ch))) return no('the job title must be at most 24 characters from A-Z a-z 0-9 space & . - and the apostrophe');
  if (!whole(job.bar, 1010000)) return no('the job bar must be a whole number of millionths from 0 to 1010000');
  return { ok: true, j: { set: job.set, title, bar: job.bar } };
}
function card(p, what) {   // a part or a student: { id, rarity? (none: not held here), gate? }
  if (!isObj(p)) return no(what + ' must be an object');
  if (!isId(p.id)) return no(what + ' id must be 16 lowercase hex characters');
  const held = p.rarity !== undefined, ri = RARITIES.indexOf(p.rarity);
  if (held && ri < 0) return no(what + ' rarity must be one of ' + RARITIES.join(', ') + ' (or none, for a card this device does not hold)');
  if (p.gate !== undefined && !whole(p.gate, 1000000)) return no(what + ' gate must be a whole number of millionths from 0 to 1000000');
  return { ok: true, c: { id: p.id, ri: held ? ri : null, gate: p.gate === undefined ? null : p.gate } };
}

/**
 * Check a build. build: { job: { set (DATASETS), title? (at most 24 of A-Z a-z 0-9 space & ' . -), bar (GATE in millionths, up to
 * 1010000) }, kind (KINDS), parts: [{ id, rarity?, role (ROLES[kind]), gate? }] (1 to 6, each card once), gate?: the build's GATE on
 * the job, held out, cases?: how many held-out cases it was measured on (1 to 999999, with gate), reruns?: distinct keys that
 * re-ran it (0 to 99999), combo?: true when the game's sealed rule makes it a combo (its lift must be above zero), finder?: the
 * Ed25519 public key (64 lowercase hex) of the first key to prove the combo, method? and student?: { id, rarity?, size (SIZES) }
 * (a training run's, and only a training run's), reveal?: true to draw COMBO FOUND (a combo's first showing) }. A kit has one lead; a fusion two parents; a party 2 to 6
 * members; a training run its method and its student, whose GATE is the build's. -> { ok: true, b } | { ok: false, why }
 */
export function checkBuild(x) {
  try {
    if (!isObj(x)) return no('the build must be an object');
    const { job, kind, parts, gate = null, cases = null, combo = false, finder = null, reruns = 0, method = null, student = null, reveal = false } = x;
    const J = jobOf(job);
    if (!J.ok) return J;
    if (!KINDS.includes(kind)) return no('kind must be kit, party, fusion or training');
    if (!Array.isArray(parts) || parts.length < 1 || parts.length > 6) return no('parts must be an array of 1 to 6');
    const ps = [];
    for (const p of parts) {
      const c = card(p, 'a part');
      if (!c.ok) return c;
      if (!ROLES[kind].includes(p.role)) return no('a ' + kind + ' takes parts in the roles ' + ROLES[kind].join(', '));
      if (ps.some((q) => q.id === c.c.id)) return no('a card is in a build once: ' + c.c.id);
      ps.push({ ...c.c, role: p.role });
    }
    const count = (role) => ps.filter((p) => p.role === role).length;
    if (kind === 'kit' && count('lead') !== 1) return no('a kit has one lead');
    if (kind === 'fusion' && ps.length !== 2) return no('a fusion has two parents');
    if (kind === 'party' && ps.length < 2) return no('a party has 2 to 6 members');
    if (gate !== null && !whole(gate, 1000000)) return no('the build gate must be a whole number of millionths from 0 to 1000000');
    if (!whole(reruns, 99999)) return no('reruns must be a whole number from 0 to 99999');
    let S = null;
    if (kind === 'training') {
      if (!METHODS.includes(method)) return no('a training run names its method: distil, merge or tune');
      const c = card(student, 'the student');
      if (!c.ok) return c;
      if (!SIZES.includes(student.size)) return no('the student size must be tiny, small or base');
      if (ps.some((p) => p.id === c.c.id)) return no('the student is a new card, not one of its sources');
      if (c.c.gate !== null) return no('the student gate is the build gate');
      S = { id: c.c.id, ri: c.c.ri, size: student.size };
    } else if (method !== null || student !== null) return no('method and student describe a training run');
    if (cases !== null && (!Number.isInteger(cases) || cases < 1 || cases > 999999)) return no('cases is how many held-out cases it was measured on: a whole number from 1 to 999999');
    if (cases !== null && gate === null) return no('cases count the cases a measured build was scored on');
    if (typeof combo !== 'boolean' || typeof reveal !== 'boolean') return no('combo and reveal must be true or false');
    const L = liftOf(gate, ps);
    if (combo && !(L.lift > 0)) return no('only a build that beats its best part is a combo');
    if (finder !== null && (!combo || typeof finder !== 'string' || finder.length !== 64 || !Array.from(finder).every((ch) => HEX.includes(ch)))) return no('the finder of a combo is its first prover\'s public key: 64 lowercase hex characters');
    if (reveal && !combo) return no('a reveal shows a combo');
    return { ok: true, b: { job: J.j, kind, parts: ps, gate, cases, combo, finder, reruns, method, student: S, reveal, ...L, name: combo ? nameOf(kind, ps) : null } };
  } catch (e) { return no('the build could not be read'); }
}

function liftOf(gate, ps) {   // the best GATE among the parts that carry one, and what the build adds to it
  const gates = ps.map((p) => p.gate).filter((g) => g !== null), best = gates.length ? Math.max(...gates) : null;
  return { best, lift: gate === null || best === null ? null : gate - best };
}

const recipeOf = (kind, ps) => kind + ':' + ps.map((p) => p.role + '=' + p.id).join(',');
function nameOf(kind, ps) {   // two words, each picked by the recipe from its table
  const [, , h] = mixer(recipeOf(kind, ps));
  return COMBO_WORDS.first[h & 31] + ' ' + COMBO_WORDS.second[(h >>> 5) & 31];
}
/** A combo's name, grown from its recipe as its sigil is (never typed): -> { ok: true, name } | { ok: false, why }. Any build has
 *  the name it would carry if it were a combo, so the game can show it once the sealed rule says so. */
export function comboName(x) {
  const c = checkBuild(x);
  return c.ok ? { ok: true, name: nameOf(c.b.kind, c.b.parts) } : c;
}

/** The published rule: what a build adds, its GATE minus the best GATE among its parts (null until both are known), and whether
 *  it clears its job's bar (null until measured). -> { ok: true, lift, best, gate, cleared } | { ok: false, why } */
export function buildLift(x) {
  const c = checkBuild(x);
  if (!c.ok) return c;
  const B = c.b;
  return { ok: true, lift: B.lift, best: B.best, gate: B.gate, cleared: B.gate === null ? null : B.gate >= B.job.bar };
}

function mixer(s) {   // three 32-bit words from a text, every character folded in
  let a = 0x9e3779b9, b = 0x7f4a7c15, c = 0x1b873593;
  for (const ch of Array.from(s)) { const v = ch.charCodeAt(0); a = Math.imul(a ^ v, 0x85ebca6b) >>> 0; b = Math.imul(b ^ a, 0xc2b2ae35) >>> 0; c = Math.imul(c ^ b ^ v, 0x27d4eb2f) >>> 0; }
  return [a, b, c];
}
const HUES = [0xff2bd6, 0x2be8ff, 0xffd23c, 0x7dff8a, 0xff7a3c, 0xa05ae6, 0x3c8cff, 0xff4a6a];
/** A build's sigil: a 16 x 16 rune, the same 8-fold pattern in each eighth, grown from its recipe (kind, and each part's role and
 *  id in order). -> { ok: true, cells: Uint8Array(256) (0 none, 1 ink, 2 accent, 3 edge), colors: [ink, accent, edge] } | { ok: false, why } */
export function buildSigil(x) {
  const c = checkBuild(x);
  if (!c.ok) return c;
  const [a, b, h] = mixer(recipeOf(c.b.kind, c.b.parts));
  const ink = HUES[a & 7], accent = HUES[((a & 7) + 1 + ((a >>> 3) % 7)) & 7], G = new Uint8Array(18 * 18), cells = new Uint8Array(256);
  for (const q of span(0, 64)) {   // one eighth of the rune, read from the words, then mirrored into all eight (on a grid with a blank border)
    const i = q % 8, j = div(q, 8), lo = Math.min(i, j), hi = Math.max(i, j), bit = lo * 8 + hi - div(lo * (lo + 1), 2);   // 0..35 over the triangle
    const on = bit < 32 ? (b >>> bit) & 1 : (h >>> (bit - 32)) & 1, v = on ? 1 + ((h >>> (bit % 28)) & 1) : 0;
    for (const [x, y] of [[i, j], [15 - i, j], [i, 15 - j], [15 - i, 15 - j]]) G[(y + 1) * 18 + x + 1] = v;
  }
  for (const q of span(0, 256)) {   // each cell as grown, and an edge round the rune wherever an empty cell touches it
    const g = (q % 16 + 1) + (div(q, 16) + 1) * 18;
    cells[q] = G[g] || ([G[g - 1], G[g + 1], G[g - 18], G[g + 18]].some(Boolean) ? 3 : 0);
  }
  return { ok: true, cells, colors: [ink, accent, mul(ink, 90)] };
}

// how each theme dresses a build card: the field, the frame, the panel, the lettering (the pocket screen's shades come last)
const LOOKS = {
  'synthwave-v1': { field: [0x0a0420, 0x3a0d5e], frame: 0xb04ae0, panel: 0x120626, text: 0xffffff, shadow: 0x4a1480, dim: 0xbba9e8, wire: 0x2be8ff, good: 0x7dff8a, bad: 0xff5a5a },
  'blockcraft-v1': { field: [0x56a0fa, 0xc6e6ff], frame: 0x8a5a33, panel: 0x32323a, text: 0xffffff, shadow: 0x14141a, dim: 0xd8dce4, wire: 0x2be8ff, good: 0x7dff8a, bad: 0xff5a3c },
  'lcd-v1': { field: [0xd8dccf, 0x9aa095], frame: 0x0f1210, panel: 0x0f1210, text: 0xd8dccf, shadow: 0x0f1210, dim: 0x9aa095, wire: 0x0f1210, good: 0xd8dccf, bad: 0x9aa095, lcd: [0x0f1210, 0x4a5048, 0x9aa095, 0xd8dccf] },
  'memphis-v1': { field: [0xffe14a, 0xffe14a], frame: 0x111111, panel: 0x1b1740, text: 0xffffff, shadow: 0x111111, dim: 0xffe14a, wire: 0x111111, good: 0x7dff8a, bad: 0xff4fa3 },
  'blueprint-v1': { field: [0x0e3b78, 0x0e3b78], frame: 0x3468b0, panel: 0x061a38, text: 0xeef5ff, shadow: 0x061a38, dim: 0x9cc3f0, wire: 0x9cc3f0, good: 0x9cc3f0, bad: 0xeef5ff, ramp: [0x0e3b78, 0x3468b0, 0x9cc3f0, 0xeef5ff] },
};
const inked = (L, c) => (L.ramp ? L.ramp[(((c >> 16) & 255) * 77 + ((c >> 8) & 255) * 150 + (c & 255) * 29) >> 14] : c);
const GOLD = [0xffd23c, 0x8a6214];
const fmt = (n) => div(n, 1000000) + '.' + String(10000 + div(n % 1000000, 100)).slice(1);   // millionths as 0.0000
const LW = 192, LH = 280;

function letters(cv, s, x, y, c, sh, k = 1) {
  for (const [col, off] of [[sh, k], [c, 0]]) Array.from(s).forEach((ch, n) => (GLYPHS[ch] || GLYPHS[' ']).forEach((row, r) => Array.from(row).forEach((cell, q) => { if (cell === '#') rect(cv, x + (n * 6 + q) * k + off, y + r * k + off, k, k, col); })));
}
const width = (s, k = 1) => (s.length * 6 - 1) * k;
const centred = (cv, s, cx, y, c, sh, k = 1) => letters(cv, s, cx - div(width(s, k), 2), y, c, sh, k);
const voxel = (fr, q) => (fr.px[q * 4] << 16) | (fr.px[q * 4 + 1] << 8) | fr.px[q * 4 + 2];

function kardling(cv, L, p, cx, foot, k) {   // a part on the platform: its Kardling at k px a voxel, or a dashed "?" for a card not held here
  const x0 = cx - div(9 * k, 2), y0 = foot - 14 * k;
  if (p.ri === null) {
    for (const q of span(0, 9 * k, 2)) { dot(cv, x0 + q, y0, L.dim); dot(cv, x0 + q, foot - 1, L.dim); }
    for (const q of span(0, 14 * k, 2)) { dot(cv, x0, y0 + q, L.dim); dot(cv, x0 + 9 * k - 1, y0 + q, L.dim); }
    centred(cv, '?', cx, y0 + div(14 * k, 2) - 4, L.text, L.shadow);
    return;
  }
  const fr = creatureFront(p.id);
  rect(cv, x0 - 1, foot, 9 * k + 2, 2, RAR[p.ri].hi);   // its rarity, as the ground it stands on
  for (const q of span(0, 126)) if (fr.px[q * 4 + 3]) rect(cv, x0 + (q % 9) * k, y0 + div(q, 9) * k, k, k, inked(L, voxel(fr, q)));
}

/**
 * Draw a build card. build as checkBuild takes it; themeId one of THEMES; w, h whole numbers from 64 to 1024 (a Kardlings card:
 * 384 x 560). The card is 192 x 280 logical pixels, scaled to the nearest pixel. -> { ok: true, px } | { ok: false, why }. Never throws.
 */
export function paintBuild(build, themeId, w, h) {
  try {
    const c = checkBuild(build);
    if (!c.ok) return c;
    if (typeof themeId !== 'string' || !Object.prototype.hasOwnProperty.call(THEMES, themeId)) return no('unknown theme');
    if (!Number.isInteger(w) || !Number.isInteger(h) || w < 64 || h < 64 || w > 1024 || h > 1024) return no('width and height must be whole numbers from 64 to 1024');
    const B = c.b, L = LOOKS[themeId], cv = newCanvas(LW, LH), frame = B.combo ? GOLD[0] : L.frame;
    for (const y of span(0, LH)) rect(cv, 0, y, LW, 1, mix(L.field[0], L.field[1], div(y * 256, LH)));
    for (const i of span(0, 3)) { rect(cv, i, i, LW - 2 * i, 1, frame); rect(cv, i, LH - 1 - i, LW - 2 * i, 1, frame); rect(cv, i, i, 1, LH - 2 * i, frame); rect(cv, LW - 1 - i, i, 1, LH - 2 * i, frame); }

    // the sigil, in its medallion; a reveal sets it in rays of gold
    const S = buildSigil(build), cx = 96, cy = 66;
    if (B.reveal) for (const t of span(0, 16)) { const dx = [0, 2, 4, 6, 8, 6, 4, 2, 0, -2, -4, -6, -8, -6, -4, -2][t], dy = [-8, -6, -4, -2, 0, 2, 4, 6, 8, 6, 4, 2, 0, -2, -4, -6][t]; for (const s of span(4, 8)) rect(cv, cx + dx * s, cy + dy * s, 2, 2, GOLD[t % 2]); }
    rect(cv, cx - 28, cy - 28, 56, 56, frame); rect(cv, cx - 26, cy - 26, 52, 52, L.panel);

    ICON_ROWS[B.job.set].forEach((row, y) => Array.from(row).forEach((cell, x) => { if (cell === '#') rect(cv, 14 + x * 2, 50 + y * 2, 2, 2, L.dim); }));   // the job's business, beside the sigil

    // the head, on its own band of the field (the rays shine round the medallion, not through the lettering): the kind, the job
    for (const y of span(3, 35)) rect(cv, 3, y, LW - 6, 1, mix(L.field[0], L.field[1], div(y * 256, LH)));
    centred(cv, B.reveal ? 'COMBO FOUND' : B.kind.toUpperCase() + ' BUILD', 96, 7, B.reveal ? GOLD[0] : L.text, L.shadow, 2);
    centred(cv, (B.job.title || B.job.set).toUpperCase(), 96, 25, L.dim, L.shadow);
    for (const q of span(0, 256)) if (S.cells[q]) rect(cv, cx - 24 + (q % 16) * 3, cy - 24 + div(q, 16) * 3, 3, 3, inked(L, S.colors[S.cells[q] - 1]));

    // the parts on one platform, joined by a wire, each with its role; a training run's sources make the student on the right
    const foot = 152, src = B.parts, n = src.length, span1 = B.kind === 'training' ? 112 : 176, gap = div(span1, n), k = n > 4 ? 2 : 3;
    rect(cv, 8, foot + 2, B.kind === 'training' ? span1 : LW - 16, 3, mul(L.frame, 140));
    const xs = src.map((p, j) => 8 + gap * j + div(gap, 2));
    rect(cv, xs[0], foot - 14 * k - 4, xs[n - 1] - xs[0] + 1, 1, L.wire);
    src.forEach((p, j) => {
      rect(cv, xs[j], foot - 14 * k - 4, 1, 4, L.wire);
      kardling(cv, L, p, xs[j], foot, k);
      centred(cv, TAG[p.role], xs[j], foot + 7, L.dim, L.shadow);
    });
    if (B.kind === 'training') {
      centred(cv, '\u2192', 130, foot - 24, GOLD[0], L.shadow, 2);
      centred(cv, B.method.toUpperCase(), 128, foot + 7, L.dim, L.shadow);
      kardling(cv, L, B.student, 166, foot, 3);
      centred(cv, B.student.size.toUpperCase(), 166, foot + 7, L.text, L.shadow);
    }

    // the numbers: what it adds, against what, the bar, and how many keys re-ran it
    const y0 = 172;
    rect(cv, 8, y0, LW - 16, 74, L.panel);
    const lift = B.lift, liftText = lift === null ? (B.gate === null ? 'NOT MEASURED' : 'LIFT -') : 'LIFT ' + (lift < 0 ? '-' : '+') + fmt(Math.abs(lift));
    centred(cv, liftText, 96, y0 + 5, lift === null ? L.dim : lift > 0 ? L.good : lift < 0 ? L.bad : L.text, L.shadow, 2);
    if (B.gate !== null) centred(cv, 'BUILD ' + fmt(B.gate) + (B.best === null ? '' : ' \u00b7 BEST ' + fmt(B.best)), 96, y0 + 24, L.text, L.shadow);
    const cleared = B.gate !== null && B.gate >= B.job.bar;
    centred(cv, 'BAR ' + fmt(B.job.bar) + (B.gate === null ? '' : cleared ? ' \u2713 CLEARED' : ' \u2717 SHORT'), 96, y0 + 35, B.gate === null ? L.dim : cleared ? L.good : L.bad, L.shadow);
    if (B.cases !== null) centred(cv, 'ON ' + B.cases + ' HELD-OUT CASES', 96, y0 + 46, L.dim, L.shadow);
    centred(cv, 'RE-RUN BY ' + B.reruns + (B.reruns === 1 ? ' KEY' : ' KEYS'), 96, y0 + 57, L.dim, L.shadow);

    // its name, as a combo, with its finder's face; or the lesson of an anti-combo
    if (B.combo) {
      rect(cv, 6, 252, LW - 12, 18, GOLD[0]); rect(cv, 6, 252, LW - 12, 1, 0xffffff); rect(cv, 6, 269, LW - 12, 1, GOLD[1]);
      centred(cv, 'COMBO \u00b7 ' + B.name, B.finder ? 102 : 96, 257, 0xffffff, GOLD[1]);
      if (B.finder) { const f = identicon(B.finder, 1); for (const q of span(0, 100)) dot(cv, 11 + (q % 10), 256 + div(q, 10), inked(L, (f.px[q * 3] << 16) | (f.px[q * 3 + 1] << 8) | f.px[q * 3 + 2])); }
    }
    else if (lift !== null && lift < 0) { rect(cv, 6, 252, LW - 12, 18, 0x7a1020); centred(cv, 'ANTI-COMBO', 96, 257, 0xffd0d0, 0x3a0810); }

    if (L.lcd) for (const y of span(0, LH)) for (const x of span(0, LW)) {   // the pocket screen: every pixel one of its four shades
      const q = at(cv, x, y);
      dot(cv, x, y, L.lcd[(((q >> 16) & 255) * 77 + ((q >> 8) & 255) * 150 + (q & 255) * 29) >> 14]);
    }
    const px = new Uint8Array(w * h * 3), cols = span(0, w).map((x) => div(x * LW, w));
    span(0, h).forEach((y) => {
      const row = (div(y * LH, h) + PAD) * cv.cw + PAD;
      cols.forEach((cxx, x) => { const q = cv.d[row + cxx], o = (y * w + x) * 3; px[o] = q >> 16; px[o + 1] = (q >> 8) & 255; px[o + 2] = q & 255; });
    });
    return { ok: true, px };
  } catch (e) { return no('the build could not be painted'); }
}

/**
 * Check a job board. board: { jobs: [{ set (DATASETS), title? (as a job's), bar, cleared: true | false, builds: how many builds
 * cleared it (0 to 99999) }] (1 to 9) }. -> { ok: true, jobs } | { ok: false, why }
 */
export function checkJobs(x) {
  try {
    if (!isObj(x) || !Array.isArray(x.jobs) || x.jobs.length < 1 || x.jobs.length > 9) return no('the board holds 1 to 9 jobs: { jobs: [...] }');
    const out = [];
    for (const j of x.jobs) {
      if (!isObj(j)) return no('every job must be an object');
      const c = jobOf(j);
      if (!c.ok) return c;
      if (typeof j.cleared !== 'boolean') return no('a job cleared is true or false');
      if (!whole(j.builds, 99999)) return no('a job builds is a whole number from 0 to 99999');
      if (j.cleared !== j.builds > 0) return no('a job is cleared exactly when a build has cleared it');
      out.push({ ...c.j, cleared: j.cleared, builds: j.builds });
    }
    return { ok: true, jobs: out };
  } catch (e) { return no('the board could not be read'); }
}

/**
 * Draw the job board: each job a note pinned up, with its business's icon, its name, its bar and how many builds cleared it, a
 * cleared one stamped. board as checkJobs takes it; themeId; w, h whole numbers from 64 to 2048. The board is 240 x 160 logical
 * pixels at the largest whole scale that fits, centred, the space round it the board's own. -> { ok: true, px, scale } | { ok: false, why }
 */
export function paintJobs(board, themeId, w, h) {
  try {
    const c = checkJobs(board);
    if (!c.ok) return c;
    if (typeof themeId !== 'string' || !Object.prototype.hasOwnProperty.call(THEMES, themeId)) return no('unknown theme');
    if (!whole(w, 2048) || !whole(h, 2048) || w < 64 || h < 64) return no('width and height must be whole numbers from 64 to 2048');
    const L = LOOKS[themeId], cv = newCanvas(240, 160), wood = mul(L.frame, 170), cork = mix(L.panel, 0xb07a40, 140);
    rect(cv, 0, 0, 240, 160, mul(wood, 120)); rect(cv, 1, 1, 238, 158, wood); rect(cv, 4, 16, 232, 140, cork);
    centred(cv, 'THE JOB BOARD', 120, 4, L.text, L.shadow);
    c.jobs.forEach((j, m) => {   // three to a row: a note 72 x 42, pinned at its top
      const x0 = 8 + (m % 3) * 76, y0 = 20 + div(m, 3) * 46, paper = j.cleared ? 0xf4e8c0 : 0xfff8e0, ink = 0x2a2018;
      rect(cv, x0 + 2, y0 + 2, 72, 42, mul(cork, 150)); rect(cv, x0, y0, 72, 42, paper);
      rect(cv, x0 + 34, y0 - 1, 4, 4, 0xdc3c32); dot(cv, x0 + 35, y0, 0xff8080);   // the pin
      ICON_ROWS[j.set].forEach((row, y) => Array.from(row).forEach((cell, x) => { if (cell === '#') dot(cv, x0 + 3 + x, y0 + 4 + y, ink); }));   // its business, top left
      const name = (j.title || j.set).toUpperCase(), short = name.length > 8 ? name.slice(0, 7) + '\u2026' : name;
      letters(cv, short, x0 + 22, y0 + 8, ink, paper);
      letters(cv, 'BAR ' + fmt(j.bar), x0 + 3, y0 + 22, ink, paper);
      letters(cv, j.builds + (j.builds === 1 ? ' BUILD' : ' BUILDS'), x0 + 3, y0 + 32, mul(ink, 200), paper);
      if (j.cleared) { rect(cv, x0 + 58, y0 + 30, 12, 10, 0x2a9d4a); centred(cv, '\u2713', x0 + 64, y0 + 31, 0xffffff, 0x1a6f3a); }
    });
    if (L.ramp) for (const y of span(0, 160)) for (const x of span(0, 240)) dot(cv, x, y, inked(L, at(cv, x, y)));
    if (L.lcd) for (const y of span(0, 160)) for (const x of span(0, 240)) { const q = at(cv, x, y); dot(cv, x, y, L.lcd[(((q >> 16) & 255) * 77 + ((q >> 8) & 255) * 150 + (q & 255) * 29) >> 14]); }
    const k = Math.max(1, Math.min(div(w, 240), div(h, 160))), ox = div(w - 240 * k, 2), oy = div(h - 160 * k, 2), px = new Uint8Array(w * h * 3), edge = at(cv, 1, 1);
    span(0, h).forEach((y) => span(0, w).forEach((x) => {   // the board in the middle, its outline round it; beyond, the wall in its wood
      const lx = div(x - ox, k), ly = div(y - oy, k), q = lx >= 0 && ly >= 0 && lx < 240 && ly < 160 ? cv.d[(ly + PAD) * cv.cw + lx + PAD] : edge, o = (y * w + x) * 3;
      px[o] = q >> 16; px[o + 1] = (q >> 8) & 255; px[o + 2] = q & 255;
    }));
    return { ok: true, px, scale: k };
  } catch (e) { return no('the board could not be painted'); }
}
