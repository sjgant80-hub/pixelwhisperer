// seal.test.mjs - the sealed card: an ordinary PNG that carries its record, read back with the platform's own inflate and an
// independent CRC; one card has one record; a file turns face up only when it is the file its record makes; every way it can
// fail to be that file is named (size, storage, which pixel, or what else it carries); anything that is not a card file is
// refused with a reason; and nothing, however broken, makes it throw.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inflateSync, deflateSync } from 'node:zlib';
import { KEYWORD, RECORD_MAX, FILE_MAX, recordOf, sealCard, openCard } from './seal.mjs';
import { paintArt, THEMES } from './kardart.mjs';
import { pngOf } from './kardpng.mjs';
import { SAMPLES } from './samples.mjs';
import { violations } from './source-check.mjs';
import { hiddenSpans } from '../witness-kards.mjs';

const SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const refc = (bytes) => { let c = 0xffffffff; for (const b of bytes) { c ^= b; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1; } return (c ^ 0xffffffff) >>> 0; };   // bit by bit, not the writer's table
const ascii = (s) => Uint8Array.from(s, (c) => c.charCodeAt(0));
const be = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const u32 = (b, at) => ((b[at] << 24) | (b[at + 1] << 16) | (b[at + 2] << 8) | b[at + 3]) >>> 0;
const cat = (...ps) => Uint8Array.from(ps.flatMap((p) => Array.from(p)));
const same = (a, b) => Buffer.from(a).equals(Buffer.from(b));
function parse(png) {   // an independent reader: the chunks in order, as they stand
  const out = [];
  for (let at = 8; at < png.length; ) { const n = u32(png, at); out.push({ type: Buffer.from(png.subarray(at + 4, at + 8)).toString('latin1'), data: png.slice(at + 8, at + 8 + n) }); at += 12 + n; }
  return out;
}
const build = (chunks) => cat(SIG, ...chunks.map(({ type, data }) => { const body = cat(ascii(type), data); return cat(be(data.length), body, be(refc(body))); }));
const edit = (png, fn) => build(fn(parse(png)));
const KEYB = ascii(KEYWORD + '\0');
const recordIn = (png) => Buffer.from(parse(png).find((c) => c.type === 'tEXt').data.subarray(KEYB.length)).toString('latin1');
const setRecord = (png, s) => edit(png, (cs) => cs.map((c) => (c.type === 'tEXt' ? { type: 'tEXt', data: cat(KEYB, ascii(s)) } : c)));
const setIdat = (png, f) => edit(png, (cs) => cs.map((c) => (c.type === 'IDAT' ? { type: 'IDAT', data: f(Uint8Array.from(c.data)) } : c)));
const poke = (at, f) => (d) => { d[at] = f(d[at]); return d; };

const ITEM = { form: 'app', id: '9c1d7a3e5b20f468', name: 'Invoice Chaser', source: 'invoice-chaser', tier: 'proven', spdx: 'MIT', kit: true, retires: 'a rented invoice tool' };
const MAKER = '3f9a1c7e5b208d46b27d0e4a91c6f3580c58e1d3a79f4b62e913b6f0482ca7d5';
const card = (over = {}) => ({ facts: SAMPLES[0], theme: 'synthwave-v1', w: 64, h: 64, ...over });
const sealed = (c = card()) => { const r = sealCard(c); assert.equal(r.ok, true, r.why); return r.png; };
const up = (r) => { assert.equal(r.ok, true, r.why); assert.equal(r.face, 'up', r.why); return r; };
const down = (r, why) => { assert.equal(r.ok, true, r.why); assert.equal(r.face, 'down'); assert.match(r.why, why); return r; };
const refused = (r, why) => { assert.equal(r.ok, false); assert.equal(typeof r.why, 'string'); assert.match(r.why, why); };
const n64 = 64 * 193;
const BASE = sealed();                       // 64 x 64: one stored block of 64 x 193 bytes
const at64 = (x, y, ch) => 2 + 5 + y * 193 + 1 + x * 3 + ch;   // where a pixel's channel sits in that card's IDAT
const STORED = /^its pixels are not stored the way a sealed card stores them \(saved again by another program\?\): seal it again from its record$/;
const MORE = /^its face is the one its record draws, but the file carries more than its face and its record$/;

