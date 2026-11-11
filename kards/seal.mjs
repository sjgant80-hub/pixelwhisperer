// seal.mjs - the sealed card: a Kardlings card as one PNG file that carries its own record, and the reader that turns it
// face up only when the file is exactly the file its record makes.
//
// Written by Kar for PixelWhisperer Kards. sealCard paints a card's face with kardart.mjs, writes it with kardpng.mjs, and
// puts the card's record (its facts, its theme, its size, and its back when it has one) in one tEXt chunk right after the
// header. openCard reads a file back: it takes the record the file carries, makes the whole file again from that record,
// and compares every byte. Equal: the card turns face up. Not equal: it stays face down, with the reason in plain words (how
// many pixels differ and where the first one is, or that the file carries something besides its face and its record).
// Integer-only, pure, never throws. It proves the face matches the record; it does not check a signature: the Kardlings
// game checks that, with the maker's key.
import { paintArt, checkFacts, THEMES } from './kardart.mjs';
import { checkBack } from './back.mjs';
import { pngOf, crc32 } from './kardpng.mjs';

/** The tEXt keyword a sealed card's record sits under. */
export const KEYWORD = 'kardlings-card';
/** The longest record a card carries, in characters (a full card's record is under 400). */
export const RECORD_MAX = 2048;
/** The largest file openCard reads: a 1024 x 1024 card with its record fits well inside it. */
export const FILE_MAX = 3200000;

const SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const no = (why) => ({ ok: false, why });
const isObj = (x) => typeof x === 'object' && x !== null && !Array.isArray(x);
const dim = (n) => Number.isInteger(n) && n >= 64 && n <= 1024;
const bytes = (s) => Uint8Array.from(s, (c) => c.charCodeAt(0));
const chars = (u8) => Array.from(u8, (b) => String.fromCharCode(b)).join('');
const u32 = (b, at) => ((b[at] << 24) | (b[at + 1] << 16) | (b[at + 2] << 8) | b[at + 3]) >>> 0;
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const KEY = bytes(KEYWORD + '\0');

function join(parts) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  parts.reduce((at, p) => { out.set(p, at); return at + p.length; }, 0);
  return out;
}
function chunk(type, data) {
  const body = join([bytes(type), data]), n = data.length;
  const c = crc32(body);
  return join([Uint8Array.of(n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255), body, Uint8Array.of(c >>> 24, (c >>> 16) & 255, (c >>> 8) & 255, c & 255)]);
}

/** A card read once into the one form a sealed file carries. card: { facts, theme, w, h, back? } (facts as kardart.mjs's
 *  checkFacts reads them; back as back.mjs's checkBack reads it). -> { ok: true, card, text (the record, as carried) } |
 *  { ok: false, why }. Every field is written out, in one order, so one card has one record. */
export function recordOf(card) {
  try {
    if (!isObj(card)) return no('the card must be an object');
    const { facts, theme, w, h, back = null } = card;
    const c = checkFacts(facts);
    if (!c.ok) return c;
    if (typeof theme !== 'string' || !Object.prototype.hasOwnProperty.call(THEMES, theme)) return no('unknown theme');
    if (!dim(w) || !dim(h)) return no('width and height must be whole numbers from 64 to 1024');
    const f = c.f, out = { v: 1, theme, w, h };
    out.facts = f.form ? { form: f.form, id: f.id, name: f.name, source: f.source, tier: f.tier, spdx: f.spdx, kit: f.kit, retires: f.retires }
      : { id: f.id, title: f.title, dataset: f.dataset, department: f.department, stage: f.stage, rarity: f.rarity, generation: f.generation, parents: f.parents };
    if (back !== null) {
      const b = checkBack(back);
      if (!b.ok) return b;
      out.back = { maker: b.b.maker, serial: b.b.serial };
    }
    return { ok: true, card: out, text: JSON.stringify(out) };
  } catch (e) { return no('the card could not be read'); }
}

/** Seal a card: its face painted, written as a PNG, with its record in a tEXt chunk after the header.
 *  -> { ok: true, png: Uint8Array, card, px (the face, RGB) } | { ok: false, why }. The same card always makes the same file. */
export function sealCard(card) {
  try {
    const r = recordOf(card);
    if (!r.ok) return r;
    const C = r.card, px = paintArt(C.facts, C.theme, C.w, C.h).px, file = pngOf(px, C.w, C.h).png;
    return { ok: true, png: join([file.subarray(0, 33), chunk('tEXt', join([KEY, bytes(r.text)])), file.subarray(33)]), card: C, px };
  } catch (e) { return no('the card could not be sealed'); }
}

