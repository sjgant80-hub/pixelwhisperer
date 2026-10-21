#!/usr/bin/env node
// kards-gallery.mjs - write sample cards as PNG files, drawn by kards/kardart.mjs and encoded by kards/kardpng.mjs.
//   node tools/kards-gallery.mjs            write kards/gallery/: a contact sheet of the 12 sample cards per theme, a hero card per theme,
//                                          the sample estate per theme, the UI kit sheet (every glyph and icon), and the game around the
//                                          cards: the four sample items, a duel and a raid per theme, a fallen boss, the eight bosses,
//                                          the inventory icons, an estate holding items, the card backs (signed and unsigned), and the
//                                          Fusion Lab (fusing, kept, refused per theme) with a fused card's family tree
//   node tools/kards-gallery.mjs --all      also write every sample card, each theme, at the DIGI card's size (384 x 560) into kards/gallery/full/
//   node tools/kards-gallery.mjs --check    exit 1 unless the committed files are exactly what the engine draws now (CI runs this)
//   node tools/kards-gallery.mjs --out DIR  write somewhere else
import { paintArt, THEMES } from '../kards/kardart.mjs';
import { pngOf } from '../kards/kardpng.mjs';
import { SAMPLES } from '../kards/samples.mjs';
import { paintEstate } from '../kards/estate.mjs';
import { paintDuel } from '../kards/arena.mjs';
import { paintRaid, bossSprite, BOSSES } from '../kards/raid.mjs';
import { paintSlot } from '../kards/gear.mjs';
import { paintBack } from '../kards/back.mjs';
import { paintFusion, paintLineage } from '../kards/fusion.mjs';
import { CHARSET, UI_ICONS, DATASET_ICONS, FORM_ICONS, STAR, DOCK, ACTIONS, INVENTORY, GEAR_SLOTS, paintText } from '../kards/ui.mjs';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const W = 192, H = 280, COLS = 4;   // a contact-sheet tile: the card's own 192 x 280 canvas, 1:1
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** → Map of file name -> PNG bytes, for the contact sheets and hero cards (and every card at full size with all = true). */
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
