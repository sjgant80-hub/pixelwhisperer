#!/usr/bin/env node
// kards-gallery.mjs - write sample cards as PNG files, drawn by kards/kardart.mjs and encoded by kards/kardpng.mjs.
//   node tools/kards-gallery.mjs            write kards/gallery/: a contact sheet of the 12 sample cards per theme, a hero card per theme,
//                                          the sample estate per theme, the UI kit sheet (every glyph and icon), and the game around the
//                                          cards: the four sample items, a duel and a raid per theme, a fallen boss, the eight bosses,
//                                          the inventory icons, an estate holding items, the card backs (signed and unsigned), and the
//                                          Fusion Lab (fusing, kept, refused per theme) with a fused card's family tree, builds and
//                                          the job board, the build sheets (four at 1x, and one at the share size), pages of
//                                          the build book, and two heroes' plates in every theme
//   node tools/kards-gallery.mjs --all      also write every sample card, each theme, at the DIGI card's size (384 x 560) into kards/gallery/full/
//   node tools/kards-gallery.mjs --check    exit 1 unless the committed files are exactly what the engine draws now (CI runs this)
//   node tools/kards-gallery.mjs --out DIR  write somewhere else
import { paintArt, THEMES } from '../kards/kardart.mjs';
import { pngOf } from '../kards/kardpng.mjs';
import { SAMPLES } from '../kards/samples.mjs';
import { paintEstate } from '../kards/estate.mjs';
import { paintDuel } from '../kards/arena.mjs';
import { paintRaid, bossSprite, BOSSES, paintChapter } from '../kards/raid.mjs';
import { paintSlot } from '../kards/gear.mjs';
import { paintBack } from '../kards/back.mjs';
import { paintFusion, paintLineage } from '../kards/fusion.mjs';
import { paintBuild, paintJobs, paintSheet, paintBook } from '../kards/build.mjs';
import { paintHero } from '../kards/hero.mjs';
import { createHash } from 'node:crypto';
import { CHARSET, UI_ICONS, DATASET_ICONS, FORM_ICONS, STAR, DOCK, ACTIONS, INVENTORY, GEAR_SLOTS, paintText } from '../kards/ui.mjs';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const W = 192, H = 280, COLS = 4;   // a contact-sheet tile: the card's own 192 x 280 canvas, 1:1
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** \u2192 Map of file name -> PNG bytes, for the contact sheets and hero cards (and every card at full size with all = true). */
export function gallery(all = false) {
  const files = new Map();
  const png = (px, w, h) => { const r = pngOf(px, w, h); if (!r.ok) throw new Error(r.why); return r.png; };
  const draw = (f, theme, w, h) => { const r = paintArt(f, theme, w, h); if (!r.ok) throw new Error(f.title + ': ' + r.why); return r.px; };
  for (const theme of Object.keys(THEMES)) {
    const rows = Math.ceil(SAMPLES.length / COLS), sw = COLS * W, sheet = new Uint8Array(sw * rows * H * 3).fill(16);
    SAMPLES.forEach((f, k) => {
      const px = draw(f, theme, W, H), ox = (k % COLS) * W, oy = Math.floor(k / COLS) * H;
      for (let y = 0; y < H; y++) sheet.set(px.subarray(y * W * 3, (y + 1) * W * 3), ((oy + y) * sw + ox) * 3);
    });
    files.set('sheet-' + theme + '.png', png(sheet, sw, rows * H));
    files.set('hero-' + theme + '.png', png(draw(SAMPLES[4], theme, 384, 560), 384, 560));
    if (all) SAMPLES.forEach((f, k) => files.set('full/' + theme + '-' + String(k + 1).padStart(2, '0') + '-' + slug(f.title) + '.png', png(draw(f, theme, 384, 560), 384, 560)));
  }
  for (const theme of Object.keys(THEMES)) { const r = paintEstate(ESTATE, theme, 480, 320); if (!r.ok) throw new Error(r.why); files.set('estate-' + theme + '.png', png(r.px, 480, 320)); }
  files.set('ui-kit.png', png(...uiSheet()));
  const scene = (r) => { if (!r.ok) throw new Error(r.why); return png(r.px, 480, 320); };
  for (const theme of Object.keys(THEMES)) {   // the game around the cards: items, a duel, a raid
    const n = ITEM_SAMPLES.length, sheet = new Uint8Array(n * W * H * 3);
    ITEM_SAMPLES.forEach((f, k) => { const px = draw(f, theme, W, H); for (let y = 0; y < H; y++) sheet.set(px.subarray(y * W * 3, (y + 1) * W * 3), (y * n * W + k * W) * 3); });
    files.set('items-' + theme + '.png', png(sheet, n * W, H));
    files.set('arena-' + theme + '.png', scene(paintDuel(DUEL, theme, 480, 320)));
    files.set('raid-' + theme + '.png', scene(paintRaid(RAIDS[0], theme, 480, 320)));
  }
  files.set('raid-fallen.png', scene(paintRaid(RAIDS[1], 'blockcraft-v1', 480, 320)));
  files.set('estate-items.png', scene(paintEstate(ESTATE_ITEMS, 'blockcraft-v1', 480, 320)));
  files.set('bosses.png', png(...bossSheet()));
  files.set('kit.png', png(...kitSheet()));
  files.set('backs.png', png(...backSheet()));
  files.set('fusion.png', png(...fusionSheet()));
  files.set('lineage.png', png(...lineageSheet()));
  files.set('map.png', scene2(paintEstate(MAP, 'blockcraft-v1', 480, 400), 480, 400));
  files.set('chapters.png', png(...chapterSheet()));
  files.set('builds.png', png(...buildSheet()));
  files.set('jobs.png', scene2(paintJobs(JOBS, 'synthwave-v1', 480, 320), 480, 320));
  files.set('sheets.png', png(...sheetsSheet()));
  files.set('books.png', png(...booksSheet()));
  files.set('heroes.png', png(...heroesSheet()));
  files.set('sheet-share.png', (() => { const r = paintSheet(SHEETS[0], 'blockcraft-v1', 1200, 630); if (!r.ok) throw new Error(r.why); return png(r.px, 1200, 630); })());
  files.set('readback.png', scene(paintDuel({ ...DUEL, decided: 48, result: 'left', focus: { at: 11, truth: 1, scores: [831200, 412000] } }, 'synthwave-v1', 480, 320)));
  files.set('inventory.png', png(...iconSheet([...INVENTORY.map((n) => UI_ICONS[n]), ...GEAR_SLOTS.map((n) => UI_ICONS[n]), ...Object.values(FORM_ICONS)])));
  return files;
}

