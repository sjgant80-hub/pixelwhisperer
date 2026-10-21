// kardpng.test.mjs - the PNG writer is read back with the platform's own inflate and checked against independent checksums.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inflateSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { crc32, adler32, zlibStored, pngOf } from './kardpng.mjs';
import { paintArt } from './kardart.mjs';
import { SAMPLES } from './samples.mjs';

const refc = (bytes) => { let c = 0xffffffff; for (const b of bytes) { c ^= b; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1; } return (c ^ 0xffffffff) >>> 0; };   // bit by bit, not the writer's table
const refa = (bytes) => { const n = BigInt(bytes.length); let a = 1n, b = n; bytes.forEach((x, i) => { a += BigInt(x); b += BigInt(bytes.length - i) * BigInt(x); }); return Number(((b % 65521n) << 16n) | (a % 65521n)) >>> 0; };   // closed form with BigInt, not the writer's running sums
const ascii = (s) => Uint8Array.from(s, (c) => c.charCodeAt(0));
const rgb = (w, h, f = (i) => (i * 37 + 11) & 255) => Uint8Array.from({ length: w * h * 3 }, (_, i) => f(i));
const u32 = (b, at) => ((b[at] << 24) | (b[at + 1] << 16) | (b[at + 2] << 8) | b[at + 3]) >>> 0;

