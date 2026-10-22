#!/usr/bin/env node
// witness-kards.mjs - the mutation gate over PixelWhisperer Kards' own kernels (the pattern of dex-frontier's witness-all.mjs,
// with its harness vendored in .witness/). Each kernel is mutated (comparisons, logic, booleans, +-1) and its tests must kill
// every mutant. There is NO baseline here: a survivor is fixed by an exact test or by restructuring the code so the mutant is
// not equivalent, never by writing it off.
//   node witness-kards.mjs [kards/kardart.mjs ...]
import { runMutations } from './.witness/witness.mjs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const HERE = dirname(fileURLToPath(import.meta.url));

/** Where the witness would hide REAL code: its masker reads '...' / "..." as strings and does not stop at a newline, so a
 *  stray quote inside a regex or a backtick template blanks code up to the next matching quote - and those operators are
 *  never mutated (a false clean). A JS string cannot span lines unescaped, so any quoted run that crosses one is a span
 *  of hidden code. Returns [first line, last line] for each. */
export function hiddenSpans(src) {
  const spans = [];
  let state = 'code', line = 1, startLine = 1;
  for (let i = 0; i < src.length; i++) {
    const c = src[i], d = src[i + 1];
    if (c === '\n') line++;
    if (state === 'code') {
      if (c === '/' && d === '/') { i++; state = 'line'; }
      else if (c === '/' && d === '*') { i++; state = 'block'; }
      else if (c === "'" || c === '"') { state = c; startLine = line; }
    } else if (state === 'line') { if (c === '\n') state = 'code'; }
    else if (state === 'block') { if (c === '*' && d === '/') { i++; state = 'code'; } }
    else if (c === '\\') { if (src[i + 1] === '\n') line++; i++; }
    else if (c === state) { if (line > startLine) spans.push([startLine, line]); state = 'code'; }
  }
  if (state === "'" || state === '"') spans.push([startLine, line]);
  return spans;
}
// each kernel and the test files that must kill its mutants, cheapest and sharpest first (run-tests.mjs stops at the first red)
export const PAIRS = [
  ['kards/kardart.mjs', ['kards/kardart.smoke.test.mjs', 'kards/items.test.mjs', 'kards/kardart.test.mjs']],
  ['kards/kardpng.mjs', ['kards/kardpng.test.mjs']],
  ['kards/costcase.mjs', ['kards/costcase.test.mjs']],
  ['kards/ui.mjs', ['kards/ui.test.mjs']],
  ['kards/ttf.mjs', ['kards/ttf.test.mjs']],
  ['kards/estate.mjs', ['kards/estate.test.mjs']],
  ['kards/arena.mjs', ['kards/arena.test.mjs']],
  ['kards/raid.mjs', ['kards/raid.test.mjs']],
  ['kards/gear.mjs', ['kards/gear.test.mjs']],
  ['kards/back.mjs', ['kards/back.test.mjs']],
  ['kards/fusion.mjs', ['kards/fusion.test.mjs']],
  ['kards/build.mjs', ['kards/build.test.mjs']],
];
// imported (by the tests) it only lends hiddenSpans and PAIRS; run directly, it is the gate
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();

function main() {
  const only = process.argv.slice(2);
  // a name that matches no kernel judges nothing - and nothing judged must never print CLEAN
  const unknown = only.filter((o) => !PAIRS.some(([src]) => src === o));
  if (unknown.length) { console.log('WITNESS NOT RUN - no kernel named ' + unknown.join(', ') + ' (name it as its path, e.g. kards/kardart.mjs)'); process.exit(1); }
  let allClean = true; const rows = [];
  for (const [src, tests] of PAIRS) {
    if (only.length && !only.includes(src)) continue;
    if (!existsSync(join(HERE, src))) { console.log('X ' + src + ' MISSING'); allClean = false; continue; }
    const t0 = Date.now();
    // code the masker would hide is never mutated: refuse to judge rather than report a clean that skipped it
    const hidden = hiddenSpans(readFileSync(join(HERE, src), 'utf8'));
    if (hidden.length) {
      console.log('X ' + src.padEnd(18) + ' HIDDEN CODE - a stray quote hides lines ' + hidden.map(([a, b]) => a + '-' + b).join(', ') + ' from mutation; write it as \\x22 / \\x27');
      allClean = false;
      continue;
    }
    // a red suite kills every mutant and reads as CLEAN, so the unmutated code must pass its tests first, or nothing is judged
    const run = ['kards/run-tests.mjs', ...tests];
    const base = spawnSync(process.execPath, run, { cwd: HERE, encoding: 'utf8', timeout: 300000 });
    if (base.status !== 0) {
      console.log('X ' + src.padEnd(18) + ' RED BASELINE - its tests fail with no mutation applied (' + tests.join(', ') + '); nothing can be judged');
      allClean = false;
      continue;
    }
    const r = runMutations(join(HERE, src), { cwd: HERE, cap: 5000, timeout: 120000, baseline: [], testCmd: ['node', ...run] });
    rows.push(r);
    console.log((r.clean && !r.capped && r.ignored.length === 0 ? 'OK ' : 'X ') + src.padEnd(18) + ' ' + String(r.killed).padStart(4) + '/' + String(r.total).padEnd(4) + ' killed - ' + ((Date.now() - t0) / 1000).toFixed(1) + 's');
    for (const s of r.survived) console.log('    SURVIVED line ' + s.line + ': ' + s.mutation + ' :: ' + s.snippet);
    if (!r.clean || r.capped || r.ignored.length) allClean = false;
  }
  const k = rows.reduce((a, r) => a + r.killed, 0), n = rows.reduce((a, r) => a + r.total, 0);
  console.log('\n' + (allClean ? 'WITNESS CLEAN' : 'WITNESS NOT CLEAN') + ' - ' + k + '/' + n + ' mutants killed, 0 baselined');
  process.exit(allClean ? 0 : 1);
}
