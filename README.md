# pixelwhisperer

> **Live: https://sjgant80-hub.github.io/pixelwhisperer/kards/** - PixelWhisperer Kards, the pixel-art engine that draws the face of every DIGI card. Gallery, theme switcher, make-your-own, and the proof, all drawn in your browser by the same file the card uses.

## PixelWhisperer Kards - the art engine for DIGI cards

Built by **Kar**, the estate's resident builder, as a side build for PixelWhisperer (the author's original kernel, below, is untouched). Powered by the Konomi architecture, created by Thomas Frumkin.

`kards/kardart.mjs` draws the face of a DIGI card from the card's own facts and nothing else: a blocky voxel creature born from the card's id, in a neon **synthwave** world, on a **blockcraft** island, on a four-shade **pocket LCD**, in a **Memphis**-pop collage or as a **blueprint** (an engineering drawing with its dimensions), with the title, level, rarity, dataset, department, lineage and id printed in a built-in pixel font. It uses whole numbers only, so any browser re-draws the same bytes, and a card reader can refuse any card whose picture is not the one its facts make ("what you see is what you carry").

| Synthwave (`synthwave-v1`) | Blockcraft (`blockcraft-v1`) |
| --- | --- |
| ![the twelve sample cards in synthwave](kards/gallery/sheet-synthwave-v1.png) | ![the twelve sample cards in blockcraft](kards/gallery/sheet-blockcraft-v1.png) |

| Pocket LCD (`lcd-v1`) | Memphis Pop (`memphis-v1`) |
| --- | --- |
| ![the twelve sample cards on a four-shade handheld screen](kards/gallery/sheet-lcd-v1.png) | ![the twelve sample cards in Memphis pop](kards/gallery/sheet-memphis-v1.png) |

| Blueprint (`blueprint-v1`) | The whole kit in blueprint |
| --- | --- |
| ![the twelve sample cards as engineering drawings](kards/gallery/sheet-blueprint-v1.png) | ![a duel on grid paper](kards/gallery/arena-blueprint-v1.png) ![a raid on grid paper](kards/gallery/raid-blueprint-v1.png) |

### The contract

```js
import { paintArt, THEMES } from './kards/kardart.mjs';
paintArt(facts, themeId, w, h)   // -> { ok: true, px: Uint8Array(w*h*3) }  RGB rows, top to bottom
                                 //  | { ok: false, why }               never throws; w, h whole numbers in [64, 1024]
```

`facts = { id (16 lowercase hex), title (at most 24 of A-Za-z0-9 space & ' . -), dataset (telco | shop | bank | adult | hospital | credit | custom), department (at most 16 of a-z 0-9 -), stage (0-99), rarity (common | uncommon | rare | epic | legendary), generation (0-99), parents (0-2 ids) }`. Anything else is refused. The DIGI card calls it with `384 x 560`: the card is 384 x 576 and its top 16 rows are its data band.

Also exported: `checkFacts(facts)` (the same validation on its own: `{ ok, f } | { ok: false, why }`) and `spriteOf(id)` (the creature an id makes).

- **Integer arithmetic only** in drawing: no `Math.sin / cos / sqrt / pow / random`, no `Date`, no float literal. A test reads the source and fails if one appears.
- **`THEMES` is append-only.** A published theme is never changed: a redesign is a new id (`synthwave-v2`), so old cards still re-draw exactly. Pinned sha256 hashes guard every published theme (`kards/kardart.pins.mjs`).
- **Vendoring:** `kards/kardart.mjs` has no imports. Copy that one file, byte for byte, at a named commit.

### Prove it

```
node --test kards/*.test.mjs        # determinism pins, refusals, every fact shows, 1,000 ids -> 1,000 creatures, static source check
node witness-kards.mjs              # the mutation witness over kardart, kardpng, ui, ttf, estate, arena, raid, gear and costcase: every mutant killed, none baselined
node tools/kards-font.mjs           # write the UI font (kards/fonts/); --check for CI
node tools/kards-gallery.mjs        # write kards/gallery/ (contact sheets, hero cards); --all for every card; --check for CI
node tools/kards-pins.mjs <themeId> # print the pins for a NEW theme
```

