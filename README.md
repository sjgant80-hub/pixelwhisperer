# pixelwhisperer

> **Live: https://sjgant80-hub.github.io/pixelwhisperer/kards/** - PixelWhisperer Kards, the pixel-art engine that draws the face of every Kardlings card. Gallery, theme switcher, make-your-own, and the proof, all drawn in your browser by the same file the card uses.

## PixelWhisperer Kards - the art engine for Kardlings cards

Built by **Kar**, the estate's resident builder, as a side build for PixelWhisperer (the author's original kernel, below, is untouched). Powered by the Konomi architecture, created by Thomas Frumkin.

`kards/kardart.mjs` draws the face of a Kardlings card from the card's own facts and nothing else: a **Kardling** born from the card's id, in a neon **synthwave** world, on a **blockcraft** island, on a four-shade **pocket LCD**, in a **Memphis**-pop collage or as a **blueprint** (an engineering drawing with its dimensions), with the title, level, rarity, dataset, department, lineage and id printed in a built-in pixel font. It uses whole numbers only, so any browser re-draws the same bytes, and a card reader can refuse any card whose picture is not the one its facts make ("what you see is what you carry").

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

`facts = { id (16 lowercase hex), title (at most 24 of A-Za-z0-9 space & ' . -), dataset (telco | shop | bank | adult | hospital | credit | custom), department (at most 16 of a-z 0-9 -), stage (0-99), rarity (common | uncommon | rare | epic | legendary), generation (0-99), parents (0-2 ids) }`. Anything else is refused. The Kardlings card calls it with `384 x 560`: the card is 384 x 576 and its top 16 rows are its data band.

Also exported: `checkFacts(facts)` (the same validation on its own: `{ ok, f } | { ok: false, why }`) and `spriteOf(id)` (the Kardling an id makes).

- **Integer arithmetic only** in drawing: no `Math.sin / cos / sqrt / pow / random`, no `Date`, no float literal. A test reads the source and fails if one appears.
- **`THEMES` is append-only.** A published theme is never changed: a redesign is a new id (`synthwave-v2`), so old cards still re-draw exactly. Pinned sha256 hashes guard every published theme (`kards/kardart.pins.mjs`).
- **Vendoring:** `kards/kardart.mjs` has no imports. Copy that one file, byte for byte, at a named commit.

### Prove it

```
node --test kards/*.test.mjs        # determinism pins, refusals, every fact shows, 1,000 ids -> 1,000 Kardlings, static source check
node witness-kards.mjs              # the mutation witness over kardart, kardpng, ui, ttf, estate, arena, raid, gear, back, fusion, build and costcase: every mutant killed, none baselined
node tools/kards-font.mjs           # write the UI font (kards/fonts/); --check for CI
node tools/kards-gallery.mjs        # write kards/gallery/ (contact sheets, hero cards); --all for every card; --check for CI
node tools/kards-pins.mjs <themeId> # print the pins for a NEW theme
```

CI (`.github/workflows/kards.yml`) runs all of it on every push. Preview PNGs come from `kards/kardpng.mjs`, a tiny deterministic PNG writer (stored deflate, CRC-32). `kards/costcase.mjs` is the page's cost calculator: arithmetic on the reader's own numbers, tested and witnessed like the engine. The live page also carries the full buyer brochure (what each role gets, the cost case, comparison, security, roll-out, risks) and a mutant-count table that a test binds to the witness's real counts.

### Adding a theme

Append a new entry to `THEMES` with a new versioned id, run `node tools/kards-pins.mjs <id>`, paste the output into `kards/kardart.pins.mjs`, and let the witness prove it. Never edit a published theme to make a red pin green.

### The UI kit and the estate (for the Kardlings game UI)