test('a sealed card is an ordinary PNG: its header, its record, its face (inflated by the platform), its end', () => {
  const r = sealCard(card({ w: 384, h: 560 })), cs = parse(r.png);
  assert.equal(r.ok, true, r.why);
  assert.deepEqual(cs.map((c) => c.type), ['IHDR', 'tEXt', 'IDAT', 'IEND']);
  assert.deepEqual([...cs[0].data], [...be(384), ...be(560), 8, 2, 0, 0, 0]);
  const raw = inflateSync(cs[2].data), px = paintArt(SAMPLES[0], 'synthwave-v1', 384, 560).px;
  assert.equal(raw.length, 560 * 1153);
  for (let y = 0; y < 560; y++) { assert.equal(raw[y * 1153], 0); assert.ok(same(raw.subarray(y * 1153 + 1, (y + 1) * 1153), px.subarray(y * 1152, (y + 1) * 1152)), 'row ' + y); }
  assert.ok(same(r.px, px), 'sealCard hands back the face it drew');
  assert.equal(recordIn(r.png), '{"v":1,"theme":"synthwave-v1","w":384,"h":560,"facts":{"id":"3f9a1c7e5b208d46","title":"Churn Hunter","dataset":"telco","department":"retention","stage":34,"rarity":"rare","generation":2,"parents":["a41c0e93d7b25f68","7be2d9c14a05831f"]}}');
  assert.ok(same(cs[1].data.subarray(0, KEYB.length), KEYB), 'the keyword, then a NUL');
  for (let at = 8; at < r.png.length; ) { const n = u32(r.png, at); assert.equal(u32(r.png, at + 8 + n), refc(r.png.subarray(at + 4, at + 8 + n))); at += 12 + n; }
  assert.ok(same(sealCard(card({ w: 384, h: 560 })).png, r.png), 'the same card makes the same file, byte for byte');
  const plain = pngOf(px, 384, 560).png;
  assert.equal(r.png.length, plain.length + 12 + KEYB.length + recordIn(r.png).length, 'the face is the plain PNG; the record is one chunk more');
  assert.equal(KEYWORD, 'kardlings-card'); assert.equal(RECORD_MAX, 2048); assert.equal(FILE_MAX, 3200000);
});

test('one card, one record: every field written out, in one order, whatever order or extras it came with', () => {
  const shuffled = { parents: SAMPLES[0].parents, generation: 2, rarity: 'rare', stage: 34, department: 'retention', dataset: 'telco', title: 'Churn Hunter', id: '3f9a1c7e5b208d46', extra: 'dropped' };
  const a = recordOf(card()), b = recordOf({ h: 64, w: 64, theme: 'synthwave-v1', facts: shuffled, colour: 'dropped' });
  assert.equal(a.ok, true); assert.equal(a.text, b.text); assert.deepEqual(a.card, b.card);
  assert.equal(a.text, JSON.stringify(a.card));
  assert.deepEqual(Object.keys(a.card), ['v', 'theme', 'w', 'h', 'facts']);
  const it = recordOf(card({ facts: { form: 'pwa', id: ITEM.id, name: 'Quick Notes', source: 'quick-notes', tier: 'works' } }));
  assert.deepEqual(it.card.facts, { form: 'pwa', id: ITEM.id, name: 'Quick Notes', source: 'quick-notes', tier: 'works', spdx: '', kit: false, retires: '' });
  assert.deepEqual(recordOf(card({ facts: ITEM })).card.facts, ITEM);
  assert.deepEqual(recordOf(card({ facts: { ...SAMPLES[0], form: 'scorer' } })).card.facts, a.card.facts, 'a scorer named as one is written as a scorer');
  assert.deepEqual(recordOf(card({ back: { maker: MAKER, serial: 7 } })).card.back, { maker: MAKER, serial: 7 });
  assert.deepEqual(recordOf(card({ back: {} })).card.back, { maker: null, serial: null });
  assert.deepEqual(Object.keys(recordOf(card({ back: { serial: 0 } })).card), ['v', 'theme', 'w', 'h', 'facts', 'back']);
  for (const c of [card({ back: null }), card()]) assert.equal('back' in recordOf(c).card, false, 'no back given, no back written');
  for (const w of [64, 1024]) assert.equal(recordOf(card({ w, h: w })).ok, true, 'size ' + w);
});