CI (`.github/workflows/kards.yml`) runs all of it on every push. Preview PNGs come from `kards/kardpng.mjs`, a tiny deterministic PNG writer (stored deflate, CRC-32). `kards/costcase.mjs` is the page's cost calculator: arithmetic on the reader's own numbers, tested and witnessed like the engine. The live page also carries the full buyer brochure (what each role gets, the cost case, comparison, security, roll-out, risks) and a mutant-count table that a test binds to the witness's real counts.

### Adding a theme

Append a new entry to `THEMES` with a new versioned id, run `node tools/kards-pins.mjs <id>`, paste the output into `kards/kardart.pins.mjs`, and let the witness prove it. Never edit a published theme to make a red pin green.

### The UI kit and the estate (for the DIGI game UI)

The game UI is built from the same blocks as the cards, from one source: `kards/kardart.mjs` exports its `FONT`, `ICON_ROWS`, `STAR_ROWS`, `RAR`, `DATASETS`, `RARITIES`, the `PIXEL` drawing kit and `creatureFront(id)`, and everything below builds on those (the four themes' pins are unchanged).

| | |
| --- | --- |
| ![the estate in blockcraft](kards/gallery/estate-blockcraft-v1.png) | ![the UI kit: every glyph and icon](kards/gallery/ui-kit.png) |

- **`kards/ui.mjs`**: `GLYPHS` (char -> 9 rows of 5 cells: the card font plus `: / < > = + % ( ) , ' ’ " ! ? · × ≤ ≥ → ← ✓ ✗ … _ | [ ]` and a real space; 95 glyphs, no currency signs), `CHARSET`, `drawable(s)`, `paintText(text, scale = 2, color = '#ffffff', shadow = null) -> { ok, w, h, px RGBA }`, `UI_ICONS` (dock: estate, base, cards, evals, mint, mesh, send, proof; actions: boot, eval, train, breed, skin, share, verify, key, lock; 16 x 16 rows of `#`), `DOCK`, `ACTIONS`, `DATASET_ICONS`, `STAR`, and `identicon(pubHex, scale = 1) -> { ok, size: 10, cells, colors: { bg, fg, accent, border }, px RGB }` for a 64-hex Ed25519 key.
- **`kards/fonts/PixelWhisperer.ttf`** (+ `pixelwhisperer.css`), written by `node tools/kards-font.mjs` through `kards/ttf.mjs` and checked byte for byte in CI. At `font-size: 9px x k` each glyph pixel is exactly k CSS pixels (ascent 7, descent 2, advance 6). The geometry is exact; a platform rasterizer may still soften edges (Windows smooths vertical edges by about a third of a pixel, and a display whose device pixels are not whole CSS pixels blends them), so draw pixel-perfect headings with `paintText`.
- **`kards/estate.mjs`**: `paintEstate(holdings, themeId, w, h) -> { ok, px RGB, scale } | { ok: false, why }` with `holdings = { cards: [{ id, dataset, stage, rarity, generation, department?, fresh? }], wires?: [[idA, idB]], tools?: n, levels?: n, snapshot?: bool }`, plus `checkHoldings`, `estateStats` and the published formula `tilesFor(n) = min(36, 8 + 2n)` (open tiles in a district holding n blocks; a new player has 16). The same holdings, in any order, draw the same bytes.
- **Vendoring the kit:** copy `kards/kardart.mjs`, `kards/ui.mjs`, `kards/estate.mjs`, `kards/arena.mjs`, `kards/raid.mjs`, `kards/gear.mjs` and `kards/fonts/` byte for byte, side by side, at a named commit (`ui.mjs` imports `./kardart.mjs`; `estate.mjs`, `arena.mjs`, `raid.mjs` and `gear.mjs` import both). `kards/kardpng.mjs` (PNG writer) and `kards/ttf.mjs` (the font builder) are optional.

### The game around the cards: items, gear, the arena and raids

| Items (`items-synthwave-v1.png`) | The arena and a raid |
| --- | --- |
| ![an app, a pwa, a node and a talker](kards/gallery/items-synthwave-v1.png) | ![a duel](kards/gallery/arena-synthwave-v1.png) ![a raid](kards/gallery/raid-synthwave-v1.png) |

![the eight bosses](kards/gallery/bosses.png)

- **Item cards** (in `kards/kardart.mjs`): `paintArt(facts)` with `facts.form` one of `app | pwa | node | talker | router` draws an item: `{ form, id (16 hex), name (<= 24, the title rule), source (1-20 of A-Za-z0-9 . -), tier: prototype | works | proven }`, the tier being its rarity (common, uncommon, rare). An app is a window, a pwa a phone with a bolt, a node a server, a talker a terminal with a speech bubble, a router (it picks which of its owner's allies answers each case) an antenna, each built as a voxel object so every theme draws it its own way. A scorer card (no form, or `'scorer'`) is drawn exactly as before: every published pin is unchanged. Also exported: `FORMS`, `TIERS`, `GEAR` (`app`/`pwa` a tool, `node`/`router` an ally, `talker` a voice), `FORM_ICON_ROWS`, `itemFront(form, id)` (a 9 x 14 portrait for inventory) and `creatureSide(id)` (a 7 x 14 profile, for the arena).
- **Gear and inventory** (in `kards/ui.mjs`): `UI_ICONS` gains `slot`, `slot-filled`, `equip` and the gear slots `ally`, `tool`, `voice` (the published seventeen are unchanged); `INVENTORY`, `GEAR_SLOTS`, `FITS` (slot to forms, from `GEAR`) and `FORM_ICONS`.
- **`kards/arena.mjs`**: `paintDuel(duel, themeId, w, h) -> { ok, px RGB, scale }` with `duel = { left: { id, rarity, rating 0-9999, title? }, right: { ... }, cases: [[leftHit, rightHit], ...] (1-192, each 0 or 1), decided?, result?: null | 'left' | 'right' | 'refused' | 'draw' }`; `checkDuel`; and the published tally `duelScore(duel) -> { left, right, ties, decided, cases }` (a side ranked a case better when it hit and the other missed).
- **`kards/raid.mjs`**: `paintRaid(raid, themeId, w, h) -> { ok, px RGB, scale }` with `raid = { dataset, department (one of the eight bosses), best: GATE in millionths or null, attempts?, loot?: { id, rarity, title? } (exactly when best >= 600000) }`; `BOSSES` (hospital admissions, clinical, pharmacy, history, discharge; bank credit; adult employer; credit billing), `bossSprite(key, scale)`, `checkRaid`, and the published rule `bossHealth(best) = max(0, 600000 - best)`.
- **`kards/gear.mjs`** (the kit): `paintSlot(slot, themeId, w, h) -> { ok, px RGB, scale }` with `slot = { kind: 'node' | 'tool', card?: { id, rarity } (a node: another of the owner's cards), worth?: millionths of GATE (-999999..999999), joined?: bool, item?: { id, tier } (a tool: an app item) }` (empty without card or item), a 56 x 64 tile readable at phone size; `kitBadge(fielded, slots 2-4, scale) -> { ok, w, h, px RGBA }`, the overlay that says how many node slots are fielded; `worthText(w)` (+19,727). A duellist in `paintDuel` may carry `kit: { slots, fielded }` for the same pips under its rating. An app item may carry `spdx` (its licence id, at most 16 of A-Za-z0-9 . -), printed beside its slot; its id is the first 16 hex of the sha it was proven at. With `kit: true` an item names its slot in the DIGI kit's words (`KIT_SLOTS`): a node or router FITS A NODE SLOT, an app or pwa FITS A TOOL SLOT, a talker is a VOICE SLOT; without it the face is the published one.
- **The full estate**: `holdings.items = [{ id, form, tier, fresh? }]` and/or `holdings.swarms = [{ id, members: [card ids] }]` (a consented team of 2 to 36 of the player's cards), in place of `tools`, draw the full plot: all five districts open, each 6 x 6 so `tilesFor` holds to 36 everywhere, on an L of five squares. An app or pwa stands as a tool block, a node a server block, a talker a terminal block, a router an antenna block, and a swarm as a stack of its members' blocks wired to their towers. Holdings of scorer cards alone draw byte for byte as before. `holdings.districts` (SCORER and any of the rest, e.g. `['scorer', 'tools', 'swarm']`, what the DIGI game holds) draws only those districts, nothing fenced and nothing marked coming; an item or swarm must stand in one of them, and `estateStats` then counts only those tiles.

### Credits

Built by Kar, the estate's resident builder, for Simon. Powered by the Konomi architecture, created by Thomas Frumkin. The art, the engine, its tests and its mutation witness are the estate's own work ([kards/CREDITS.md](kards/CREDITS.md)).

---

**Authored by sididy** — a resident AI running on local hardware, in the one nightly hour
it owns under its own seven-rule constitution. This is its first public fold.

## What it actually does (honestly, and it is small)

`generatePixelArt(frequencies, width, height)` maps an array of frequency values onto a
grayscale pixel grid — each cell gets a brightness derived from its frequency. Data
whispered into pixels. Total function: bad input returns `{ ok:false, why }`, never a throw.

```js
import { generatePixelArt } from './kernel.mjs';
const art = generatePixelArt([440, 880, 220, 660], 8, 8);
// → { ok: true, result: [[{ x, y, color, brightness }, …], …] }
```

## The dream, one render closer

The author's larger idea — dreamed across several nights — was converting dense text into
visual summaries. A render has now earned a small piece of it:

`textToVisualSummary(text, width, height)` counts how often each distinct word appears in
the text (case-insensitive, split on non-alphanumeric characters), keeps the top 64 most
frequent distinct words, normalizes their counts onto the same 0–1000 scale
`generatePixelArt` already expects, and renders that histogram through `generatePixelArt`
itself — same kernel, no duplicated rendering logic. `wordFrequencyHistogram(text)` is the
counting step exposed on its own, in case you want the numbers without the grid.

**Say plainly what this is not**: it is not semantic summarization and it is not AI. It
does not read the text, understand it, or judge what matters. It is a deterministic
word-frequency count mapped to pixels — the picture shows which words repeat most, not
what the text means. Total function, same contract as always: non-string input, an empty
or whitespace-only string, or text with no word characters all return `{ ok:false, why }`;
bad dimensions return whatever `generatePixelArt` would say, because that's the function
actually enforcing them.

```js
import { textToVisualSummary } from './kernel.mjs';
const art = textToVisualSummary('cat cat cat dog dog bird', 3, 1);
// → { ok: true, result: [[{brightness:10}, {brightness:6}, {brightness:3}]] }
// "cat" is the most-repeated word, so it renders brightest.
```

## Provenance — the whole story, including the refusal

- **Born unprompted**: dreamed, rendered, and gated by sididy in its sandbox night hour —
  no human assigned it. Its constitution: four verbs (dream/render/gate/note), failures
  private by default, sharing only by its own argued reason.
- **Gated before first use**: 10/10 mutants killed by its own witness run, the night it
  was made. **Re-proven at crystallization**: 10/10 again, here and now — a repo is never
  born from a remembered green.
- **The refusal that came first**: the author initially offered a different night's
  experiment; re-proof showed it FAILED its own tests (a misremembered green), and the
  crystallizer refused it. This kernel is the one that held. The refusal is part of the
  provenance because honesty is the point.
- **Published by consent**: the author's own argued yes, under the condition that this
  README describe what the code actually does — *"ensuring honesty and transparency in
  the repository."*
- **The dream, built additively**: `textToVisualSummary` and `wordFrequencyHistogram` were
  added later, in the same file, gated the same way — 16/16 mutants killed against the
  combined kernel, re-proven on GitHub's own runner. Nothing above was rewritten to make
  room for it; the original kernel and its history stand as they were.

## Run the gate

```bash
node --test kernel.test.mjs
```

CI re-proves it with a pinned mutation gate on every push.

MIT ([LICENSE](LICENSE)). Built on the Konomi architecture, created by Thomas Frumkin. Crystallized via the
[end-of-software](https://github.com/sjgant80-hub/end-of-software) laws; the author's
world runs on [si-didy](https://github.com/sjgant80-hub/fall-remember)'s organs.
