// ttf.mjs - a deterministic TrueType writer for a 5 x 9 pixel font, so a DIGI screen's labels are real, selectable,
// accessible text in the very glyphs the cards are drawn with.
//
// Built by Kar for the PixelWhisperer repo. Powered by the Konomi architecture, created by Thomas Frumkin.
//
// Every glyph pixel is a square of 128 font units and the em is 9 pixels (1152 units), so at font-size 9k px one glyph
// pixel is exactly k CSS pixels; the baseline sits under row 6, ascent 7 pixels, descent 2, and every advance is 6 pixels.
// Pixels are merged into rectangles (a run across a row, carried down while the next row repeats it), each one clockwise
// contour of on-curve points. No hinting, no clock: the same glyph table gives the same bytes, so the file regenerates
// byte for byte (tools/kards-font.mjs --check). Integer arithmetic only. Bad input is { ok: false, why }, never a throw.
const no = (why) => ({ ok: false, why });
export const U = 128, EM = 9 * U, ADVANCE = 6 * U, ASCENT = 7 * U, DESCENT = 2 * U;
const STAMP = 3875385600;   // created and modified: 2026-10-21 00:00 UTC in seconds since 1904, fixed so the file regenerates byte for byte

const be16 = (n) => [(n >> 8) & 255, n & 255];
const be32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const pad4 = (bytes) => bytes.concat(new Array((4 - (bytes.length % 4)) % 4).fill(0));
/** The OpenType table checksum: the sum of the table's big-endian 32-bit words, zero-padded. */
export function checksum(bytes) {
  const b = pad4(Array.from(bytes));
  return Array.from({ length: b.length >> 2 }, (_, w) => ((b[4 * w] << 24) | (b[4 * w + 1] << 16) | (b[4 * w + 2] << 8) | b[4 * w + 3]) >>> 0).reduce((sum, v) => (sum + v) >>> 0, 0);
}
const log2floor = (n) => { let k = 0; while (2 << k <= n) k++; return k; };   // the largest k with 2^k <= n (n >= 1)
const utf16 = (s) => Array.from(s).flatMap((ch) => be16(ch.charCodeAt(0)));

/** A glyph's pixels as rectangles [c0, c1, rowTop, rowBottom]: each row's runs, carried down while the next row repeats them. */
export function rectsOf(rows) {
  const done = [];
  let open = [];
  rows.forEach((row, r) => {
    const runs = [];
    Array.from(row).forEach((ch, c) => { if (ch === '#' && row[c - 1] !== '#') { let e = c; while (row[e + 1] === '#') e++; runs.push([c, e + 1]); } });
    const next = [];
    for (const [c0, c1] of runs) { const o = open.find((q) => q[0] === c0 && q[1] === c1); if (o) { o[3] = r; next.push(o); } else next.push([c0, c1, r, r]); }
    for (const q of open) if (!next.includes(q)) done.push(q);
    open = next;
  });
  return done.concat(open).sort((p, q) => p[2] - q[2] || p[0] - q[0]);
}

// a glyph's outline: rectangles as clockwise contours (y up, the baseline under row 6), plus a hollow box for .notdef
function outline(rows) {
  return rectsOf(rows).map(([c0, c1, r0, r1]) => { const x0 = c0 * U, x1 = c1 * U, yt = (7 - r0) * U, yb = (6 - r1) * U; return [[x0, yt], [x1, yt], [x1, yb], [x0, yb]]; });
}
const NOTDEF = [[[0, ASCENT], [5 * U, ASCENT], [5 * U, 0], [0, 0]], [[U, U], [4 * U, U], [4 * U, 6 * U], [U, 6 * U]]];   // a box, its hole counter-clockwise
function glyf(contours) {
  if (!contours.length) return { bytes: [], box: [0, 0, 0, 0], points: 0, contours: 0 };
  const pts = contours.flat(), xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const box = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  const ends = [];
  contours.reduce((n, c) => { ends.push(n + c.length - 1); return n + c.length; }, 0);
  const dx = [], dy = [];
  pts.reduce(([px, py], [x, y]) => { dx.push(...be16(x - px)); dy.push(...be16(y - py)); return [x, y]; }, [0, 0]);
  const bytes = [...be16(contours.length), ...box.flatMap(be16), ...ends.flatMap(be16), ...be16(0), ...new Array(pts.length).fill(1), ...dx, ...dy];
  return { bytes: pad4(bytes), box, points: pts.length, contours: contours.length };
}