// the sample items: one of each form, in every tier
export const ITEM_SAMPLES = [
  { form: 'app', id: '7c41e2a9d05b38f6', name: 'Churn Radar', source: 'divorcerbot', tier: 'works' },
  { form: 'pwa', id: '2b9e04d17a6c3f58', name: 'Pocket Triage', source: 'fallmortgage', tier: 'proven' },
  { form: 'node', id: 'd3f6a8b1c4e27059', name: 'Ledger Relay', source: 'konomium-vault', tier: 'proven' },
  { form: 'talker', id: '5a18c7e3f09b2d64', name: 'Front Desk', source: 'falljustice', tier: 'prototype' },
  { form: 'router', id: '8e2d4b6f1a3c5079', name: 'Ally Picker', source: 'sididy-mesh', tier: 'works' },
];
// the sample duel: two of the sample cards on 48 cases, 30 decided
export const DUEL = {
  left: { id: SAMPLES[0].id, rarity: SAMPLES[0].rarity, rating: 1640, title: SAMPLES[0].title.slice(0, 16) },
  right: { id: SAMPLES[3].id, rarity: SAMPLES[3].rarity, rating: 1585, title: SAMPLES[3].title.slice(0, 16) },
  cases: Array.from({ length: 48 }, (_, n) => [(n * 7 + 3) % 5 < 3 ? 1 : 0, (n * 11 + 1) % 7 < 3 ? 1 : 0]), decided: 30,
};
// the sample raids: a boss standing, and one fallen to the first card of its department
export const RAIDS = [
  { dataset: 'hospital', department: 'admissions', best: 554000, attempts: 12 },
  { dataset: 'hospital', department: 'pharmacy', best: 612300, attempts: 31, loot: { id: SAMPLES[6].id, rarity: SAMPLES[6].rarity, title: SAMPLES[6].title } },
];
// the sample estate once its player holds items and a swarm: the same towers, the five sample items with a few more, one swarm
export const ESTATE_ITEMS = { cards: ESTATE_CARDS(), wires: [[SAMPLES[0].id, SAMPLES[2].id], [SAMPLES[2].id, SAMPLES[4].id]], items: [...ITEM_SAMPLES.map((f, n) => ({ id: f.id, form: f.form, tier: f.tier, fresh: n === 3 })), { id: 'e1c0a7f45b9d2386', form: 'node', tier: 'works' }, { id: '94b2d6e0f1a8c357', form: 'talker', tier: 'proven' }], swarms: [{ id: 'c3a5e7091b2d4f68', members: [SAMPLES[0].id, SAMPLES[3].id, SAMPLES[5].id] }] };
function ESTATE_CARDS() { return SAMPLES.slice(0, 8).map((s, n) => ({ id: s.id, dataset: s.dataset, department: s.department, stage: s.stage, rarity: s.rarity, generation: s.generation, fresh: n === 1 })); }

