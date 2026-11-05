// page.test.mjs - the root page's own gate: it explains itself, every control is named and wired, it loads nothing from
// anywhere else, every count it prints is the real one, and it runs the author's kernel verbatim. Run: node --test page.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { mutants } from './.witness/witness.mjs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const html = read('./index.html');
const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
const script = html.slice(html.indexOf('<script type="module">'), html.lastIndexOf('</script>'));

test('every id the script reaches for exists, every label and in-page link lands, no id twice', () => {
  const reached = [...script.matchAll(/\$\('([\w-]+)'\)|say\('([\w-]+)'/g)].map((m) => m[1] || m[2]);
  assert.ok(reached.length > 15);
  for (const id of reached) assert.ok(ids.has(id), 'the script reaches for #' + id);
  for (const m of html.matchAll(/href="#([\w-]+)"/g)) assert.ok(ids.has(m[1]), 'a link to #' + m[1]);
  for (const m of html.matchAll(/<label for="([\w-]+)"/g)) assert.ok(ids.has(m[1]), 'a label for ' + m[1]);
  for (const m of html.matchAll(/aria-(?:labelledby|describedby)="([\w-]+)"/g)) assert.ok(ids.has(m[1]), 'aria reference ' + m[1]);
  assert.equal(ids.size, [...html.matchAll(/\bid="([^"]+)"/g)].length, 'no id is used twice');
});

test('every control has a label and every button a name', () => {
  for (const m of html.matchAll(/<(?:input|textarea|select)[^>]*\bid="([\w-]+)"/g)) assert.ok(html.includes('for="' + m[1] + '"'), 'control ' + m[1] + ' has a label');
  for (const m of html.matchAll(/<button([^>]*)>([\s\S]*?)<\/button>/g)) { assert.ok(m[2].trim().length > 0 || /aria-label=/.test(m[1]), 'a button with no name'); assert.match(m[1], /type="button"/, 'a button says it is a button'); }
  assert.ok(/<html lang="en">/.test(html) && /name="viewport"/.test(html) && /<title>[^<]{10,}<\/title>/.test(html) && /name="description"/.test(html));
});

test('it loads nothing from anywhere else and talks to nobody', () => {
  assert.equal(/<(?:script|link|img|iframe|source|video|audio)[^>]+(?:src|href)="(?:https?:)?\/\//.test(html), false, 'no external resource');
  assert.equal(/@import|url\(\s*['"]?(?:https?:)?\/\//.test(html), false, 'no stylesheet resource');
  for (const m of html.matchAll(/url\(([^)]*)\)/g)) assert.match(m[1], /^#[\w-]+$/, 'url() only points inside the page');
  assert.equal(/\bfetch\(|XMLHttpRequest|sendBeacon|WebSocket/.test(html), false);
});

test('the page explains itself: plain words, start here, how it works drawn, blueprint, adoption, white paper, credits', () => {
  for (const id of ['whisper-h', 'text-h', 'start-h', 'how-h', 'bp-h', 'ad-h', 'paper-h', 'cred-h', 'how-svg', 'trace']) assert.ok(ids.has(id), '#' + id);
  for (const words of ['In plain words', 'Honest scope', 'Start here', 'How it works', 'A real run, traced live', 'The blueprint', 'Adoption', 'White paper', 'Powered by the Konomi architecture, created by Thomas Frumkin', 'sididy']) assert.ok(html.includes(words), words);
  const at = html.indexOf('<svg class="dg" id="how-svg"'), end = html.indexOf('</svg>', at);
  assert.ok(at > html.indexOf('id="how-h"') && end > at && end < html.indexOf('id="bp-h"'), 'the diagram sits, closed, in How it works');
  const svg = html.slice(at, end);
  for (const step of ['textToVisualSummary', 'generatePixelArt', 'mod 11', 'rgb(25b']) assert.ok(svg.includes(step), 'the diagram shows ' + step);
  for (const m of svg.matchAll(/id="(rg-[\w-]+)"/g)) assert.ok(ids.has(m[1]));
  for (const id of ['rg-t0', 'rg-t3', 'rg-t4', 'rg-n1', 'rg-n2', 'rg-n3', 'rg-n4', 'rg-n5']) assert.ok(script.includes("say('" + id + "'"), 'the live run fills ' + id);
});

test('the counts it prints are the real ones: the kernel\x27s tests and the witness\x27s mutants', () => {
  const tests = [...html.matchAll(/<b data-tests="([^"]+)">(\d+)<\/b>/g)], muts = [...html.matchAll(/<b data-mutants="([^"]+)">(\d+)<\/b>/g)];
  assert.deepEqual(tests.map((m) => m[1]), ['kernel.test.mjs']);
  assert.deepEqual(muts.map((m) => m[1]), ['kernel.mjs']);
  assert.equal(Number(tests[0][2]), [...read('./kernel.test.mjs').matchAll(/^test\(/gm)].length, 'tests in kernel.test.mjs');
  assert.equal(Number(muts[0][2]), mutants(read('./kernel.mjs')).length, 'mutants the witness plants in kernel.mjs');
});

test('the page runs the author\x27s kernel verbatim (the same check CI makes with make-page.mjs)', () => {
  const kernel = read('./kernel.mjs').replace(/^export /gm, '').replace(/\r\n/g, '\n').trimEnd();
  const a = html.indexOf('⟦KERNEL-BEGIN⟧'), b = html.indexOf('// ⟦KERNEL-END⟧');
  assert.equal(html.slice(html.indexOf('\n', a) + 1, b), kernel + '\n');
});

test('the door to Kards lands: every link into kards/ names a file and a section that exist', () => {
  const kards = read('./kards/index.html'), kid = new Set([...kards.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
  const links = [...html.matchAll(/href="kards\/([^"#]*)(?:#([\w-]+))?"/g)];
  assert.ok(links.length >= 3);
  for (const [, file, anchor] of links) { assert.ok(existsSync(new URL('./kards/' + (file || 'index.html'), import.meta.url))); if (anchor) assert.ok(kid.has(anchor), 'kards/#' + anchor); }
});
