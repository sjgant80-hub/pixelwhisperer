// ttf.test.mjs - the UI font file, read back by an independent parser: every table where the spec puts it, every checksum
// right, every character mapped, and every glyph's outline, rasterized at its cell centres, equal to the glyph table.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ttfOf, rectsOf, checksum, U, EM, ADVANCE, ASCENT, DESCENT } from './ttf.mjs';
import { GLYPHS, CHARSET } from './ui.mjs';
import { fontFiles, NOTICE } from '../tools/kards-font.mjs';
import { violations } from './source-check.mjs';

const FILE = new Uint8Array(readFileSync(new URL('./fonts/PixelWhisperer.ttf', import.meta.url)));
function reader(b) {
  const u16 = (o) => (b[o] << 8) | b[o + 1], i16 = (o) => (u16(o) << 16) >> 16, u32 = (o) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
  const tables = {};
  for (let t = 0; t < u16(4); t++) { const at = 12 + 16 * t; tables[String.fromCharCode(...b.subarray(at, at + 4))] = { sum: u32(at + 4), off: u32(at + 8), len: u32(at + 12), at }; }
  return { u16, i16, u32, tables };
}
const wordSum = (b) => { let s = 0n; for (let i = 0; i < b.length; i += 4) s += BigInt(((b[i] ?? 0) * 2 ** 24) + ((b[i + 1] ?? 0) << 16) + ((b[i + 2] ?? 0) << 8) + (b[i + 3] ?? 0)); return Number(s % 2n ** 32n); };   // BigInt, not the writer's sum
function glyphOf(r, b, gid) {   // decode a simple glyph (any flags) into contours of points
  const { u16, i16, u32, tables } = r, loca = tables.loca.off, glyf = tables.glyf.off, start = glyf + u32(loca + 4 * gid), end = glyf + u32(loca + 4 * gid + 4);
  if (end === start) return [];
  const nc = i16(start), ends = Array.from({ length: nc }, (_, i) => u16(start + 10 + 2 * i)), np = ends[nc - 1] + 1;
  let o = start + 10 + 2 * nc; o += 2 + u16(o);
  const flags = [];
  while (flags.length < np) { const f = b[o++]; flags.push(f); if (f & 8) { const rep = b[o++]; for (let k = 0; k < rep; k++) flags.push(f); } }
  const coords = (short, same) => { let v = 0; return flags.map((f) => { if (f & short) { const d = b[o++]; v += f & same ? d : -d; } else if (!(f & same)) { v += i16(o); o += 2; } return v; }); };
  const xs = coords(2, 16), ys = coords(4, 32);
  assert.ok(flags.every((f) => f & 1), 'every point on the curve');
  return ends.map((e, i) => Array.from({ length: e - (i ? ends[i - 1] : -1) }, (_, k) => { const p = (i ? ends[i - 1] + 1 : 0) + k; return [xs[p], ys[p]]; }));
}
const winding = (contours, x, y) => contours.reduce((w, c) => w + c.reduce((a, [x0, y0], i) => { const [x1, y1] = c[(i + 1) % c.length]; if (y0 <= y && y1 > y && (x1 - x0) * (y - y0) - (x - x0) * (y1 - y0) > 0) return a + 1; if (y0 > y && y1 <= y && (x1 - x0) * (y - y0) - (x - x0) * (y1 - y0) < 0) return a - 1; return a; }, 0), 0);

test('the font is laid out as the spec says: sorted tables, aligned, every checksum right, the whole file summing to 0xB1B0AFBA', () => {
  const r = reader(FILE), tags = Object.keys(r.tables);
  assert.equal(r.u32(0), 0x00010000);
  assert.deepEqual(tags, ['OS/2', 'cmap', 'gasp', 'glyf', 'head', 'hhea', 'hmtx', 'loca', 'maxp', 'name', 'post']);
  assert.deepEqual([r.u16(6), r.u16(8), r.u16(10)], [128, 3, 11 * 16 - 128]);
  for (const [tag, t] of Object.entries(r.tables)) {
    assert.equal(t.off % 4, 0, tag + ' aligned');
    const body = FILE.slice(t.off, t.off + t.len);
    if (tag === 'head') body.set([0, 0, 0, 0], 8);
    assert.equal(t.sum, wordSum(body), tag + ' checksum');
  }
  assert.equal(wordSum(FILE), 0xb1b0afba);
  assert.equal(checksum(new Uint8Array([0, 0, 0, 1, 0, 0, 0, 2, 7])), (3 + 0x07000000) >>> 0);
});

