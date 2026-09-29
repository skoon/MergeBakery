# Phase 4 — Kitchen, save, and offline timers

Source: [Rise & Shine Bakery — Implementation Plan](https://claude.ai/artifact/CbuwDrEjZqWZnuhLP7pamp)
Briefs: docs/briefs/ (rules for every session in working-rules.md)

Tasks start as soon as their dependencies finish. Opus connects each core function to src/core/dispatch.ts as it lands.

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
- Still stubbed in `dispatch.ts`, by plan: `completeTask` (T5.2), `dismissDiscovery` (T5.7), `setTutorialStep` (T5.12).
- Found in the browser pass: **Cookie and Cupcake can't be made.** Both need egg-chain inputs (Cookie also needs `sugar-bowl`), and `generators.json` has only the Flour Mill and Dairy Fridge — the GDD's Hen Coop, Sugar Tin and Fruit Crate were never added, so nothing ever spawns an egg, sugar or fruit item. Fixed by hiding recipes the player can't make yet: the Kitchen lists a recipe only when every input's chain is fed by a generator the player owns, or the input is already on the board or in the Pantry (`recipeAvailable` in `src/ui/kitchenModel.ts`, built on `producibleChains` in `src/core/orders.ts`). Chapter 1 shows only the Croissant.
- **Croissant is makeable but a grind for a first recipe:** `dough-ball` is flour tier 6 (32 wheat stalks' worth) and `butter-block` is dairy tier 5 (16 milk splashes) — about 40 taps and two Flour Mill cooldowns. For T-O3.
- Added dev-only console helpers (`src/ui/devTools.ts`, loaded only when `import.meta.env.DEV`, confirmed absent from the production bundle): `bakery.give(...itemIds)`, `bakery.away(minutes)`, `bakery.reset()`. They write a save and reload, so they exercise the real load, migration and offline path.
- Next: Phase 5 briefs. Written so far: T5.1, T5.2.

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
- Notification toggle lives in the Kitchen sheet until Settings (T5.9) exists.

## Generators

- [x] Per-generator cooldown timer on the board: a spent generator dims and counts down m:ss to its refill, redrawn once a second in `src/render/boardView.ts`. Cooldowns are 5 min at tier 1, 4 min at tier 2, 3 min at tier 3 (`generators.json`). Charges refill lazily inside the next tap, so a cell whose `cooldownEndsAt` has passed shows nothing and is already usable.
- [ ] No way to gain a generator during play. Spawn tables only drop ingredients, the rare table is energy-jar/coin-pouch/golden-whisk, and `newGame.json` seeds exactly one mill and one fridge. Merging consumes two to make one, so upgrading permanently costs a generator with no replacement. `Unlock` already has `{ kind: 'generator', itemId }` — give the early renovation tasks in T5.1 a generator unlock, or add another source. The T5.1 brief does this: a second Dairy Fridge at task 5, Flour Mills at 9 and 18, and a second Toaster Oven at 12.
- [ ] Rushing a generator cooldown with gems: the GDD lists it as a gem sink and `Economy.rushGemsPerMinute` exists, but `ActionBody` has only `rushBake`. Needs a contract change to the frozen `types.ts`, so it goes through T-O1.
- [x] Hen Coop and Sugar Tin, three tiers each, in `items.json` and `generators.json`. Spawn tables, charges and cooldowns mirror the Flour Mill and Dairy Fridge tier for tier. Not on the starting board: per the GDD they arrive in Chapter 2, and until then the Kitchen hides Cookie and Cupcake. Placeholder SVGs only. To test the other recipes now: `bakery.give('hen-coop-1', 'sugar-tin-1')`.
- [ ] Chapter 2: unlock the Hen Coop and Sugar Tin through its renovation tasks.
- [ ] Fruit Crate: no recipe uses fruit yet, so it waits for a recipe that does.
- [ ] Show remaining charges on a generator, not just the cooldown. Nothing tells the player how many taps are left before the wait starts.

## Added outside the plan

- [x] Pixel art: flour chain (8) and dairy chain (7) as 16 x 16 PNGs in `public/art/`. `assetUrl()` in `src/render/assets.ts` now picks `.png` over `.svg` for any key with one, and PixiJS textures load with nearest-neighbour scaling.
- [x] "?" button in the tray opening a How to play dialog (`src/ui/helpDialog.ts`), including a Baking section written against T4.4's Kitchen.

## Open from earlier phases

- [ ] Milestone 1 playtest (T-O5, Scott)
- [ ] T0.4 "three passing checks" needs a GitHub remote and a first pull request
- [ ] T0.3 live window resize not yet checked in a visible browser tab
- [ ] Pixel art for the sugar, egg, and fruit chains, 16 items still on the generated SVG: sugar (sugar-cube, syrup-bottle, caramel, cocoa-bean, chocolate-bar, truffle-box); egg (egg-pair, egg-carton, whisked-eggs, custard-cup, creme-brulee); fruit (berry, berry-bunch, apple-basket, jam-jar, fruit-tart-filling). 16 x 16 PNGs in public/art/, ink outline #3a2414, chain colors from items.json. Flour and dairy are done; `assetUrl()` picks up any new .png automatically.
