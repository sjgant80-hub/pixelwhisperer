// page.test.mjs - the live page's own gate (the "ui-gate" in miniature): no dead controls, no broken links or imports, nothing
// loaded from anywhere else, every control named. Run with: node --test kards/page.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { hiddenSpans } from '../witness-kards.mjs';
import { mutants } from '../.witness/witness.mjs';

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));

test('the page: every id the script reaches for exists, every link and label lands', () => {
  const reached = [...html.matchAll(/\$\('#([\w-]+)'\)/g)].map((m) => m[1]);
  assert.ok(reached.length > 20);
  for (const id of reached) assert.ok(ids.has(id), 'the script reaches for #' + id);
  for (const m of html.matchAll(/href="#([\w-]+)"/g)) assert.ok(ids.has(m[1]), 'a link to #' + m[1]);
  for (const m of html.matchAll(/<label for="([\w-]+)"/g)) assert.ok(ids.has(m[1]), 'a label for ' + m[1]);
  for (const m of html.matchAll(/aria-labelledby="([\w-]+)"/g)) assert.ok(ids.has(m[1]), 'aria-labelledby ' + m[1]);
  assert.equal(ids.size, [...html.matchAll(/\bid="([^"]+)"/g)].length, 'no id is used twice');
});

test('the page: every form control has a label, every button and canvas a name', () => {
  for (const m of html.matchAll(/<(?:input|select)[^>]*\bid="([\w-]+)"/g)) assert.ok(html.includes('for="' + m[1] + '"'), 'control ' + m[1] + ' has a label');
  for (const m of html.matchAll(/<button([^>]*)>([\s\S]*?)<\/button>/g)) assert.ok(m[2].replace(/<[^>]*>/g, '').trim().length > 0 || /aria-label=/.test(m[1]), 'a button with no name: ' + m[0].slice(0, 60));
  for (const m of html.matchAll(/<canvas([^>]*)>/g)) assert.ok(/aria-label=/.test(m[1]), 'a canvas with no description');
  assert.ok(/<html lang="en">/.test(html) && /name="viewport"/.test(html) && /<title>[^<]{10,}<\/title>/.test(html) && /name="description"/.test(html));
});

test('the page: its imports exist, and it loads nothing from anywhere else', () => {
  const imports = [...html.matchAll(/from '\.\/([\w.-]+)'/g)].map((m) => m[1]);
  assert.deepEqual(imports.sort(), ['arena.mjs', 'back.mjs', 'costcase.mjs', 'estate.mjs', 'fusion.mjs', 'gear.mjs', 'kardart.mjs', 'kardart.pins.mjs', 'kardpng.mjs', 'raid.mjs', 'samples.mjs', 'ui.mjs']);
  for (const f of imports) assert.ok(existsSync(new URL('./' + f, import.meta.url)), f + ' exists');
  assert.ok(/<link rel="stylesheet" href="fonts\/pixelwhisperer\.css">/.test(html) && existsSync(new URL('./fonts/pixelwhisperer.css', import.meta.url)) && existsSync(new URL('./fonts/PixelWhisperer.ttf', import.meta.url)), 'the font is served from this site');
  assert.equal(/<(?:script|link|img|iframe|source|video|audio)[^>]+(?:src|href)="(?:https?:)?\/\//.test(html), false, 'no external resource');
  assert.equal(/@import|url\(\s*['"]?(?:https?:)?\/\//.test(html), false, 'no external stylesheet resource');
  assert.equal(/\bfetch\(|XMLHttpRequest|sendBeacon|WebSocket/.test(html), false, 'it talks to nobody');
});

test('every code sample on the page imports names its module really exports (a dead sample is a dead control)', async () => {
  const samples = [...html.matchAll(/import \{([^}]+)\} from '\.\/kards\/([\w.-]+)'/g)];
  assert.ok(samples.length >= 3, 'the samples are found');
  for (const [, names, file] of samples) {
    const mod = await import('./' + file);
    for (const n of names.split(',').map((s) => s.trim())) assert.ok(Object.prototype.hasOwnProperty.call(mod, n), file + ' exports ' + n);
  }
});

test('the page says what it must: what it is, start here, how it works, blueprint, adoption, proof, limits', () => {
  for (const id of ['gallery', 'workshop', 'backs', 'back-canvas', 'back-row', 'fusion', 'fusion-canvas', 'lineage-canvas', 'fusion-stats', 'items', 'item-canvas', 'gear', 'arena', 'arena-canvas', 'raids', 'raid-canvas', 'bosses', 'start', 'how', 'blueprint', 'decide', 'adoption', 'proof', 'limits', 'estate', 'ui', 'estate-canvas', 'font-sample', 'icons', 'key-face', 'cost-form', 'cost-out', 'cost-msg', 'c-cards', 'c-percard', 'c-hours', 'c-rate']) assert.ok(ids.has(id), 'section #' + id);
  for (const word of ['paintArt', 'append-only', 'integer', 'witness', 'synthwave-v1', 'THEME_IDS', 'Thomas Frumkin', 'Kar', 'CEO', 'CFO', 'COO', 'CTO and CISO', 'The cost case', 'Risks, answered straight', 'The case for the board', 'Security, data protection and compliance', 'Support and ownership', 'Deployment and roll-out']) assert.ok(html.includes(word), word);
  assert.equal(html.toLowerCase().includes('mine' + 'craft'), false, 'the trademark is not used');
});

test('the witness can see all the code: no quote hides lines from it', () => {
  for (const f of ['kardart.mjs', 'kardpng.mjs', 'ui.mjs', 'estate.mjs', 'arena.mjs', 'raid.mjs', 'gear.mjs', 'back.mjs', 'fusion.mjs']) assert.deepEqual(hiddenSpans(readFileSync(new URL('./' + f, import.meta.url), 'utf8')), [], f);
});

test('the numbers on the page are the real ones: every mutant count it prints is the count the witness finds', () => {
  const printed = [...html.matchAll(/<b data-kernel="([^"]+)">(\d+)<\/b>/g)];
  assert.deepEqual(printed.map((m) => m[1]), ['kards/kardart.mjs', 'kards/kardpng.mjs', 'kards/ui.mjs', 'kards/ttf.mjs', 'kards/estate.mjs', 'kards/arena.mjs', 'kards/raid.mjs', 'kards/gear.mjs', 'kards/back.mjs', 'kards/fusion.mjs', 'kards/costcase.mjs']);
  for (const [, file, n] of printed) assert.equal(Number(n), mutants(readFileSync(new URL('../' + file, import.meta.url), 'utf8')).length, file);
});

test('every table scrolls on its own on a small screen, and every source link points into this repository', () => {
  assert.equal([...html.matchAll(/<table>/g)].length, [...html.matchAll(/<div class="tw" role="region"[^>]*tabindex="0"><table>/g)].length, 'each table sits in a labelled, focusable scroller');
  for (const m of html.matchAll(/href="(https:\/\/github\.com[^"]+)"/g)) assert.match(m[1], /^https:\/\/github\.com\/sjgant80-hub\/pixelwhisperer(\/|$)/, m[1]);
  for (const m of html.matchAll(/blob\/main\/([^"]+)"/g)) assert.ok(readFileSync(new URL('../' + m[1], import.meta.url)).length > 0, m[1] + ' exists');
});

test('the credits are on the page, in the README and in CREDITS.md: built by Kar, powered by Konomi, and the art is the estate\x27s own', () => {
  const KONOMI = 'Powered by the Konomi architecture, created by Thomas Frumkin';
  const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
  for (const [name, text] of [['kards/index.html', html], ['README.md', read('../README.md')], ['kards/CREDITS.md', read('./CREDITS.md')]]) {
    assert.ok(text.includes(KONOMI), name + ' carries the Konomi line');
    assert.ok(/Built by \**Kar/.test(text), name + ' says who built it');
  }
  // the art is not drawn from anyone else's papers (Simon, 2026-10-21), so no surface, kernel header included, attributes it to them
  for (const p of ['./index.html', '../README.md', './CREDITS.md', './kardart.mjs', './ui.mjs', './estate.mjs', './arena.mjs', './raid.mjs', './gear.mjs', './back.mjs', './fusion.mjs', './ttf.mjs', './kardpng.mjs']) assert.equal(/Floyd|ThunderStruck|Lumiea/.test(read(p)), false, p + ' credits the art to no one else');
  assert.ok(ids.has('credits'));
  assert.ok(/<a href="#credits">Credits<\/a>/.test(html));
});
