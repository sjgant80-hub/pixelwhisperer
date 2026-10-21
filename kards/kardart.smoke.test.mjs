// kardart.smoke.test.mjs - the cheap, sharp test: the five hero cards of each theme at the DIGI card's size (384 x 560) must
// match their published hashes. Almost any change to what a card draws shows here, so the witness runs this file first and
// most mutants die in it without the slower suite ever starting.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paintArt } from './kardart.mjs';
import { SAMPLES } from './samples.mjs';
import { sha256 } from './corpus.mjs';
import { PINS } from './kardart.pins.mjs';

for (const [theme, pins] of Object.entries(PINS)) {
  test(theme + ': the hero cards re-draw byte for byte at 384 x 560', () => {
    for (const [id, hash] of pins.hero) {
      const r = paintArt(SAMPLES.find((s) => s.id === id), theme, 384, 560);
      assert.equal(r.ok, true);
      assert.equal(sha256(r.px), hash, theme + ' ' + id);
    }
  });
}
