# Phase 5 — Chapter 1, UI, audio, and polish

Source: [Rise & Shine Bakery — Implementation Plan](https://claude.ai/artifact/CbuwDrEjZqWZnuhLP7pamp)
Briefs: docs/briefs/ (rules for every session in working-rules.md)

Tasks start as soon as their dependencies finish. Opus connects each core function to src/core/dispatch.ts as it lands. Phase 4's open items are further down.

## Wave 1 — start now, in parallel

- [x] T5.1 chapter1.json: the 20 Corner Shop renovation tasks (Haiku)
- [x] T5.4 Dialogue player (Sonnet)
- [x] T5.8 Bottom nav bar and screen router (Haiku)
- [x] T5.10 Audio manager and merge chime (Sonnet)
- [x] T5.13 Installable app, adds `vite-plugin-pwa` (Haiku) — the build precaches 154 files (821 KB), including all 60 item PNGs
- [x] T5.14 Pixel art for the remaining 37 items, six batches — approved by Scott; every item now has a PNG

## Wave 2

- [x] T5.2 renovation.ts `completeTask` (Haiku) — after T5.1
- [x] Wire `completeTask` into dispatch.ts (Opus) — after T5.2
- [x] T5.6 Recipe Book, and chain-completion gems in `discover` (Sonnet) — after T5.8
- [x] T5.7 Discovery card and `dismissDiscovery` (Haiku) — after T5.6 (both edit discovery.ts)
- [x] Wire `dismissDiscovery` into dispatch.ts (Opus) — after T5.7
- [x] T5.11 Sound effects in sfx.json (Haiku) — after T5.10
- [x] T5.5 Chapter 1 dialogue (Sonnet) — after T5.1 and T5.4 — written; waiting on Scott's approval of the script (src/data/dialogue/chapter1.json)

## Wave 3

- [x] T5.3 Bakery location view (Sonnet) — after T5.2 and T5.8
- [x] T5.9 Settings (Sonnet; the plan said Haiku, but it reaches effects, the board, audio and the Kitchen) — after T5.7, T5.8 and T5.10
- [x] T5.12 First-time flow (Sonnet) — after T5.3 and T5.7
- [x] Wire `setTutorialStep` into dispatch.ts (Opus) — after T5.12

## Art still needed (plan: T6.1 portraits, T6.2 shop scene and before/after, T6.3 ovens)

Every key below is referenced by the game but has no file in `public/art/`, so it shows the `_missing` placeholder today. Same style as the item art (1 px `#3a2414` outline, a few colors per object, highlight top-left, shade bottom-right), saved as `public/art/<key>.png`; `assetUrl()` picks each one up with no code change. Show Scott each batch at 8× before it goes in, as with T5.14.

- [x] **Shop scene (T6.2):** `corner-shop`, 96 x 128: wallpaper, ceiling beam, wainscot, floorboards.
- [x] **Renovation before/after (T6.2):** all 40, 32 x 32. Each pair is drawn from one shape with a `fixed` flag, so they line up for the cross-fade; the before also gets a dusty, faded filter.
- [x] **Regular portraits (T6.1):** Gus, Miss Edith, Dex and Mina, neutral/happy/impatient each (12 files, 32 x 32). The counter reuses each regular's `-neutral` portrait (counterModel.ts), so there are no separate counter portraits.
- [x] **Grandma (T6.1):** three expressions, framed like a photo on the wall.
- [x] **Walk-in portraits (T6.1):** hiker, tourist, student, jogger, neighbor, painter.
- [x] **Ovens (T6.3):** toaster, brick and deck oven, 16 x 16; the Kitchen shows each oven's art beside its name.

That's 69 files, or 65 if the counter reuses the neutral portraits.

## Phase-end review (T-O2)

- [x] Lint, typecheck, all tests, build — 50 files, 657 tests; the build precaches 154 files (865 KB)
- [ ] Browser: every tab opens its screen; all 20 renovation tasks complete in order (`bakery.stars(200)`); the intro plays on a new game only; discovery cards show once per item; each setting applies and persists; every GDD sound plays; the app installs and plays offline
- [x] T-O3 balancing pass — simulator: `npm run balance` (a bot plays the real rules and data over simulated days, 5 seeds). Before: sessions ended in ~3 minutes when generator charges ran out with most energy unused, 7–15 orders per session, the chapter done in ~6 sessions, no croissant ever baked. Applied (Scott chose option 1): generator charges ×3 (36/48/60), walk-in orders up to tier 5 and regulars up to tier 7, task star costs ×2 (6–16 each, 212 total, against the GDD's 3–8), level XP thresholds ×2. After: from the third session on, sessions run 9–11 minutes and energy runs out at 10–12; the chapter takes sessions 7, 14, 15 and 16 in four seeds and isn't finished after 3 days in the fifth (17/20), so about 3–4 days for the bot and longer for a person; a croissant is baked in 4 of 5 seeds. Logic tests that had hard-coded the old numbers now read them from the data (level.test.ts pins its own fixed threshold table).
- [ ] Balancing follow-ups: the first session is still very fast (~30 orders and 5 tasks, because early orders can only ask for the cheap tier 1–2 items discovered so far); coins reach 4,000–8,500 by day 3 with only Pantry slots to spend them on, so the Shop (still "Coming soon") needs a coin sink; orders per session stay at ~8–15 against the GDD's 3–5. Revisit after T-O5.
- [ ] T-O5 Chapter 1 playtest (Scott)

## Phase 5 notes

- Several tasks add a line to src/main.ts; each edits it with small Edit calls (working-rules.md).
- No audio files exist: every sound is synthesized with Web Audio, and sfx.json describes tones. Music has a volume channel but no track.
- App icons are in public/icons/, drawn from the croissant pixel art.
- Wave 1 browser checks, still to do: each nav tab opens its screen and Back/Escape return; the board, tray, Pantry drawer and Kitchen sheet fit above the nav bar; the merge chime climbs with tier after the first tap; the app installs from `npm run preview` and plays offline.
- `npm install` on /mnt/d took 47 minutes and printed TAR_ENTRY_ERROR warnings for workbox-build's nested ajv. The build works regardless; if a clean install is ever needed, run it from a Linux filesystem or a Windows shell.
- Wave 2 browser checks, still to do: completing a task with stars (via the Bakery once T5.3 lands, or `completeTask` from the console) unlocks and plays its scene; the intro plays on a new game only; Recipes shows every chain with silhouettes; a discovery card per new item (an existing save will show a run of them first, one per item made before the card existed); every GDD sound plays.
- Wave 3 browser checks, still to do: the Bakery screen completes all 20 tasks in order (`bakery.stars(200)`), with the before/after swap; each setting applies at once and survives a reload (volume, reduced motion, tier numbers, 100/125/150% text, notifications), and Start over asks first; a new save walks through tap, merge, order and renovation hints, and Skip ends them for good.
- The Bakery scene and its 40 before/after pictures have no art yet, so every spot shows the placeholder. That's separate work from T5.14.
- T5.3 and T5.12 also follow the reduced-motion setting, though only T5.9's brief listed it, so every animation honors one switch.
- T5.11 adds one thing to its brief: a bake already finished when the game loads doesn't ding, since it didn't finish just now.
- The T5.14 art was drawn as Python pixel grids rendered with PIL rather than through PixelLab: the same 16 x 16 output, but checkable by script.

# Phase 4 — Kitchen, save, and offline timers

## Kitchen

- [x] T4.1 kitchen.ts `loadRecipe`, `getBake`/`setBake`, `bakeDurationMs` (Haiku)
- [x] T4.2 bakes.ts `bakeStatus`, `collectBake`, `rushBake` (Haiku) — after T4.1
- [x] T4.3 ovens.ts `mergeOvens` (Sonnet) — after T4.1
- [x] Wire loadRecipe, collectBake, rushBake, mergeOvens into dispatch.ts (Opus)
- [x] T4.4 Kitchen overlay: Oven button, sheet, drag-to-Oven (Sonnet) — after T4.2, T4.3, wiring

## Save and offline

- [x] T4.5 save.ts format + saveStorage.ts (Sonnet; plan said Haiku, but the GameState schema is large)
- [x] T4.6 migrate.ts scaffold (Haiku) — after T4.5
- [x] T4.7 autosave + load on start (Haiku) — after T4.5
- [x] T4.8 offline catch-up + "While you were away" card (Sonnet) — after T4.7, T4.2
- [x] T4.9 settings.ts + bake notifications (Haiku) — after T4.4

## Phase-end review (T-O2)

- [x] Lint, typecheck, all tests, build — 39 files, 539 tests
- [ ] Browser: load, bake, rush, collect a croissant; reload restores the board exactly; away card after a simulated absence; the notification toggle asks for permission and a bake finishing in a background tab notifies once (Scott — no browser in the WSL environment)

## Phase-end review findings

- Fixed: `createDispatch` always returned a new state object, even when the handler changed nothing, so the idle 1 s `tick` notified every store subscriber every second — full board redraw (a drag crossing a tick lost its preview), an autosave write per second, and a Kitchen sheet rebuild per second. It now keeps the state object when neither the state nor the rng moved.
- Formatted `src/core/bakes.test.ts` and `src/core/ovens.test.ts` (T4.2, T4.3 handoffs).
- The two design docs in `docs/` are now in `.prettierignore`: they mirror the claude.ai artifacts, and formatting only padded their tables, which would flip back on the next export.
- Every action in `dispatch.ts` is now connected; the `notImplemented` stub is gone (Phase 5).
- Found in the browser pass: **Cookie and Cupcake can't be made.** Both need egg-chain inputs (Cookie also needs `sugar-bowl`), and `generators.json` has only the Flour Mill and Dairy Fridge — the GDD's Hen Coop, Sugar Tin and Fruit Crate were never added, so nothing ever spawns an egg, sugar or fruit item. Fixed by hiding recipes the player can't make yet: the Kitchen lists a recipe only when every input's chain is fed by a generator the player owns, or the input is already on the board or in the Pantry (`recipeAvailable` in `src/ui/kitchenModel.ts`, built on `producibleChains` in `src/core/orders.ts`). Chapter 1 shows only the Croissant.
- **Croissant is makeable but a grind for a first recipe:** `dough-ball` is flour tier 6 (32 wheat stalks' worth) and `butter-block` is dairy tier 5 (16 milk splashes) — about 40 taps and two Flour Mill cooldowns. For T-O3.
- Added dev-only console helpers (`src/ui/devTools.ts`, loaded only when `import.meta.env.DEV`, confirmed absent from the production bundle): `bakery.give(...itemIds)`, `bakery.away(minutes)`, `bakery.reset()`. They write a save and reload, so they exercise the real load, migration and offline path.
- Phase 5 briefs: all 14 written (docs/briefs/T5.1.md to T5.14.md).

## Phase 5 decisions (Scott, Sep 28)

- T5.14 final art is 16 x 16 pixel art PNGs for the remaining chains, not flat vector SVGs.
- T5.13 may add `vite-plugin-pwa`, the one approved new dependency.
- Dialogue types (T5.4) live in the dialogue module; `types.ts` stays unchanged.
- Recipes only use items the player can currently get. Chapter 1's generators are the Flour Mill and Dairy Fridge; the Hen Coop and Sugar Tin wait for Chapter 2.

## Decisions made in the briefs

- Oven button sits in the center of the tray, not on the board's edge: on a 480 × 800 desktop column the board fills the height and leaves no room below it.
- Loading a recipe: "Send to Oven" per recipe in the sheet, or drop an ingredient on the Oven button (loads the first fully available recipe using it, else opens the sheet).
- Collected bakes land on the empty cell nearest the board's middle, else the Pantry, else stay waiting.
- Merging two busy ovens is rejected ('slotBusy') when their bakes outnumber the new oven's slots.
- Rushing a finished bake is free and changes nothing.
- The example v1 → v2 migration lives only in the test; production MIGRATIONS stays empty at version 1.
- Corrupt saves are kept under a backup key and logged, then the game starts fresh.
- The notification toggle lived in the Kitchen sheet until T5.9 moved it to Settings.

## Generators

- [x] Per-generator cooldown timer on the board: a spent generator dims and counts down m:ss to its refill, redrawn once a second in `src/render/boardView.ts`. Cooldowns are 5 min at tier 1, 4 min at tier 2, 3 min at tier 3 (`generators.json`). Charges refill lazily inside the next tap, so a cell whose `cooldownEndsAt` has passed shows nothing and is already usable.
- [ ] No way to gain a generator during play. Spawn tables only drop ingredients, the rare table is energy-jar/coin-pouch/golden-whisk, and `newGame.json` seeds exactly one mill and one fridge. Merging consumes two to make one, so upgrading permanently costs a generator with no replacement. `Unlock` already has `{ kind: 'generator', itemId }` — give the early renovation tasks in T5.1 a generator unlock, or add another source. The T5.1 brief does this: a second Dairy Fridge at task 5, Flour Mills at 9 and 18, and a second Toaster Oven at 12.
- [x] T6.5 Rushing a generator cooldown with gems. Contract change approved by Scott (T-O1, Sep 30): a `rushCooldown` action and a `cooldownRushed` event in types.ts. Costs whole minutes left × `rushGemsPerMinute`, like a bake; refills the charges; a generator that isn't cooling changes nothing. Tapping a resting generator opens a "Rush — N gems" bubble over it (src/ui/rushBubble.ts), greyed out when unaffordable, with the price dropping each minute. Plays the collect chime; the How to play dialog mentions it and the charge badge.
- [x] Hen Coop and Sugar Tin, three tiers each, in `items.json` and `generators.json`. Spawn tables, charges and cooldowns mirror the Flour Mill and Dairy Fridge tier for tier. Not on the starting board: per the GDD they arrive in Chapter 2, and until then the Kitchen hides Cookie and Cupcake. Placeholder SVGs only. To test the other recipes now: `bakery.give('hen-coop-1', 'sugar-tin-1')`.
- [ ] T6.6 Chapter 2: unlock the Hen Coop and Sugar Tin through its renovation tasks.
- [ ] T6.7 Fruit Crate: no recipe uses fruit yet, so it waits for a recipe that does.
- [x] T6.4 Remaining charges on each generator: a butter badge in the cell's top-left corner (the tier badge is bottom-right), counting down with each tap, hidden while the cooldown countdown shows, and showing the full count again the moment a cooldown ends, before the lazy refill (`chargesToShow` in src/render/charges.ts).

## Added outside the plan

- [x] Pixel art: flour chain (8) and dairy chain (7) as 16 x 16 PNGs in `public/art/`. `assetUrl()` in `src/render/assets.ts` now picks `.png` over `.svg` for any key with one, and PixiJS textures load with nearest-neighbour scaling.
- [x] "?" button in the tray opening a How to play dialog (`src/ui/helpDialog.ts`), including a Baking section written against T4.4's Kitchen.

## Open from earlier phases

- [ ] Milestone 1 playtest (T-O5, Scott)
- [ ] T0.4 "three passing checks" needs a GitHub remote and a first pull request
- [ ] T0.3 live window resize not yet checked in a visible browser tab