test('metrics: 9 pixels to the em, 7 above the baseline and 2 below, 6 across every glyph, monospaced', () => {
  const r = reader(FILE), { head, hhea, maxp, hmtx } = r.tables;
  assert.deepEqual([U, EM, ADVANCE, ASCENT, DESCENT], [128, 1152, 768, 896, 256]);
  assert.equal(r.u32(head.off + 12), 0x5f0f3cf5); assert.equal(r.u16(head.off + 18), EM); assert.equal(r.i16(head.off + 50), 1);
  assert.equal(r.i16(hhea.off + 4), ASCENT); assert.equal(r.i16(hhea.off + 6), -DESCENT); assert.equal(r.i16(hhea.off + 8), 0); assert.equal(r.u16(hhea.off + 10), ADVANCE);
  const n = r.u16(maxp.off + 4);
  assert.equal(n, CHARSET.length + 1);
  assert.equal(r.u16(hhea.off + 34), n);
  for (let g = 0; g < n; g++) assert.equal(r.u16(hmtx.off + 4 * g), ADVANCE);
  const os2 = r.tables['OS/2'];
  assert.equal(os2.len, 96); assert.equal(r.u16(os2.off), 4); assert.equal(r.u16(os2.off + 62), 0x00c0);
  assert.equal(FILE[os2.off + 32 + 3], 9, 'panose: monospaced');
  assert.equal(r.i16(os2.off + 68), ASCENT); assert.equal(r.i16(os2.off + 70), -DESCENT); assert.equal(r.u16(os2.off + 74), ASCENT); assert.equal(r.u16(os2.off + 76), DESCENT);
  assert.equal(r.u32(r.tables.post.off + 12), 1, 'post: fixed pitch');
  assert.deepEqual([r.u16(r.tables.gasp.off), r.u16(r.tables.gasp.off + 2), r.u16(r.tables.gasp.off + 4), r.u16(r.tables.gasp.off + 6)], [1, 1, 0xffff, 1], 'gasp: grid-fit, no smoothing, every size');
});

test('every character maps to its own glyph, and every glyph, rasterized at its cell centres, is the glyph table', () => {
  const r = reader(FILE), cmap = r.tables.cmap.off;
  const recs = Array.from({ length: r.u16(cmap + 2) }, (_, i) => [r.u16(cmap + 4 + 8 * i), r.u16(cmap + 6 + 8 * i), r.u32(cmap + 8 + 8 * i)]);
  assert.deepEqual(recs.map(([p, e]) => [p, e]), [[0, 3], [3, 1]]);
  const sub = cmap + recs[1][2], segs = r.u16(sub + 6) / 2;
  assert.equal(r.u16(sub), 4);
  const lookup = (code) => { for (let s = 0; s < segs; s++) { const end = r.u16(sub + 14 + 2 * s), start = r.u16(sub + 16 + 2 * segs + 2 * s); if (code <= end && code >= start) { assert.equal(r.u16(sub + 16 + 6 * segs + 2 * s), 0); return (code + r.u16(sub + 16 + 4 * segs + 2 * s)) % 65536; } } return 0; };
  const seen = new Set();
  for (const ch of CHARSET) {
    const gid = lookup(ch.charCodeAt(0));
    assert.ok(gid > 0 && !seen.has(gid), 'a glyph of its own for ' + ch);
    seen.add(gid);
    const contours = glyphOf(r, FILE, gid);
    for (let row = 0; row < 9; row++) for (let col = 0; col < 5; col++) {
      const on = winding(contours, col * U + U / 2, (6 - row) * U + U / 2) !== 0;
      assert.equal(on, GLYPHS[ch][row][col] === '#', ch + ' row ' + row + ' col ' + col);
    }
    for (const c of contours) for (const [x, y] of c) assert.ok(x % U === 0 && y % U === 0, 'a corner off the grid');   // every corner on the pixel grid
  }
  assert.equal(lookup(0x24), 0, 'no dollar sign'); assert.equal(lookup(0x20ac), 0, 'no euro');
  const names = r.tables.name.off, count = r.u16(names + 2), strOff = names + r.u16(names + 4), text = {};
  for (let i = 0; i < count; i++) { const at = names + 6 + 12 * i, id = r.u16(at + 6), len = r.u16(at + 8), off = r.u16(at + 10); text[id] = String.fromCharCode(...Array.from({ length: len / 2 }, (_, k) => r.u16(strOff + off + 2 * k))); }
  assert.deepEqual([text[1], text[2], text[4], text[6]], ['PixelWhisperer', 'Regular', 'PixelWhisperer Regular', 'PixelWhisperer-Regular']);
  assert.equal(text[0], NOTICE);
  assert.ok(text[0].includes('Powered by the Konomi architecture, created by Thomas Frumkin'));
});