test('a card that is not one is refused with the reason, and sealing one refuses the same way', () => {
  for (const x of [null, undefined, 5, 'card', [], true]) { refused(recordOf(x), /^the card must be an object$/); refused(sealCard(x), /^the card must be an object$/); }
  refused(recordOf(card({ facts: { ...SAMPLES[0], id: 'zz' } })), /^id must be 16 lowercase hex characters$/);
  refused(recordOf(card({ facts: null })), /^facts must be an object$/);
  for (const theme of ['nope', 'toString', 5, null]) refused(recordOf(card({ theme })), /^unknown theme$/);
  for (const [w, h] of [[63, 64], [64, 63], [1025, 64], [64, 1025], [64.5, 64], ['64', 64], [64, null]]) refused(recordOf(card({ w, h })), /^width and height must be whole numbers from 64 to 1024$/);
  refused(recordOf(card({ back: { maker: 'x' } })), /^the maker must be a public key of 64 lowercase hex characters$/);
  refused(sealCard(card({ back: [] })), /^the back must be an object$/);
  const trap = { get facts() { throw new Error('boom'); } };
  refused(recordOf(trap), /^the card could not be read$/);
  refused(sealCard(trap), /^the card could not be read$/);
});

test('face up: a file that is exactly the file its record makes, for every theme, scorers, items and backs', () => {
  for (const theme of Object.keys(THEMES)) for (const facts of [SAMPLES[0], SAMPLES[5], ITEM]) {
    const c = card({ facts, theme }), r = up(openCard(sealed(c)));
    assert.deepEqual(r.card, recordOf(c).card, theme);
    assert.ok(same(r.px, paintArt(facts, theme, 64, 64).px), theme);
  }
  const backed = up(openCard(sealed(card({ back: { maker: MAKER, serial: 123 } }))));
  assert.deepEqual(backed.card.back, { maker: MAKER, serial: 123 });
  up(openCard(sealed(card({ w: 384, h: 560 }))));
  up(openCard(Buffer.from(BASE)));   // a Node Buffer is bytes too
});

test('what is not a card file is refused with a reason', () => {
  for (const x of [null, undefined, 'png', [...BASE], BASE.buffer, 5, {}]) refused(openCard(x), /^a card file must be bytes \(a Uint8Array\)$/);
  refused(openCard(new Uint8Array(FILE_MAX + 1)), /^the file is larger than any card$/);
  refused(openCard(new Uint8Array(FILE_MAX)), /^this is not a PNG file$/);
  for (const x of [new Uint8Array(0), Uint8Array.from(SIG.slice(0, 7)), cat(SIG.slice(0, 7), [0x0b], BASE.subarray(8))]) refused(openCard(x), /^this is not a PNG file$/);
  refused(openCard(Uint8Array.from(SIG)), /^this picture carries no Kardlings card record$/);
  refused(openCard(pngOf(paintArt(SAMPLES[0], 'synthwave-v1', 64, 64).px, 64, 64).png), /^this picture carries no Kardlings card record$/);
  refused(openCard(BASE.subarray(0, BASE.length - 1)), /^the file ends in the middle of a chunk$/);
  refused(openCard(cat(BASE, new Uint8Array(11))), /^the file ends in the middle of a chunk$/);
  const long = Uint8Array.from(BASE); long[long.length - 9] = 1;   // IEND says it holds 1 byte, and the file has none to give
  refused(openCard(long), /^a chunk runs past the end of the file$/);
  const hurt = Uint8Array.from(BASE); hurt[16] ^= 1;               // one bit of the header, its checksum left as it was
  refused(openCard(hurt), /^a chunk is damaged: its checksum does not match$/);
  refused(openCard(cat(BASE.subarray(0, BASE.length - 12), new Uint8Array(12))), /^a chunk is damaged: its checksum does not match$/);
  refused(openCard(edit(BASE, (cs) => [cs[0], cs[1], cs[1], ...cs.slice(2)])), /^the file carries more than one card record$/);
  refused(openCard(edit(BASE, (cs) => cs.map((c) => (c.type === 'tEXt' ? { type: 'zTXt', data: c.data } : c)))), /^this picture carries no Kardlings card record$/);
  refused(openCard(edit(BASE, (cs) => cs.map((c) => (c.type === 'tEXt' ? { type: 'tEXt', data: KEYB.subarray(0, 9) } : c)))), /^this picture carries no Kardlings card record$/);
  const text = recordIn(BASE);
  for (const bad of ['\x1f' + text, text + '\x7f', text.replace('Churn', 'Ch\xe9rn')]) refused(openCard(setRecord(BASE, bad)), /^the card record is not plain text of at most 2048 characters$/);
  refused(openCard(setRecord(BASE, text + ' '.repeat(RECORD_MAX + 1 - text.length))), /^the card record is not plain text of at most 2048 characters$/);
  down(openCard(setRecord(BASE, text + ' '.repeat(RECORD_MAX - text.length))), MORE);   // exactly the longest: read, and not the file it makes
  for (const bad of ['', '{', 'card', text.slice(0, -1)]) refused(openCard(setRecord(BASE, bad)), /^the card record is not readable$/);
  for (const bad of ['null', '[]', '5', '"card"', '{}', text.replace('"v":1', '"v":2'), text.replace('"v":1', '"v":"1"')]) refused(openCard(setRecord(BASE, bad)), /^the card record is not one this reader knows$/);
  refused(openCard(setRecord(BASE, text.replace('3f9a1c7e5b208d46', '3F9A1C7E5B208D46'))), /^the card record is not a card: id must be 16 lowercase hex characters$/);
  refused(openCard(setRecord(BASE, text.replace('"w":64', '"w":63'))), /^the card record is not a card: width and height/);
});