function iconSheet(icons) {   // icons at 3x on the synthwave panel colour, in a row
  const W2 = 16 + icons.length * 52, H2 = 80, px = new Uint8Array(W2 * H2 * 3);
  for (let i = 0; i < W2 * H2; i++) px.set([0x12, 0x06, 0x26], i * 3);
  icons.forEach((rows, n) => rows.forEach((row, y) => Array.from(row).forEach((c, x) => { if (c === '#') for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) px.set([0x2b, 0xe8, 0xff], ((16 + y * 3 + dy) * W2 + 16 + n * 52 + x * 3 + dx) * 3); })));
  return [px, W2, H2];
}
// the sample kit: node slots (two fielded with their worth, one not joined, one empty) and tool slots (an app, an empty one)
export const KIT = [
  { kind: 'node', card: { id: SAMPLES[0].id, rarity: SAMPLES[0].rarity }, worth: 19727 }, { kind: 'node', card: { id: SAMPLES[2].id, rarity: SAMPLES[2].rarity }, worth: 41696 },
  { kind: 'node', card: { id: SAMPLES[5].id, rarity: SAMPLES[5].rarity }, joined: false }, { kind: 'node' },
  { kind: 'tool', item: { id: '7c41e2a9d05b38f6', tier: 'proven' } }, { kind: 'tool' },
];
function kitSheet() {   // the sample kit at 2x, one row per theme
  const SW = 112, SH = 128, W2 = KIT.length * SW, themes = Object.keys(THEMES), px = new Uint8Array(W2 * themes.length * SH * 3);
  themes.forEach((t, row) => KIT.forEach((slot, n) => { const r = paintSlot(slot, t, SW, SH); if (!r.ok) throw new Error(r.why); for (let y = 0; y < SH; y++) px.set(r.px.subarray(y * SW * 3, (y + 1) * SW * 3), ((row * SH + y) * W2 + n * SW) * 3); }));
  return [px, W2, themes.length * SH];
}
// the sample backs: a maker's (the UI kit's sample key) at edition 123, and an unsigned card
export const BACKS = [{ maker: 'a3f1d2c4b5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e9c07', serial: 123 }, {}];
function backSheet() {   // the sample backs at 1x, a column per theme
  const themes = Object.keys(THEMES), W2 = themes.length * W, px = new Uint8Array(W2 * BACKS.length * H * 3);
  themes.forEach((t, col) => BACKS.forEach((b, row) => { const r = paintBack(b, t, W, H); if (!r.ok) throw new Error(r.why); for (let y = 0; y < H; y++) px.set(r.px.subarray(y * W * 3, (y + 1) * W * 3), ((row * H + y) * W2 + col * W) * 3); }));
  return [px, W2, BACKS.length * H];
}
// the sample fusions: two of the sample cards, running at the third try, kept on the fourth, and refused after twelve
const PA = { id: SAMPLES[0].id, rarity: SAMPLES[0].rarity, gate: 874000, title: SAMPLES[0].title.slice(0, 16).trim() }, PB = { id: SAMPLES[2].id, rarity: SAMPLES[2].rarity, gate: 861500, title: SAMPLES[2].title.slice(0, 16).trim() };
// the DIGI World map: the sample estate as DIGI draws it (SCORER, TOOLS, KITTED) with the five landmarks along the shore
export const MAP = { ...ESTATE_ITEMS, items: ESTATE_ITEMS.items.filter((it) => ['app', 'pwa', 'node'].includes(it.form)), districts: ['scorer', 'tools', 'swarm'], names: { swarm: 'KITTED' }, landmarks: ['arena', 'raids', 'fusion', 'mint', 'proof'] };
const scene2 = (r, w, h) => { if (!r.ok) throw new Error(r.why); const p = pngOf(r.px, w, h); if (!p.ok) throw new Error(p.why); return p.png; };
// the campaign's six chapters as the drop's admission record gives them, in a state of play: two cleared, the third the one to play
const HOSPITAL = [['hospital-discharge', 580771], ['hospital-clinical', 565893], ['hospital-history', 563159], ['hospital-admissions', 546728], ['hospital-pharmacy', 539168]];
export const CHAPTERS = [
  { n: 1, set: 'shop', raids: [], world: { best: 921634, bar: 931634, fallen: true } }, { n: 2, set: 'telco', raids: [], world: { best: 818213, bar: 828213, fallen: true } },
  { n: 3, set: 'adult', raids: [{ domain: 'adult-employer', best: 572118, fallen: true }], world: { best: 807504, bar: 817504, fallen: false }, now: true },
  { n: 4, set: 'bank', raids: [{ domain: 'bank-credit', best: 569346, fallen: false }], world: { best: 770582, bar: 780582, fallen: false } },
  { n: 5, set: 'credit', raids: [{ domain: 'credit-billing', best: 552927, fallen: false }], world: { best: 738587, bar: 748587, fallen: false } },
  { n: 6, set: 'hospital', raids: HOSPITAL.map(([domain, best]) => ({ domain, best, fallen: false })), world: { best: 580771, bar: 610000, fallen: false } },
];
function chapterSheet() {   // the six chapters at 1x, three to a row
  const CW = 240, CH = 160, W2 = 3 * CW, px = new Uint8Array(W2 * 2 * CH * 3);
  CHAPTERS.forEach((c, i) => { const r = paintChapter(c, 'synthwave-v1', CW, CH); if (!r.ok) throw new Error(r.why); for (let y = 0; y < CH; y++) px.set(r.px.subarray(y * CW * 3, (y + 1) * CW * 3), ((Math.floor(i / 3) * CH + y) * W2 + (i % 3) * CW) * 3); });
  return [px, W2, 2 * CH];
}
// the sample builds: a combo found, a party, a fusion that lost its lift, a training run, a kit not yet measured
const BJOB = { set: 'hospital', title: 'The Waiting Room', bar: 600000 };
export const BUILDS = [
  { job: BJOB, kind: 'kit', parts: [{ id: SAMPLES[0].id, rarity: 'rare', role: 'lead', gate: 571000 }, { id: SAMPLES[1].id, rarity: 'uncommon', role: 'node', gate: 552000 }, { id: SAMPLES[2].id, rarity: 'epic', role: 'node', gate: 560500 }, { id: SAMPLES[3].id, role: 'tool' }], gate: 612400, cases: 240, reruns: 7, combo: true, finder: 'a3f1d2c4b5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e9c07', reveal: true },
  { job: BJOB, kind: 'party', parts: [4, 5, 6, 7, 8].map((n, i) => ({ id: SAMPLES[n].id, rarity: SAMPLES[n].rarity, role: 'member', gate: 560000 + i * 3000 })), gate: 570100, reruns: 2 },
  { job: { set: 'bank', title: 'Credit Gate', bar: 780582 }, kind: 'fusion', parts: [{ id: SAMPLES[2].id, rarity: 'rare', role: 'parent', gate: 770582 }, { id: SAMPLES[9].id, role: 'parent', gate: 765000 }], gate: 762000, reruns: 1 },
  { job: { set: 'telco', bar: 828213 }, kind: 'training', parts: [{ id: SAMPLES[10].id, rarity: 'legendary', role: 'teacher', gate: 818213 }, { id: SAMPLES[11].id, rarity: 'common', role: 'data' }], method: 'distil', student: { id: SAMPLES[5].id, rarity: 'uncommon', size: 'tiny' }, gate: 821000 },
  { job: BJOB, kind: 'kit', parts: [{ id: SAMPLES[6].id, rarity: 'epic', role: 'lead' }] },
];
export const JOBS = { jobs: [{ set: 'shop', bar: 931634, cleared: true, builds: 3 }, { set: 'telco', bar: 828213, cleared: false, builds: 0 }, { set: 'adult', title: 'Employer', bar: 600000, cleared: true, builds: 1 }, { set: 'bank', title: 'Credit Gate', bar: 600000, cleared: false, builds: 0 }, { set: 'credit', title: 'Billing', bar: 600000, cleared: false, builds: 0 }, { set: 'hospital', title: 'The Waiting Room', bar: 600000, cleared: true, builds: 12 }, { set: 'hospital', title: 'Pharmacy', bar: 600000, cleared: false, builds: 0 }] };
function buildSheet() {   // the sample builds at 1x, side by side
  const CW = 192, CH = 280, W2 = BUILDS.length * CW, px = new Uint8Array(W2 * CH * 3);
  BUILDS.forEach((b, i) => { const r = paintBuild(b, 'synthwave-v1', CW, CH); if (!r.ok) throw new Error(r.why); for (let y = 0; y < CH; y++) px.set(r.px.subarray(y * CW * 3, (y + 1) * CW * 3), (y * W2 + i * CW) * 3); });
  return [px, W2, CH];
}
// the sample build sheets, from receipts and proofs shaped as the game's measure() and proofOf() make them: a combo proven by
// three keys (one part not held here), an anti-combo re-run once, a plain build with one part fielding and none re-run, and five
// parts fielding of six
const hx = (s) => createHash('sha256').update(s).digest('hex'), SK = [1, 2, 3, 4].map((n) => hx('gallery-key-' + n)), TX = ' \u00d7 ';
const sp = (n, alone, contribution) => ({ card: SAMPLES[n].id, title: SAMPLES[n].title, joined: alone !== null, alone, contribution });
export const SHEETS = [
  { job: BJOB, receipt: { build: hx('gallery-build-1'), data: 'hospital:ground', parts: [sp(4, 571000, 21000), sp(1, 560500, 9000), sp(2, null, null)], fielded: 2, gate: 612400, best: 571000, lift: 41400, n: 240, verdict: 'combo', name: SAMPLES[4].title + TX + SAMPLES[1].title }, proof: { proven: true, keys: SK.slice(0, 3), finder: SK[0] }, held: [SAMPLES[4].id, SAMPLES[2].id] },
  { job: { set: 'bank', title: 'Credit Gate', bar: 780582 }, receipt: { build: hx('gallery-build-2'), data: 'bank:ground', parts: [sp(5, 770582, -2000), sp(9, 765000, -8000)], fielded: 2, gate: 762000, best: 770582, lift: -8582, n: 180, verdict: 'anti', name: SAMPLES[5].title + TX + SAMPLES[9].title }, proof: { proven: false, keys: [SK[3]], finder: SK[3] } },
  { job: { set: 'telco', bar: 828213 }, receipt: { build: hx('gallery-build-3'), data: 'telco:ground', parts: [sp(10, 818213, 0), sp(11, null, null)], fielded: 1, gate: 818213, best: 818213, lift: 0, n: 120, verdict: 'plain', name: SAMPLES[10].title } },
  { job: { set: 'adult', title: 'Employer', bar: 600000 }, receipt: { build: hx('gallery-build-4'), data: 'adult:ground', parts: [0, 3, 6, 7, 8, 1].map((n, i) => sp(n, i < 5 ? 590000 - i * 2000 : null, i < 5 ? 3000 - i * 1500 : null)), fielded: 5, gate: 593000, best: 590000, lift: 3000, n: 2400, verdict: 'plain', name: [0, 3, 6, 7, 8].map((n) => SAMPLES[n].title).join(TX) }, proof: { proven: true, keys: SK.slice(0, 2), finder: SK[0] }, held: [0, 3, 6, 7, 8].map((n) => SAMPLES[n].id) },
];
// the sample pages of the build book, shaped as the game's bookOf() makes them: a job with more proven builds than fit, a job
// its best has cleared, plain builds alone, and nothing proven yet
const br = (k, ns, best, lift, keys) => ({ id: hx('gallery-receipt-' + k), build: hx('gallery-book-' + k), name: ns.map((n) => SAMPLES[n].title).join(TX), gate: best + lift, best, lift, fielded: ns.length, finder: SK[k % 4], keys });
const rank = (rows, sign) => rows.sort((a, b) => sign * (b.lift - a.lift) || (a.build < b.build ? -1 : 1));
export const BOOK_PAGES = [
  { job: { set: 'hospital', title: 'The Waiting Room', bar: 650000 }, page: { combos: rank([br(1, [4, 1], 571000, 41400, 3), br(2, [2, 3, 4], 560000, 21000, 2), br(3, [5, 6], 590000, 12000, 7), br(4, [7, 8, 9, 10], 580000, 9000, 2), br(5, [1, 11], 575000, 8000, 4), br(6, [3, 9], 570000, 6000, 2), br(7, [4, 10], 565000, 5500, 3), br(8, [6, 0], 560000, 5000, 2)], 1), anti: rank([br(9, [2, 8], 590000, -8582, 2), br(10, [11, 5], 585000, -5100, 3)], -1), plain: 3, best: 612400 } },
  { job: { set: 'bank', title: 'Credit Gate', bar: 600000 }, page: { combos: rank([br(11, [0, 5], 590000, 22000, 5), br(12, [3, 4], 585000, 7000, 2)], 1), anti: [br(13, [1, 2], 600000, -6000, 2)], plain: 0, best: 612000 } },
  { job: { set: 'telco', bar: 828213 }, page: { combos: [], anti: [], plain: 2, best: 801000 } },
  { job: { set: 'adult', title: 'Employer', bar: 600000 }, page: { combos: [], anti: [], plain: 0, best: null } },
];
// two sample heroes, as the game's hero screen makes them: a level counted from what is lit, in any order
export const HEROES = [
  { name: 'Shop Context', title: 'Shopkeeper Sage', set: 'shop', lit: [true, true, true, false, false, false] },
  { name: 'Tariff Tamer', title: 'Telecom Tactician', set: 'telco', lit: [true, false, true, false, true, true] },
];
function heroesSheet() {   // the sample heroes' plates in every theme at 2x, a theme to a row
  const SW = 384, SH = 120, themes = Object.keys(THEMES), px = new Uint8Array(SW * 2 * SH * themes.length * 3);
  themes.forEach((t, ti) => HEROES.forEach((h, hi) => { const r = paintHero(h, t, SW, SH); if (!r.ok) throw new Error(r.why); for (let y = 0; y < SH; y++) px.set(r.px.subarray(y * SW * 3, (y + 1) * SW * 3), ((ti * SH + y) * SW * 2 + hi * SW) * 3); }));
  return [px, SW * 2, SH * themes.length];
}
function booksSheet() {   // the sample pages of the build book at 1x, two by two
  const SW = 400, SH = 210, px = new Uint8Array(SW * 2 * SH * 2 * 3);
  BOOK_PAGES.forEach((b, i) => { const r = paintBook(b, 'synthwave-v1', SW, SH); if (!r.ok) throw new Error(r.why); const ox = (i % 2) * SW, oy = Math.floor(i / 2) * SH; for (let y = 0; y < SH; y++) px.set(r.px.subarray(y * SW * 3, (y + 1) * SW * 3), ((oy + y) * SW * 2 + ox) * 3); });
  return [px, SW * 2, SH * 2];
}
function sheetsSheet() {   // the sample build sheets at 1x, two by two
  const SW = 400, SH = 210, px = new Uint8Array(SW * 2 * SH * 2 * 3);
  SHEETS.forEach((s, i) => { const r = paintSheet(s, 'synthwave-v1', SW, SH); if (!r.ok) throw new Error(r.why); const ox = (i % 2) * SW, oy = Math.floor(i / 2) * SH; for (let y = 0; y < SH; y++) px.set(r.px.subarray(y * SW * 3, (y + 1) * SW * 3), ((oy + y) * SW * 2 + ox) * 3); });
  return [px, SW * 2, SH * 2];
}
export const FUSIONS = [
  { a: PA, b: PB, tried: 4, decided: 3, fused: { id: SAMPLES[5].id, rarity: 'legendary', gate: 878300, title: 'Fused Seer' } },
  { a: PA, b: PB, tried: 4, fused: { id: SAMPLES[5].id, rarity: 'legendary', gate: 878300, title: 'Fused Seer' } },
  { a: PA, b: PB, tried: 12, best: 873900 },
];
// the sample family tree: the fused card over its two parents and theirs, four generations, one great-grandparent not held here
const leaf = (n) => ({ id: SAMPLES[n].id, rarity: SAMPLES[n].rarity }), unheld = (n) => ({ id: SAMPLES[n].id });   // unheld: a card this device does not hold
export const LINEAGE = { id: SAMPLES[5].id, rarity: 'legendary', parents: [{ ...leaf(0), parents: [{ ...leaf(1), parents: [leaf(7), leaf(8)] }, leaf(3)] }, { ...leaf(2), parents: [leaf(4), { ...leaf(6), parents: [leaf(9), unheld(10)] }] }] };
function fusionSheet() {   // the sample fusions at 1x, a row per theme
  const themes = Object.keys(THEMES), FW2 = 240, FH = 160, W2 = FUSIONS.length * FW2, px = new Uint8Array(W2 * themes.length * FH * 3);
  themes.forEach((t, row) => FUSIONS.forEach((f, col) => { const r = paintFusion(f, t, FW2, FH); if (!r.ok) throw new Error(r.why); for (let y = 0; y < FH; y++) px.set(r.px.subarray(y * FW2 * 3, (y + 1) * FW2 * 3), ((row * FH + y) * W2 + col * FW2) * 3); }));
  return [px, W2, themes.length * FH];
}
function lineageSheet() {   // the sample tree at 2x in synthwave, and at 1x in blueprint and blockcraft beside it
  const W2 = 720, H2 = 320, px = new Uint8Array(W2 * H2 * 3), put = (r, w, h, x0, y0) => { for (let y = 0; y < h; y++) px.set(r.px.subarray(y * w * 3, (y + 1) * w * 3), ((y0 + y) * W2 + x0) * 3); };
  const big = paintLineage(LINEAGE, 'synthwave-v1', 480, 320), bp = paintLineage(LINEAGE, 'blueprint-v1', 240, 160), bc = paintLineage(LINEAGE, 'blockcraft-v1', 240, 160);
  for (const r of [big, bp, bc]) if (!r.ok) throw new Error(r.why);
  put(big, 480, 320, 0, 0); put(bp, 240, 160, 480, 0); put(bc, 240, 160, 480, 160);
  return [px, W2, H2];
}
function bossSheet() {   // the eight bosses at 4x, four to a row
  const S = 4, side = 32 * S, W2 = 4 * side + 5 * 8, H2 = 2 * side + 3 * 8, px = new Uint8Array(W2 * H2 * 3);
  for (let i = 0; i < W2 * H2; i++) px.set([0x12, 0x06, 0x26], i * 3);
  BOSSES.forEach((b, n) => {
    const s = bossSprite(b.key, S), x0 = 8 + (n % 4) * (side + 8), y0 = 8 + Math.floor(n / 4) * (side + 8);
    for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) { const o = (y * side + x) * 4; if (s.px[o + 3]) px.set([s.px[o], s.px[o + 1], s.px[o + 2]], ((y0 + y) * W2 + x0 + x) * 3); }
  });
  return [px, W2, H2];
}