/**
 * Build a TrueType font from a glyph table { char: 9 rows of 5 cells, '#' on and '.' off } that holds a space.
 * opts: { family = 'PixelWhisperer', version = '1.000', notice } -> { ok: true, ttf: Uint8Array, glyphs (count) } | { ok: false, why }.
 */
export function ttfOf(table, opts = {}) {
  try {
    if (typeof table !== 'object' || table === null || Array.isArray(table)) return no('the glyph table must be an object');
    const chars = Object.keys(table).sort((a, b) => a.charCodeAt(0) - b.charCodeAt(0));
    if (!chars.length || chars.length > 1000) return no('the glyph table must hold from 1 to 1000 glyphs');
    for (const ch of chars) {
      const code = ch.charCodeAt(0), rows = table[ch];
      if (ch.length !== 1 || code < 32 || (code >= 0xd800 && code <= 0xdfff) || code === 0xffff) return no('every key must be one printable character from the basic plane');
      if (!Array.isArray(rows) || rows.length !== 9 || !rows.every((r) => typeof r === 'string' && r.length === 5 && Array.from(r).every((c) => c === '#' || c === '.'))) return no('every glyph must be 9 rows of 5 cells, # or .');
    }
    if (!chars.includes(' ')) return no('the font must hold a space');
    const family = opts.family === undefined ? 'PixelWhisperer' : opts.family, version = opts.version === undefined ? '1.000' : opts.version;
    if (typeof family !== 'string' || !/^[A-Za-z][A-Za-z0-9]{0,30}$/.test(family)) return no('the family must be 1 to 31 letters and digits, starting with a letter');
    if (typeof version !== 'string' || !/^\d{1,3}\.\d{3}$/.test(version)) return no('the version must look like 1.000');
    const notice = opts.notice === undefined ? '' : opts.notice;
    if (typeof notice !== 'string' || notice.length > 400 || !/^[\x20-\x7e]*$/.test(notice)) return no('the notice must be at most 400 printable ASCII characters');

    const glyphs = [glyf(NOTDEF), ...chars.map((ch) => glyf(outline(table[ch])))];
    const n = glyphs.length, inked = glyphs.filter((g) => g.points);
    const glyfBytes = glyphs.flatMap((g) => g.bytes), loca = [];
    glyphs.reduce((at, g) => { loca.push(...be32(at)); return at + g.bytes.length; }, 0);
    loca.push(...be32(glyfBytes.length));
    const fontBox = [Math.min(...inked.map((g) => g.box[0])), Math.min(...inked.map((g) => g.box[1])), Math.max(...inked.map((g) => g.box[2])), Math.max(...inked.map((g) => g.box[3]))];
    const codes = chars.map((ch) => ch.charCodeAt(0));

    const head = [...be32(0x00010000), ...be32(Number(version.split('.')[0]) * 65536 + div1000(version)), ...be32(0), ...be32(0x5f0f3cf5), ...be16(0x000b), ...be16(EM),
      ...be32(0), ...be32(STAMP), ...be32(0), ...be32(STAMP), ...fontBox.flatMap(be16), ...be16(0), ...be16(9), ...be16(2), ...be16(1), ...be16(0)];
    const hhea = [...be32(0x00010000), ...be16(ASCENT), ...be16(-DESCENT), ...be16(0), ...be16(ADVANCE), ...be16(Math.min(...inked.map((g) => g.box[0]))),
      ...be16(Math.min(...inked.map((g) => ADVANCE - g.box[2]))), ...be16(Math.max(...inked.map((g) => g.box[2]))), ...be16(1), ...be16(0), ...be16(0), ...new Array(8).fill(0), ...be16(0), ...be16(n)];
    const hmtx = glyphs.flatMap((g) => [...be16(ADVANCE), ...be16(g.box[0])]);
    const maxp = [...be32(0x00010000), ...be16(n), ...be16(Math.max(...glyphs.map((g) => g.points))), ...be16(Math.max(...glyphs.map((g) => g.contours))),
      ...be16(0), ...be16(0), ...be16(2), ...new Array(16).fill(0)];   // no composites, two zones, no instructions
    const segs = [...codes.map((c, i) => [c, (i + 1 - c + 65536) % 65536]), [0xffff, 1]], sc = segs.length, sr = 2 << log2floor(sc);
    const fmt4 = [...be16(4), ...be16(16 + 8 * sc), ...be16(0), ...be16(2 * sc), ...be16(sr), ...be16(log2floor(sc)), ...be16(2 * sc - sr),
      ...segs.flatMap(([c]) => be16(c)), ...be16(0), ...segs.flatMap(([c]) => be16(c)), ...segs.flatMap(([, d]) => be16(d)), ...segs.flatMap(() => be16(0))];
    const cmap = [...be16(0), ...be16(2), ...be16(0), ...be16(3), ...be32(20), ...be16(3), ...be16(1), ...be32(20), ...fmt4];
    const os2 = [...be16(4), ...be16(ADVANCE), ...be16(400), ...be16(5), ...be16(0), ...[576, 576, 0, 128, 576, 576, 0, 384, U, 3 * U, 0].flatMap(be16),
      2, 0, 5, 9, 0, 0, 0, 0, 0, 0, ...be32(0x80000003), ...be32(0x00008060), ...be32(0), ...be32(0), 0x4b, 0x41, 0x52, 0x44, ...be16(0x00c0),
      ...be16(codes[0]), ...be16(codes[codes.length - 1]), ...be16(ASCENT), ...be16(-DESCENT), ...be16(0), ...be16(ASCENT), ...be16(DESCENT),
      ...be32(1), ...be32(0), ...be16(5 * U), ...be16(7 * U), ...be16(0), ...be16(32), ...be16(1)];
    const names = [[0, notice], [1, family], [2, 'Regular'], [3, family + ':Regular:' + version], [4, family + ' Regular'], [5, 'Version ' + version], [6, family + '-Regular']].filter(([, s]) => s.length);
    const strings = names.map(([, s]) => utf16(s)), recs = [];
    strings.reduce((at, b, i) => { recs.push(...be16(3), ...be16(1), ...be16(0x0409), ...be16(names[i][0]), ...be16(b.length), ...be16(at)); return at + b.length; }, 0);
    const name = [...be16(0), ...be16(names.length), ...be16(6 + 12 * names.length), ...recs, ...strings.flat()];
    const gasp = [...be16(1), ...be16(1), ...be16(0xffff), ...be16(0x0001)];   // every size: grid-fit, no smoothing, so a pixel stays a pixel
    const post = [...be32(0x00030000), ...be32(0), ...be16(-U), ...be16(U), ...be32(1), ...new Array(16).fill(0)];

    const tables = [['OS/2', os2], ['cmap', cmap], ['gasp', gasp], ['glyf', glyfBytes], ['head', head], ['hhea', hhea], ['hmtx', hmtx], ['loca', loca], ['maxp', maxp], ['name', name], ['post', post]];
    const nt = tables.length, srT = 16 << log2floor(nt), dir = [...be32(0x00010000), ...be16(nt), ...be16(srT), ...be16(log2floor(nt)), ...be16(nt * 16 - srT)], body = [];
    let at = 12 + 16 * nt, headAt = 0;
    for (const [tag, bytes] of tables) {
      dir.push(...Array.from(tag).map((c) => c.charCodeAt(0)), ...be32(checksum(bytes)), ...be32(at), ...be32(bytes.length));
      if (tag === 'head') headAt = at;
      const padded = pad4(bytes);
      padded.forEach((x) => body.push(x));   // not push(...padded): a big table would overflow the call stack
      at += padded.length;
    }
    const ttf = new Uint8Array([...dir, ...body]);
    ttf.set(be32((0xb1b0afba - checksum(ttf) + 0x100000000) % 0x100000000), headAt + 8);   // the whole file sums to 0xB1B0AFBA
    return { ok: true, ttf, glyphs: n };
  } catch (e) { return no('the font could not be built'); }
}
const div1000 = (v) => Math.floor((Number(v.split('.')[1]) * 65536) / 1000);   // the fraction of a 16.16 fixed version