test('the font regenerates byte for byte from the glyph table, and rectangles merge as they should', () => {
  const a = ttfOf(GLYPHS, { notice: NOTICE }), b = ttfOf(GLYPHS, { notice: NOTICE });
  assert.equal(a.ok, true); assert.ok(Buffer.from(a.ttf).equals(Buffer.from(b.ttf)));
  assert.ok(Buffer.from(fontFiles().get('PixelWhisperer.ttf')).equals(Buffer.from(FILE)), 'the committed file is what the table makes');
  assert.equal(a.glyphs, CHARSET.length + 1);
  assert.deepEqual(rectsOf(GLYPHS.I), [[1, 4, 0, 0], [2, 3, 1, 5], [1, 4, 6, 6]]);
  assert.deepEqual(rectsOf(GLYPHS['|']), [[2, 3, 0, 8]]);
  assert.deepEqual(rectsOf(['#.#..', '#.#..', '.....', '#####', '.....', '.....', '.....', '.....', '.....']), [[0, 1, 0, 1], [2, 3, 0, 1], [0, 5, 3, 3]]);
  assert.deepEqual(rectsOf(GLYPHS[' ']), []);
  for (const [n, sr, es] of [[7, 16, 3], [15, 32, 4], [8, 16, 3], [3, 8, 2]]) {   // n characters make n + 1 segments: the binary-search fields follow
    const tbl = { ' ': GLYPHS[' '] }; for (let i = 1; i < n; i++) tbl[String.fromCharCode(64 + i)] = GLYPHS.A;
    const f = ttfOf(tbl), rr = reader(f.ttf), sub = rr.tables.cmap.off + 20, segs = n + 1;
    assert.deepEqual([rr.u16(sub + 6), rr.u16(sub + 8), rr.u16(sub + 10), rr.u16(sub + 12)], [2 * segs, sr, es, 2 * segs - sr], n + ' characters');
  }
  const small = ttfOf({ ' ': GLYPHS[' '], A: GLYPHS.A }, { family: 'Tiny', version: '2.500' });
  assert.equal(small.ok, true);
  const r = reader(small.ttf);
  assert.equal(r.u32(r.tables.head.off + 4), 2 * 65536 + 32768, 'version 2.500 as 16.16');
  assert.equal(r.u16(r.tables.maxp.off + 4), 3);
});

test('a bad glyph table or bad options are refused with a reason, never thrown', () => {
  const ok = { ' ': GLYPHS[' '], A: GLYPHS.A };
  for (const [t, why] of [[null, /object/], [[], /object/], ['x', /object/], [{}, /from 1 to 1000/], [{ ...ok, '\ud800': GLYPHS.A }, /one printable/], [{ ...ok, '\udfff': GLYPHS.A }, /one printable/], [{ ...ok, '\uffff': GLYPHS.A }, /one printable/], [{ ...ok, '\x1f': GLYPHS.A }, /one printable/], [{ A: GLYPHS.A }, /space/], [{ ...ok, AB: GLYPHS.A }, /one printable/], [{ ...ok, '\n': GLYPHS.A }, /one printable/], [{ ...ok, '\ud83d': GLYPHS.A }, /one printable/],
    [{ ...ok, B: GLYPHS.A.slice(1) }, /9 rows/], [{ ...ok, B: [...GLYPHS.A.slice(1), '..#'] }, /9 rows/], [{ ...ok, B: [...GLYPHS.A.slice(1), '..x..'] }, /9 rows/], [{ ...ok, B: 'A' }, /9 rows/]]) {
    const r = ttfOf(t);
    assert.equal(r.ok, false); assert.match(r.why, why);
  }
  for (const [o, why] of [[{ family: 'Pixel Whisperer' }, /family/], [{ family: '9lives' }, /family/], [{ family: 'x'.repeat(32) }, /family/], [{ version: '1.0' }, /version/], [{ version: 1 }, /version/], [{ notice: 'x'.repeat(401) }, /notice/], [{ notice: 'café' }, /notice/]]) {
    const r = ttfOf(ok, o);
    assert.equal(r.ok, false); assert.match(r.why, why);
  }
  for (const x of [undefined, 5n, Symbol('s'), new Proxy({}, { ownKeys() { throw new Error('x'); } }), { get A() { throw new Error('x'); }, ' ': GLYPHS[' '] }]) assert.doesNotThrow(() => { const r = ttfOf(x); assert.equal(r.ok, false); });
  assert.equal(ttfOf({ ...ok, B: GLYPHS.B }, { notice: '' }).ok, true);
  for (const ch of ['\ud7ff', '\ue000', '\ufffe', '!']) assert.equal(ttfOf({ ...ok, [ch]: GLYPHS.A }).ok, true, 'the edges of what is allowed: ' + ch.charCodeAt(0).toString(16));
  assert.equal(ttfOf(ok, { notice: 'n'.repeat(400) }).ok, true, 'a 400-character notice is allowed');
  const many = { ...ok }; for (let i = 0; i < 998; i++) many[String.fromCharCode(0x4e00 + i)] = GLYPHS.A;
  assert.equal(Object.keys(many).length, 1000);
  assert.equal(ttfOf(many).ok, true, '1000 glyphs are allowed');
  many['\u9fff'] = GLYPHS.A;
  assert.match(ttfOf(many).why, /from 1 to 1000/);
});

test('the font writer keeps the kernel rules', () => {
  assert.deepEqual(violations(readFileSync(new URL('./ttf.mjs', import.meta.url), 'utf8')), []);
});