// the sample estate: eight of the sample cards as towers (one a new child), two mesh wires, four tool blocks
export const ESTATE = { cards: SAMPLES.slice(0, 8).map((s, n) => ({ id: s.id, dataset: s.dataset, department: s.department, stage: s.stage, rarity: s.rarity, generation: s.generation, fresh: n === 1 })), wires: [[SAMPLES[0].id, SAMPLES[2].id], [SAMPLES[2].id, SAMPLES[4].id]], tools: 4 };

// the UI kit sheet: every character in the font (as paintText draws it), then every icon at 3x, on the synthwave panel colour
function uiSheet() {
  const W2 = 640, H2 = 300, px = new Uint8Array(W2 * H2 * 3);
  for (let i = 0; i < W2 * H2; i++) px.set([0x12, 0x06, 0x26], i * 3);
  const put = (r, x0, y0) => { for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) { const o = (y * r.w + x) * 4; if (r.px[o + 3]) px.set([r.px[o], r.px[o + 1], r.px[o + 2]], ((y0 + y) * W2 + x0 + x) * 3); } };
  put(paintText('PIXELWHISPERER UI KIT', 2, '#ffd23c', '#4a1480'), 16, 12);
  const chars = Array.from(CHARSET);
  for (let line = 0; line * 48 < chars.length; line++) put(paintText(chars.slice(line * 48, line * 48 + 48).join(''), 2, '#ffffff'), 16, 44 + line * 24);
  const icons = [...DOCK.map((n) => UI_ICONS[n]), ...ACTIONS.map((n) => UI_ICONS[n]), ...Object.values(DATASET_ICONS)];
  icons.forEach((rows, n) => { const x0 = 16 + (n % 12) * 52, y0 = 108 + Math.floor(n / 12) * 56; rows.forEach((row, y) => Array.from(row).forEach((c, x) => { if (c === '#') for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) px.set([0x2b, 0xe8, 0xff], ((y0 + y * 3 + dy) * W2 + x0 + x * 3 + dx) * 3); })); });
  STAR.forEach((row, y) => Array.from(row).forEach((c, x) => { if (c === '#') for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 4; dx++) px.set([0xff, 0xe6, 0x80], ((108 + 2 * 56 + y * 4 + dy) * W2 + 16 + 4 * 52 + x * 4 + dx) * 3); }));
  return [px, W2, H2];
}

if (process.argv[1] && process.argv[1].endsWith('kards-gallery.mjs')) {
  const args = process.argv.slice(2), at = args.indexOf('--out');
  const out = at >= 0 ? args[at + 1] : join(dirname(fileURLToPath(import.meta.url)), '..', 'kards', 'gallery');
  const files = gallery(args.includes('--all'));
  if (args.includes('--check')) {
    const bad = [...files].filter(([name, bytes]) => !existsSync(join(out, name)) || !Buffer.from(bytes).equals(readFileSync(join(out, name)))).map(([name]) => name);
    if (bad.length) { console.log('GALLERY DRIFT - not what the engine draws now: ' + bad.join(', ')); process.exit(1); }
    console.log('GALLERY OK - ' + files.size + ' files are exactly what kardart.mjs draws');
  } else {
    for (const [name, bytes] of files) { mkdirSync(dirname(join(out, name)), { recursive: true }); writeFileSync(join(out, name), bytes); }
    console.log('wrote ' + files.size + ' files into ' + out);
  }
}
