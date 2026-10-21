#!/usr/bin/env node
// run-tests.mjs - run test files one after another and stop at the first red one: node kards/run-tests.mjs a.test.mjs b.test.mjs
// The mutation witness runs this once per mutant, so the cheap, sharp file goes first and a mutant that dies there costs
// well under a second. (CI also runs every file on its own: node --test kards/*.test.mjs.)
import { spawnSync } from 'node:child_process';
for (const file of process.argv.slice(2)) {
  const r = spawnSync(process.execPath, ['--test', file], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status || 1);
}