function read(png) {   // a strict reader: signature, every chunk's CRC, IHDR first, IEND last, one inflated IDAT run
  assert.deepEqual([...png.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const chunks = [];
  for (let at = 8; at < png.length;) {
    const len = u32(png, at), type = String.fromCharCode(...png.subarray(at + 4, at + 8)), body = png.subarray(at + 4, at + 8 + len);
    assert.equal(u32(png, at + 8 + len), refc(body), type + ' crc');
    chunks.push({ type, data: png.subarray(at + 8, at + 8 + len) });
    at += 12 + len;
  }
  assert.deepEqual(chunks.map((c) => c.type), ['IHDR', 'IDAT', 'IEND']);
  assert.equal(chunks[2].data.length, 0);
  const d = chunks[0].data;
  assert.equal(d.length, 13);
  return { w: u32(d, 0), h: u32(d, 4), depth: d[8], colour: d[9], compression: d[10], filter: d[11], interlace: d[12], raw: inflateSync(chunks[1].data) };
}

test('the checksums are the standard ones', () => {
  assert.equal(crc32(ascii('123456789')), 0xcbf43926);
  assert.equal(crc32(new Uint8Array(0)), 0);
  assert.equal(crc32(ascii('IEND')), 0xae426082);
  assert.equal(adler32(ascii('Wikipedia')), 0x11e60398);
  assert.equal(adler32(new Uint8Array(0)), 1);
  const long = rgb(100, 100);
  assert.equal(crc32(long), refc(long));
  for (const bytes of [new Uint8Array(70000).fill(255), long, new Uint8Array([0]), new Uint8Array(65521).fill(1)]) assert.equal(adler32(bytes), refa(bytes));   // runs far past the 65521 modulus
  assert.deepEqual([...zlibStored(new Uint8Array(0))], [0x78, 0x01, 1, 0, 0, 255, 255, 0, 0, 0, 1]);
});

test('a PNG is a real PNG: every chunk checks, and the platform inflates the pixels back', () => {
  for (const [w, h] of [[1, 1], [3, 2], [64, 64], [100, 300], [28, 771], [29, 771], [27, 771], [384, 560], [65, 1], [1, 65]]) {
    const px = rgb(w, h), r = pngOf(px, w, h);
    assert.equal(r.ok, true);
    const png = read(r.png);
    assert.deepEqual([png.w, png.h, png.depth, png.colour, png.compression, png.filter, png.interlace], [w, h, 8, 2, 0, 0, 0]);
    assert.equal(png.raw.length, h * (1 + w * 3));
    for (let y = 0; y < h; y++) {
      assert.equal(png.raw[y * (1 + w * 3)], 0, 'filter byte');
      assert.ok(Buffer.from(png.raw.subarray(y * (1 + w * 3) + 1, (y + 1) * (1 + w * 3))).equals(Buffer.from(px.subarray(y * w * 3, (y + 1) * w * 3))), 'row ' + y);
    }
  }
});

test('stored blocks: exact multiples of 65535 close the stream properly', () => {
  for (const n of [1, 65534, 65535, 65536, 131069, 131070, 131071]) {
    const raw = Uint8Array.from({ length: n }, (_, i) => (i * 7) & 255), z = zlibStored(raw);
    assert.ok(Buffer.from(inflateSync(z)).equals(Buffer.from(raw)), 'length ' + n);
    assert.equal(z.length, 2 + Math.ceil(n / 65535) * 5 + n + 4, 'one 5-byte header per block');
    assert.equal(z[2] & 1, n > 65535 ? 0 : 1, 'only the last block is final');
  }
});

test('a PNG is deterministic and pinned', () => {
  const a = pngOf(rgb(3, 2), 3, 2).png, b = pngOf(rgb(3, 2), 3, 2).png;
  assert.ok(Buffer.from(a).equals(Buffer.from(b)));
  assert.equal(createHash('sha256').update(a).digest('hex'), 'c5b6a4e0e37d747ca573749dcb565995bfb14f584930bd97fe0a6af242dc22c9');
  const card = paintArt(SAMPLES[4], 'synthwave-v1', 384, 560), png = pngOf(card.px, 384, 560);
  assert.equal(png.ok, true);
  assert.equal(read(png.png).raw.length, 560 * (1 + 384 * 3));
  assert.equal(createHash('sha256').update(png.png).digest('hex'), 'aadda9e6a413f9fed7b9fbe30d001ae0066810ea08d6d4568f5aeb8b3047f6d4');
});

test('bad input is refused with the right reason, never thrown', () => {
  const ok = rgb(2, 2), size = /size/, exactly = /exactly/, kind = /Uint8Array/;
  for (const [px, w, h, why] of [[null, 2, 2, kind], [undefined, 2, 2, kind], [[...ok], 2, 2, kind], ['abc', 2, 2, kind], [{ length: 12 }, 2, 2, kind], [new Uint16Array(12), 2, 2, kind],
    [ok, 0, 2, size], [ok, 2, 0, size], [ok, 0, 0, size], [ok, -2, -2, size], [ok, -2, 2, size], [ok, 2, -2, size], [ok, 1.5, 2, size], [ok, 2, 1.5, size], [ok, 2, '2', size], ['2', 2, 2, kind], [ok, NaN, 2, size], [ok, 2, NaN, size], [ok, 2, Infinity, size], [ok, Infinity, 2, size],
    [ok, 65536, 1, size], [ok, 1, 65536, size], [ok, 65536, 65536, size], [ok, 2n, 2, size], [ok, 2, 2n, size], [ok, null, 2, size], [ok, 2, null, size], [ok, 2, undefined, size], [ok, undefined, 2, size],
    [ok, 2, 3, exactly], [ok, 3, 2, exactly], [ok.subarray(1), 2, 2, exactly], [new Uint8Array(0), 2, 2, exactly], [ok, 1, 1, exactly], [new Uint8Array(0), 0, 0, size]]) {
    const r = pngOf(px, w, h);
    assert.equal(r.ok, false, String([px && px.length, w, h]));
    assert.match(r.why, why, String([px && px.length, w, h]));
  }
  assert.equal(pngOf(ok, 2, 2).ok, true);
  assert.equal(pngOf(new Uint8Array(3), 1, 1).ok, true);
  assert.equal(pngOf(new Uint8Array(65535 * 3), 65535, 1).ok, true);   // the largest sides are accepted
  assert.equal(pngOf(new Uint8Array(65535 * 3), 1, 65535).ok, true);
  assert.equal(pngOf(Buffer.from(ok), 2, 2).ok, true);
  const circular = {}; circular.self = circular;
  for (const x of [null, undefined, NaN, '', [], {}, true, 10n, () => {}, circular, Symbol('s'), { get length() { throw new Error('toxic'); } }]) {
    assert.doesNotThrow(() => pngOf(x, 2, 2));
    assert.doesNotThrow(() => pngOf(ok, x, 2));
    assert.doesNotThrow(() => pngOf(ok, 2, x));
  }
});