test('face down, and why: a word changed, a pixel changed, a size changed, something added', () => {
  const text = recordIn(BASE);
  const word = down(openCard(setRecord(BASE, text.replace('Churn Hunter', 'Churn Hunted'))), /^\d+ pixels differ from the face its record draws; the first is at x \d+, y \d+$/);
  assert.ok(word.differ > 1); assert.equal(word.card.facts.title, 'Churn Hunted', 'the card it carries is the card it says');
  assert.ok(Number.isInteger(word.at.x) && Number.isInteger(word.at.y) && word.at.x < 64 && word.at.y < 64);
  const one = down(openCard(setIdat(BASE, poke(at64(5, 7, 0), (v) => v ^ 0x80))), /^1 pixel differs from the face its record draws; the first is at x 5, y 7$/);
  assert.equal(one.differ, 1); assert.deepEqual(one.at, { x: 5, y: 7 });
  const g = down(openCard(setIdat(BASE, poke(at64(63, 0, 1), (v) => v ^ 1))), /^1 pixel differs from the face its record draws; the first is at x 63, y 0$/);
  assert.equal(g.differ, 1);
  const two = setIdat(BASE, (d) => { d[at64(0, 0, 2)] ^= 1; d[at64(63, 63, 2)] ^= 1; return d; });
  const b = down(openCard(two), /^2 pixels differ from the face its record draws; the first is at x 0, y 0$/);
  assert.equal(b.differ, 2); assert.deepEqual(b.at, { x: 0, y: 0 });
  const big = sealed(card({ w: 384, h: 560 })), ri = 500 * 1153 + 1 + 300 * 3, si = 2 + 5 * (Math.floor(ri / 65535) + 1) + ri;
  const far = down(openCard(setIdat(big, poke(si, (v) => v ^ 0x40))), /^1 pixel differs from the face its record draws; the first is at x 300, y 500$/);
  assert.deepEqual(far.at, { x: 300, y: 500 });
  const sized = down(openCard(setRecord(BASE, text.replace('"w":64,"h":64', '"w":128,"h":96'))), /^its picture is not the size or kind its record names \(128 x 96, 8-bit colour\)$/);
  assert.equal(sized.differ, null); assert.equal(sized.at, null);
  down(openCard(edit(BASE, (cs) => cs.filter((c) => c.type !== 'IHDR'))), /^its picture is not the size or kind its record names \(64 x 64, 8-bit colour\)$/);
  for (const more of [cat(BASE, BASE.subarray(BASE.length - 12)),
    edit(BASE, (cs) => [cs[0], cs[1], { type: 'tEXt', data: ascii('Comment\0hello') }, ...cs.slice(2)]),
    edit(BASE, (cs) => [cs[0], { type: 'zTXt', data: cs[1].data }, ...cs.slice(1)]),
    setRecord(BASE, text.replace('{"v":1,"theme":"synthwave-v1"', '{"theme":"synthwave-v1","v":1')),
    setRecord(BASE, text.slice(0, -1) + ',"note":"~"}'),
    edit(BASE, (cs) => [cs[0], cs[1], { type: 'IDAT', data: cs[2].data.subarray(0, 700) }, { type: 'IDAT', data: cs[2].data.subarray(700) }, cs[3]]),
    setIdat(BASE, (d) => cat(d.subarray(0, 2), [0], d.subarray(3, d.length - 4), [1, 0, 0, 255, 255]))]) {
    const r = down(openCard(more), MORE);
    assert.equal(r.differ, 0); assert.equal(r.at, null);
  }
});

