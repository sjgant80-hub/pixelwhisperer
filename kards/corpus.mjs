// corpus.mjs — the deterministic set of cards the tests and the pin tool draw. It is built to touch everything a face can
// show: every dataset icon, every rarity, every glyph of the font (the titles together spell the whole allowed alphabet),
// the stage and generation extremes, and 0, 1 and 2 parents. Node-only (it hashes with node:crypto); kardart.mjs needs none of it.
import { createHash } from 'node:crypto';
export const DATASETS = ['telco', 'shop', 'bank', 'adult', 'hospital', 'credit', 'custom'];
export const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
export const TITLE_CHARS = " &'.-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
export const DEPT_CHARS = '-0123456789abcdefghijklmnopqrstuvwxyz';
export const sha256 = (data) => createHash('sha256').update(data).digest('hex');
export const idOf = (seed) => sha256('kard-id-' + seed).slice(0, 16);

const TITLES = ['ABCDEFGHIJKLMNOPQRSTUVWX', 'YZabcdefghijklmnopqrstuv', "wxyz0123456789 &'.-", '', 'A', 'Churn Hunter', "O'Hara & Sons Retail", 'WWWWWWWWWWWWWWWWWWWWWWWW', 'x-ray 2.0 & Co.', 'Gig 9'];
const DEPTS = ['abcdefghijklmnop', 'qrstuvwxyz-01234', '56789', '', 'a', 'retention', 'tills-north', 'zzzzzzzzzzzzzzzz'];
const STAGES = [0, 99, 9, 10, 50, 73, 1, 98], GENS = [0, 99, 5, 10, 47, 12, 1, 98];

/** n cards, deterministic. */
export function corpus(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: idOf('corpus-' + i),
    title: TITLES[i % TITLES.length],
    dataset: DATASETS[i % 7],
    department: DEPTS[(i * 3) % DEPTS.length],
    stage: STAGES[i % 8],
    rarity: RARITIES[i % 5],
    generation: GENS[(i * 5) % 8],
    parents: Array.from({ length: i % 3 }, (_, j) => idOf('parent-' + i + '-' + j)),
  }));
}