The game UI is built from the same blocks as the cards, from one source: `kards/kardart.mjs` exports its `FONT`, `ICON_ROWS`, `STAR_ROWS`, `RAR`, `DATASETS`, `RARITIES`, the `PIXEL` drawing kit and `creatureFront(id)`, and everything below builds on those (the four themes' pins are unchanged).

| | |
| --- | --- |
| ![the estate in blockcraft](kards/gallery/estate-blockcraft-v1.png) | ![the UI kit: every glyph and icon](kards/gallery/ui-kit.png) |

- **`kards/ui.mjs`**: `GLYPHS` (char -> 9 rows of 5 cells: the card font plus `: / < > = + % ( ) , ' ’ " ! ? · × ≤ ≥ → ← ✓ ✗ … _ | [ ]` and a real space; 95 glyphs, no currency signs), `CHARSET`, `drawable(s)`, `paintText(text, scale = 2, color = '#ffffff', shadow = null) -> { ok, w, h, px RGBA }`, `UI_ICONS` (dock: estate, base, cards, evals, mint, mesh, send, proof; actions: boot, eval, train, breed, skin, share, verify, key, lock; 16 x 16 rows of `#`), `DOCK`, `ACTIONS`, `DATASET_ICONS`, `STAR`, and `identicon(pubHex, scale = 1) -> { ok, size: 10, cells, colors: { bg, fg, accent, border }, px RGB }` for a 64-hex Ed25519 key.
- **`kards/fonts/PixelWhisperer.ttf`** (+ `pixelwhisperer.css`), written by `node tools/kards-font.mjs` through `kards/ttf.mjs` and checked byte for byte in CI. At `font-size: 9px x k` each glyph pixel is exactly k CSS pixels (ascent 7, descent 2, advance 6). The geometry is exact; a platform rasterizer may still soften edges (Windows smooths vertical edges by about a third of a pixel, and a display whose device pixels are not whole CSS pixels blends them), so draw pixel-perfect headings with `paintText`.
- **`kards/estate.mjs`**: `paintEstate(holdings, themeId, w, h) -> { ok, px RGB, scale } | { ok: false, why }` with `holdings = { cards: [{ id, dataset, stage, rarity, generation, department?, fresh? }], wires?: [[idA, idB]], tools?: n, levels?: n, snapshot?: bool }`, plus `checkHoldings`, `estateStats` and the published formula `tilesFor(n) = min(36, 8 + 2n)` (open tiles in a district holding n blocks; a new player has 16). The same holdings, in any order, draw the same bytes.
- **Vendoring the kit:** copy `kards/kardart.mjs`, `kards/ui.mjs`, `kards/estate.mjs`, `kards/arena.mjs`, `kards/raid.mjs`, `kards/gear.mjs`, `kards/back.mjs`, `kards/fusion.mjs` and `kards/fonts/` byte for byte, side by side, at a named commit (`ui.mjs` imports `./kardart.mjs`; `estate.mjs`, `arena.mjs`, `raid.mjs`, `gear.mjs`, `back.mjs` and `fusion.mjs` import both). `kards/kardpng.mjs` (PNG writer) and `kards/ttf.mjs` (the font builder) are optional.

### The back of every card: the maker's mark

![every theme's back, signed by a maker and unsigned](kards/gallery/backs.png)

`kards/back.mjs`: `paintBack(back, themeId, w, h) -> { ok, px RGB } | { ok: false, why }` with `back = { maker?: the maker's Ed25519 public key (64 lowercase hex), serial?: the edition number (0-999999) }`, and `checkBack(back)`. The back is the card's own 192 x 280 logical pixels, scaled to the nearest pixel for any size from 64 to 1024 (`384 x 560` is a Kardlings card at 2 x): the theme's field and frame, the Kardlings emblem (a K), the maker's identicon (`identicon` from `ui.mjs`, at 5 x) in a medallion with the key written short beneath it, and the edition number. The field's scatter (stars, ore, clouds, confetti) is thrown with the maker's dice, so all of one maker's backs match and another maker's differ; the edition changes only its number. No maker draws UNSIGNED. The pocket screen stays four shades and the blueprint keeps its own inks (the identicon is inked in them). Integer-only, never throws, witnessed with nothing baselined.

### Builds and combos: proven decklists for real jobs

![builds: a combo found, a party, a fusion anti-combo, a training run, a kit not yet measured](kards/gallery/builds.png)

![the job board](kards/gallery/jobs.png)

`kards/build.mjs`: `paintBuild(build, themeId, w, h) -> { ok, px RGB }` (the card's own 192 x 280, scaled; 384 x 560 at 2 x) with `build = { job: { set, title?, bar }, kind: 'kit' | 'party' | 'fusion' | 'training', parts: [{ id, rarity?, role, gate? }] (1 to 6; roles by kind: `ROLES`), gate?, cases?, reruns?, combo?, finder?, method?, student?, reveal? }`; `checkBuild`; the published rule `buildLift(build) -> { lift, best, gate, cleared }` (lift is the build's GATE minus the best GATE among its parts); `buildSigil(build)`, a 16 x 16 eight-fold rune grown from the recipe (its kind, and each part's role and id in order), the same recipe always the same sigil; and `paintJobs({ jobs: [{ set, title?, bar, cleared, builds }] }, themeId, w, h)`, the job board. A build is drawn as a `combo` only when its lift is above zero; one below zero is drawn as an ANTI-COMBO. Which builds are combos is the game's sealed rule (a margin, re-runs from distinct keys); the painter refuses only a combo the numbers cannot carry. A combo's name is never typed: `comboName(build)` grows it from the recipe, two words from the fixed `COMBO_WORDS` tables, and `finder` (the first prover's public key) puts that key's face on the card; `cases` is how many held-out cases it was measured on. A part not held here is `{ id, role }`, drawn as ?. Every theme, integer-only, never throws, witnessed with nothing baselined.

#### The build sheet: a build to share

![build sheets: a combo proven by three keys, an anti-combo, a plain build with one part fielding, five parts fielding of eight](kards/gallery/sheets.png)

![a build sheet at the share size, 1200 x 630](kards/gallery/sheet-share.png)

`paintSheet({ job, receipt, proof?, held? }, themeId, w, h) -> { ok, px RGB }` (400 x 210 logical, scaled to the nearest pixel; 1200 x 630, a link preview's size, at 3 x) reads the game's own records as they are: `receipt` is what the game's `measure()` makes (`{ build, data, parts: [{ card, title, joined, alone, contribution }], fielded, gate, best, lift, n, verdict, name }`) and `proof` what its `proofOf()` makes (`{ proven, keys, finder }`); fields it does not draw are left unread. Each part is a row: its Kardling, its title, its GATE alone and what the build loses without it, the fielding parts first in the order of the build's name (their titles joined by ×), the benched ones dimmed, and with `held` (the card ids this device holds) a ? by each part it does not. The sigil is grown from the build's id. It draws the game's sealed verdict (combo, anti or plain) and refuses a receipt whose numbers do not add up: a lift that is not the gate less the best, a best that is not the highest alone among the fielding parts, a fielded count that is not theirs, a name that is not their titles, a combo or an anti-combo whose lift points the other way, a finder that is not the first key. `checkSheet` reads one without drawing it.

### The campaign: the raids as chapters

![the campaign's six chapters](kards/gallery/chapters.png)

In `kards/raid.mjs`: `paintChapter(chapter, themeId, w, h) -> { ok, px RGB, scale }` with `chapter = { n: 1-99, set: a business (DATASETS), raids: [{ domain: one of its bosses (BOSSES), best: GATE in millionths, fallen }] (up to 5, in the order they are played), world: { best, bar (above best), fallen }, now? }`, and `checkChapter`. Each business is a chapter: its department bosses along a path, then its world boss, a crest bearing the business's icon, whose bar is its own (the best lone card's GATE plus 0.010, cleared by a party). Every health bar is on one scale (a full bar is 0.1 GATE still to find); a fallen boss dims under a gold check and shows no health; the first boss still standing is NEXT; a chapter is CLEARED when every boss has fallen, and a cleared chapter is never NOW. Whether a boss has fallen is the receipts' word, given, not inferred from best. Same size contract as the raid (240 x 160 at a whole scale, 64 to 2048), every theme, witnessed with nothing baselined.

### The Kardlings map: districts and landmarks are doors

![the game's plot with the five landmarks along the shore](kards/gallery/map.png)

In `kards/estate.mjs`: `holdings.landmarks` (any of `arena`, `raids`, `fusion`, `mint`, `proof`: `LANDMARKS`, each once) stands each on its own island in a strip along the bottom of the plot, the door to that game screen. A landmark is drawn only when the holdings name it, so a screen that does not exist yet is never shown as coming; with landmarks the canvas is at least 240 x 200, and `names` may letter them. `estateDoors(holdings, w, h) -> { scale, doors: [{ id, kind: 'district' | 'landmark', name, open, x, y, w, h, poly?, sign? }] }` says where every door is in the picture `paintEstate` draws at that size, in output pixels: a district's ground as the four corners of its top face (`poly`) with the box round them and the box of its name (`sign`), a landmark's share of the strip. `estateDoorAt(holdings, w, h, x, y) -> { door: id | null }` says which door a tap landed on (a landmark's share, then the district under the point by the plot's own grid, then a district's name). Both come from the same layout the picture is drawn from. Without landmarks every published picture is byte for byte the same.

### The Fusion Lab: two cards, fused into one

![the Fusion Lab: ready, fusing, kept and refused](kards/gallery/fusion.png)

![a fused card's family tree](kards/gallery/lineage.png)

`kards/fusion.mjs`: `paintFusion(fusion, themeId, w, h) -> { ok, px RGB, scale }` with `fusion = { a: { id, rarity, gate, title? }, b: { ... }, tried: 1 to MAX_TRIES (12), fused?: { id, rarity, gate, title? }, best?: GATE | null, decided? }` (GATE in whole millionths): what Kardlings keeps of a fusion (`breed()`'s `parents`, `tries`, and the kept child's `id` and `gate`). `checkFusion`, and the published verdict `fusionVerdict(fusion) -> { kept: true | false | null, beat, gate, tried, tries }`: the game's rule, so a fused card whose GATE does not beat both parents is refused and the picture can never show one. A try the game holds no score for is drawn as tried and not kept, never as a made-up bar; a refusal's `best` (the best child, or null for none live) is drawn only when given. `paintLineage({ id, rarity, parents?: [tree, tree] }, themeId, w, h)` draws a fused card over its parents and theirs, four generations, each a block in its rarity with its Kardling; a fused card wears a gold ring, and a card the device does not hold is `{ id }` alone, drawn as a dashed `?`, never invented. Same size contract as the arena (240 x 160 at a whole scale, 64 to 2048), every theme, integer-only, never throws, witnessed with nothing baselined.

### The game around the cards: items, gear, the arena and raids

| Items (`items-synthwave-v1.png`) | The arena and a raid |
| --- | --- |
| ![an app, a pwa, a node and a talker](kards/gallery/items-synthwave-v1.png) | ![a duel](kards/gallery/arena-synthwave-v1.png) ![a raid](kards/gallery/raid-synthwave-v1.png) |

![the eight bosses](kards/gallery/bosses.png)

- **Item cards** (in `kards/kardart.mjs`): `paintArt(facts)` with `facts.form` one of `app | pwa | node | talker | router` draws an item: `{ form, id (16 hex), name (<= 24, the title rule), source (1-20 of A-Za-z0-9 . -), tier: prototype | works | proven }`, the tier being its rarity (common, uncommon, rare). An app is a window, a pwa a phone with a bolt, a node a server, a talker a terminal with a speech bubble, a router (it picks which of its owner's allies answers each case) an antenna, each built as a voxel object so every theme draws it its own way. A scorer card (no form, or `'scorer'`) is drawn exactly as before: every published pin is unchanged. Also exported: `FORMS`, `TIERS`, `GEAR` (`app`/`pwa` a tool, `node`/`router` an ally, `talker` a voice), `FORM_ICON_ROWS`, `itemFront(form, id)` (a 9 x 14 portrait for inventory) and `creatureSide(id)` (a 7 x 14 profile, for the arena).
- **Gear and inventory** (in `kards/ui.mjs`): `UI_ICONS` gains `slot`, `slot-filled`, `equip`, the gear slots `ally`, `tool`, `voice`, and the Kardlings world icons `WORLD_ICONS`: `inbox`, `fuse`, `next`, `world` (the published seventeen are unchanged); `INVENTORY`, `GEAR_SLOTS`, `FITS` (slot to forms, from `GEAR`) and `FORM_ICONS`.
- **`kards/arena.mjs`**: `paintDuel(duel, themeId, w, h) -> { ok, px RGB, scale }` with `duel = { left: { id, rarity, rating 0-9999, title? }, right: { ... }, cases: [[leftHit, rightHit], ...] (1-192, each 0 or 1), decided?, result?: null | 'left' | 'right' | 'refused' | 'draw' }`; `checkDuel`; and the published tally `duelScore(duel) -> { left, right, ties, decided, cases }` (a side ranked a case better when it hit and the other missed). A replay can hold one decided case in focus, the read-back: `focus: { at, truth?: 0 | 1, scores?: [left, right], each mind's raw score in signed millionths (-99 to 99) }` rings that case on the scoreboard and says, under any ending's banner and between the fighters, how each side did on it, its truth and the two scores when given, and which side ranked it better (![a duel read back](kards/gallery/readback.png)). Without `focus` every published duel is byte for byte the same.
- **`kards/raid.mjs`**: `paintRaid(raid, themeId, w, h) -> { ok, px RGB, scale }` with `raid = { dataset, department (one of the eight bosses), best: GATE in millionths or null, attempts?, loot?: { id, rarity, title? } (exactly when best >= 600000) }`; `BOSSES` (hospital admissions, clinical, pharmacy, history, discharge; bank credit; adult employer; credit billing), `bossSprite(key, scale)`, `checkRaid`, and the published rule `bossHealth(best) = max(0, 600000 - best)`.
- **`kards/gear.mjs`** (the kit): `paintSlot(slot, themeId, w, h) -> { ok, px RGB, scale }` with `slot = { kind: 'node' | 'tool', card?: { id, rarity } (a node: another of the owner's cards), worth?: millionths of GATE (-999999..999999), joined?: bool, item?: { id, tier } (a tool: an app item) }` (empty without card or item), a 56 x 64 tile readable at phone size; `kitBadge(fielded, slots 2-4, scale) -> { ok, w, h, px RGBA }`, the overlay that says how many node slots are fielded; `worthText(w)` (+19,727). A duellist in `paintDuel` may carry `kit: { slots, fielded }` for the same pips under its rating. An app item may carry `spdx` (its licence id, at most 16 of A-Za-z0-9 . -), printed beside its slot; its id is the first 16 hex of the sha it was proven at. With `kit: true` an item names its slot in the Kardlings kit's words (`KIT_SLOTS`): a node or router FITS A NODE SLOT, an app or pwa FITS A TOOL SLOT, a talker is a VOICE SLOT; without it the face is the published one.
- **The full estate**: `holdings.items = [{ id, form, tier, fresh? }]` and/or `holdings.swarms = [{ id, members: [card ids] }]` (a consented team of 2 to 36 of the player's cards), in place of `tools`, draw the full plot: all five districts open, each 6 x 6 so `tilesFor` holds to 36 everywhere, on an L of five squares. An app or pwa stands as a tool block, a node a server block, a talker a terminal block, a router an antenna block, and a swarm as a stack of its members' blocks wired to their towers. Holdings of scorer cards alone draw byte for byte as before. `holdings.districts` (SCORER and any of the rest, e.g. `['scorer', 'tools', 'swarm']`, what the Kardlings game holds) draws only those districts, nothing fenced and nothing marked coming; an item or swarm must stand in one of them, and `estateStats` then counts only those tiles. `holdings.names` (on any plot: `{ <a district drawn>: 1-8 of A-Z, 0-9 and space }`) letters a district with the player's own name in place of its own, as Kardlings letters its swarm district `{ swarm: 'KITTED' }`; nothing else moves, the numbers are unchanged, and without it every published picture is byte for byte the same.

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