test('face down, and why: pixels stored another way are named, never read as a face', () => {
  const n = 64 * 193, blocks = (hdr, raw) => cat([0x78, 0x01, hdr, raw.length & 255, raw.length >>> 8, ~raw.length & 255, (~raw.length >>> 8) & 255], raw, [0, 0, 0, 0]);
  const raw = inflateSync(parse(BASE)[2].data);
  assert.equal(raw.length, n);
  for (const f of [(d) => deflateSync(inflateSync(d)), poke(0, () => 0x68), poke(1, () => 0x5e), (d) => d.subarray(0, 2), (d) => d.subarray(0, 6),
    poke(2, () => 2), poke(2, () => 3), poke(5, (v) => v ^ 1), poke(4, (v) => v ^ 1), poke(at64(0, 3, 0) - 1, () => 1), poke(at64(0, 63, 0) - 1, () => 4),
    () => blocks(1, raw.subarray(0, n - 1)), () => cat(blocks(0, raw).subarray(0, 7 + n), [1, 0, 0, 255, 255], [9]).subarray(0, 7 + n + 4)]) {
    const r = down(openCard(setIdat(BASE, f)), STORED);
    assert.equal(r.differ, null); assert.equal(r.at, null);
  }
  down(openCard(setIdat(BASE, () => blocks(1, raw))), MORE);   // the same stream, with a wrong checksum: the face is right, the file is not
});

test('fuzz: no bytes, however broken, make it throw, and only the file itself turns face up', () => {
  let s = 0x2545f491;
  const rnd = (n) => { s = (Math.imul(s, 1103515245) + 12345) >>> 0; return s % n; };
  const check = (r, file) => {
    assert.equal(typeof r, 'object'); assert.equal(typeof r.ok, 'boolean'); assert.equal(typeof r.why === 'string' || r.face === 'up', true);
    if (r.ok) { assert.ok(r.face === 'up' || r.face === 'down'); if (r.face === 'up') assert.ok(same(file, BASE) || same(file, sealCard(r.card).png)); }
  };
  for (let i = 0; i < 150; i++) { const f = Uint8Array.from({ length: rnd(90) }, () => rnd(256)); const g = i % 2 ? cat(SIG, f) : f; check(openCard(g), g); }
  for (let i = 0; i < 120; i++) {
    const f = Uint8Array.from(BASE); f[rnd(f.length)] ^= 1 + rnd(255);
    const r = openCard(f); check(r, f); assert.notEqual(r.face, 'up', 'a changed byte never turns face up');
  }
  for (let i = 0; i < 40; i++) {
    const r = openCard(setIdat(BASE, poke(7 + rnd(n64), (v) => v ^ (1 + rnd(255)))));
    check(r, null); assert.equal(r.face, 'down'); assert.ok(r.differ === 1 || r.differ === null, r.why);
  }
  for (const rec of ['{"v":1}', '{"v":1,"theme":"synthwave-v1","w":64,"h":64,"facts":[]}', '{"v":1,"facts":{"form":"app"}}', '{"v":1,"theme":"synthwave-v1","w":64,"h":64,"facts":' + JSON.stringify(SAMPLES[0]) + ',"back":5}', '{"__proto__":{"v":1}}'])
    check(openCard(setRecord(BASE, rec)), null);
  for (let i = 0; i < 30; i++) check(openCard(BASE.subarray(0, rnd(BASE.length))), null);
});

test('the source keeps the rules: ASCII, integer-only, deterministic, its three imports and no others, nothing hidden from the witness', () => {
  const src = readFileSync(new URL('./seal.mjs', import.meta.url), 'utf8');
  assert.deepEqual(violations(src, { imports: ['./kardart.mjs', './back.mjs', './kardpng.mjs'] }), []);
  assert.deepEqual(hiddenSpans(src), []);
});