/** Open a card file. -> { ok: true, face: 'up', card, px } when the file is exactly the file its record makes;
 *  { ok: true, face: 'down', card, why, differ (pixels that differ, or 0 when only the rest of the file does), at ({ x, y } of
 *  the first, or null) } when it carries a card but is not that file; { ok: false, why } when it is not a card file at all.
 *  Never throws. */
export function openCard(file) {
  try { return open(file); } catch (e) { return no('the file could not be read'); }
}

function open(file) {
  if (!(file instanceof Uint8Array)) return no('a card file must be bytes (a Uint8Array)');
  if (file.length > FILE_MAX) return no('the file is larger than any card');
  if (SIG.some((b, i) => file[i] !== b)) return no('this is not a PNG file');   // a file shorter than the signature fails here too
  const chunks = [];
  for (let at = 8; at < file.length; ) {
    if (file.length - at < 12) return no('the file ends in the middle of a chunk');
    const n = u32(file, at);
    if (n > file.length - at - 12) return no('a chunk runs past the end of the file');
    const body = file.subarray(at + 4, at + 8 + n);
    if (crc32(body) !== u32(file, at + 8 + n)) return no('a chunk is damaged: its checksum does not match');
    chunks.push({ type: chars(body.subarray(0, 4)), data: body.subarray(4) });
    at += 12 + n;
  }
  const recs = chunks.filter((c) => c.type === 'tEXt' && same(c.data.subarray(0, KEY.length), KEY));
  if (recs.length !== 1) return no(recs.length ? 'the file carries more than one card record' : 'this picture carries no Kardlings card record');
  const raw = recs[0].data.subarray(KEY.length);
  if (raw.length > RECORD_MAX || raw.some((b) => b < 32 || b > 126)) return no('the card record is not plain text of at most ' + RECORD_MAX + ' characters');
  let rec = null;
  try { rec = JSON.parse(chars(raw)); } catch (e) { return no('the card record is not readable'); }
  if (!isObj(rec) || rec.v !== 1) return no('the card record is not one this reader knows');
  const made = sealCard(rec);
  if (!made.ok) return no('the card record is not a card: ' + made.why);
  if (same(made.png, file)) return { ok: true, face: 'up', card: made.card, px: made.px };
  return { ok: true, face: 'down', card: made.card, ...explain(chunks, made) };
}

// why a file that carries a card is not the file its record makes
function explain(chunks, made) {
  const C = made.card, head = chunks.find((c) => c.type === 'IHDR');
  if (!head || !same(head.data, made.png.subarray(16, 29))) return { why: 'its picture is not the size or kind its record names (' + C.w + ' x ' + C.h + ', 8-bit colour)', differ: null, at: null };
  const px = pixels(join(chunks.filter((c) => c.type === 'IDAT').map((c) => c.data)), C.w, C.h);
  if (px === null) return { why: 'its pixels are not stored the way a sealed card stores them (saved again by another program?): seal it again from its record', differ: null, at: null };
  let n = 0, first = -1;
  px.forEach((v, i) => {   // each pixel once, at its red byte; no bound to write, so none to get wrong
    if (i % 3 !== 0 || (v === made.px[i] && px[i + 1] === made.px[i + 1] && px[i + 2] === made.px[i + 2])) return;
    if (first < 0) first = i / 3;
    n++;
  });
  if (n === 0) return { why: 'its face is the one its record draws, but the file carries more than its face and its record', differ: 0, at: null };
  const at = { x: first % C.w, y: Math.floor(first / C.w) };
  return { why: n + (n === 1 ? ' pixel differs' : ' pixels differ') + ' from the face its record draws; the first is at x ' + at.x + ', y ' + at.y, differ: n, at };
}

// the RGB pixels of a sealed card's IDAT data (a zlib stream of stored blocks, filter 0 on every row), or null
function pixels(d, w, h) {
  if (d[0] !== 0x78 || d[1] !== 1) return null;
  const parts = [];
  for (let at = 2, last = 0; last === 0; ) {
    if (at + 5 > d.length || d[at] > 1) return null;
    const n = d[at + 1] | (d[at + 2] << 8);
    if ((n ^ (d[at + 3] | (d[at + 4] << 8))) !== 0xffff) return null;
    last = d[at];
    parts.push(d.subarray(at + 5, at + 5 + n));
    at += 5 + n;
  }
  const raw = join(parts), row = 1 + w * 3;
  if (raw.length !== h * row) return null;
  const px = new Uint8Array(w * h * 3);
  for (let y = 0; y < h; y++) {
    if (raw[y * row] !== 0) return null;
    px.set(raw.subarray(y * row + 1, (y + 1) * row), y * w * 3);
  }
  return px;
}

export default { KEYWORD, RECORD_MAX, FILE_MAX, recordOf, sealCard, openCard };
