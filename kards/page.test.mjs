// page.test.mjs - the live page's own gate (the "ui-gate" in miniature): no dead controls, no broken links or imports, nothing
// loaded from anywhere else, every control named. Run with: node --test kards/page.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { hiddenSpans } from '../witness-kards.mjs';

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
  assert.deepEqual(imports.sort(), ['kardart.mjs', 'kardart.pins.mjs', 'kardpng.mjs', 'samples.mjs']);
  for (const f of imports) assert.ok(existsSync(new URL('./' + f, import.meta.url)), f + ' exists');
  assert.equal(/<(?:script|link|img|iframe|source|video|audio)[^>]+(?:src|href)="(?:https?:)?\/\//.test(html), false, 'no external resource');
  assert.equal(/@import|url\(\s*['"]?(?:https?:)?\/\//.test(html), false, 'no external stylesheet resource');
  assert.equal(/\bfetch\(|XMLHttpRequest|sendBeacon|WebSocket/.test(html), false, 'it talks to nobody');
});

test('the page says what it must: what it is, start here, how it works, blueprint, adoption, proof, limits', () => {
  for (const id of ['gallery', 'workshop', 'start', 'how', 'blueprint', 'adoption', 'proof', 'limits']) assert.ok(ids.has(id), 'section #' + id);
  for (const word of ['paintArt', 'append-only', 'integer', 'witness', 'synthwave-v1', 'blockcraft-v1', 'Thomas Frumkin', 'Kar']) assert.ok(html.includes(word), word);
  assert.equal(html.toLowerCase().includes('mine' + 'craft'), false, 'the trademark is not used');
});

test('the witness can see all the code: no quote hides lines from it', () => {
  for (const f of ['kardart.mjs', 'kardpng.mjs']) assert.deepEqual(hiddenSpans(readFileSync(new URL('./' + f, import.meta.url), 'utf8')), [], f);
});
