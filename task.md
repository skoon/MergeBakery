# Phase 12 — Whole-game pass

Source: Implementation Plan, Phase 12. Chapter 5 was merged to `main` on Oct 3 (Scott: "go ahead and merge"). Branches t12.1 … t12.4, stacked on `main`.

- [x] T12.1 Simulator regression: the balance test now fails unless every one of 5 seeds finishes all five chapters, in order, by day 14 (the bot finishes by day 10), and exercises wholesale and staff. Checked by lowering the bar to day 5, which fails
- [x] T12.2 Save audit (`saveVersions.test.ts`): v1 and v2 fixtures load into v3 and equal the original state; a state using every later addition round-trips; a save from a newer version is refused; a running event removed from the data loads and is dropped on the next tick. No gaps found
- [x] T12.3 Music: a generative loop on the music channel, one theme per chapter (`music.json`, `src/audio/music.ts`), starting at the next bar after the first tap and changing at a bar line when the chapter changes. Event stings (start, win, lose, milestone) in `sfx.json`. **Not heard by anyone yet: Scott to listen and approve the themes**
- [x] T12.4 Size measured and recorded in the README: whole `dist/` about 1.27 MB, JS and CSS 280 kB gzipped, precache 1.14 MiB, against a 5 MB target. **Frame rate and first-merge time need a real phone and aren't measured**
- [ ] T12.5 Full playthrough from a fresh save to the ending (Scott), with every fix collected into one list

# Phase 11 — Chapter 5, Rise & Shine Factory (the finale)

Source: Implementation Plan, Phase 11. Chapter 4 was merged to `main` on Oct 3 (Scott: pacing fine). Branches t11.1 … t11.7, stacked. Decisions (Scott, Oct 3): one ending (the player refuses MegaBun's buyout), and an Auto-Oven staff role for automation.

- [x] T11.1 Chocolate line: brownie (4 tiers) and bonbon (3) chains, recipes `bake-brownie` and `bake-bonbon` (cocoa bean from the Sugar Tin), 7 sprites (`batch9_chocolate.py`)
- [x] T11.2 Auto-Oven. Contract approved Oct 3: `StaffRole` 'oven', `StaffState.assignedRecipe` (optional, no migration), `assignStaff.recipeId`. Every 2 min it collects finished bakes and reloads its recipe from items on the board; a full board and Pantry pauses it; offline catch-up capped. Two in `staff.json` (6000 and 9000 coins, reputation 100 and 250), from Chapter 5. Recipe picker in the Staff panel
- [x] T11.3 Bex, Foreman Dill, Moss (regulars), the MegaBun cast (Chad, Buns-A-Lot, Mrs. Crustworth) and the Auto-Oven: 21 portraits (`portraits7.py`). The MegaBun cast speak through a table in `dialogue.ts`, not as customers. **Awaiting Scott's approval of the portraits**
- [x] T11.4 `chapter5.json`: 20 `factory-` tasks (420 stars); the last chapter stays put, so the finale is a scene on the last task
- [x] T11.5 The finale: 9 scenes (`dialogue/chapter5.json`), ending with the buyout refusal; `gameFinished` (the last chapter's tasks all done, so no state to migrate); a "The End" card (`endCard.ts`) once the final scene closes, with "Keep baking". **Awaiting Scott's approval of the script**
- [x] T11.6 Factory art (`scripts/art/factory.py`). **Awaiting Scott's approval**
- [x] T11.7 Balance pass, Chapters 1–5 end to end. `lowTierBias` raised from 2 to 3 (still the approved field). With it all five seeds finish the whole game in 8–10 bot-days with no stalls: Chapter 1 d1–2, Chapter 2 d2–3, Chapter 3 d3–4, Chapter 4 d5–6, Chapter 5 d8–10; all five staff hired by day 11–22. The bot also now loops the Auto-Oven on a recipe an open order wants
- [ ] T11.8 Phase-end review done Oct 3 (`gameFinished` on a fresh save, the End card, Auto-Oven offline and the dev `away` helper). Remaining: Scott plays to the ending, including a browser check of the Staff panel's recipe picker and the End card

# Phase 10 — Chapter 4, The Wholesale Kitchen

Source: Implementation Plan, Phase 10. Chapter 3 was merged to `main` on Oct 3 (Scott: "chapter 3 looks good"). Branches t10.1 … t10.10, stacked.

- [x] T10.1 Contract, approved Oct 3: `GameState.reputation` and `staff`, `StaffDef`/`StaffFile`/`StaffState`, `GameData.staff`, `Order.wholesale`, `OrderReward.reputation`, `WholesaleRules`, `hireStaff`, `assignStaff`, `notEnoughReputation`, `staffHired`, `staffActed`, `wholesaleExpired`. Save version 3 (migration 2 → 3). `staff.json` (Sam, Trevor, Rosa). Differences from the proposal: `Order.wholesale` holds only `expiresAt` (reputation is on the reward); `StaffDef` also has `maxCatchUp`, `portraitKey`, `minChapter`
- [x] T10.2 Wholesale orders: 8% of new orders from Chapter 4, 5–10 of one tier 1–2 item, coins ×2, 1 reputation per item, 48 h; a batch can be topped up from the Pantry
- [x] T10.3 Staff: tappers tap their chain every `intervalSec` free of energy (capped catch-up offline), bakers shorten bakes (×0.8). `assignStaff` restarts the clock so idle time isn't banked
- [x] T10.4 Wholesale card (one icon, have/need count, countdown); Staff panel on the Bakery screen (hire, point a tapper at a chain)
- [x] T10.5 The Deck Oven: Chapter 4's task 8 unlocks it (no Shop change)
- [x] T10.6 Ms. Harlow, Big Lou, Dr. Okafor and the staff Sam, Trevor, Rosa: data and 18 portraits (`portraits6.py`). **Awaiting Scott's approval of the portraits**
- [x] T10.7 `chapter4.json`: 20 `wholesale-` tasks (380 stars). Wholesale rules in `economy.json`
- [x] T10.8 `src/data/dialogue/chapter4.json`, 8 scenes; staff can be dialogue speakers (Trevor leaves MegaBun). **Awaiting Scott's approval of the script**
- [x] T10.9 Wholesale Kitchen art (`scripts/art/wholesale.py`). **Awaiting Scott's approval**
- [x] T10.10 Balance pass. The bot now bakes only what an open order wants (before, it baked everything and clogged its board; four seeds stalled for days) and saves for staff before buying energy. With that every chapter takes the bot about a day (Chapter 4 done on day 5; all three staff hired by day 3–7). That is much faster than before, and Chapters 1–3 sped up too, so older numbers don't compare. How much longer people take is Scott's call from the playtest
- [x] T10.11 Scott played Chapter 4 on Oct 3: the pacing is fine, not too quick; merged to `main`. Phase-end review done Oct 3 (save v3 load, staff offline catch-up and the dev `away` helper, chapter transition into Chapter 4). Remaining: Scott's Chapter 4 playtest, including a browser check of the Staff panel and wholesale card

# Phase 9 — Chapter 3, Harbor Market Stall

Source: Implementation Plan, Phase 9. Branches t9.1 … t9.9, stacked on the Phase 8 ones.

- [x] Phase 8 open items (Oct 3): first event now 4 days into Chapter 2 (`firstAfterSec`); Flour Shortage's permanent Flour Mill perk (cooldowns ×0.8, `EventDef.perk`) and a trophy shelf in the Bakery view; Wren the MegaBun spy (regular, 3 portraits, intro scene `ch2-wren` on `cafe-chalk-sign`, hint lines in the event scenes); pixel art for the 5 event generators and 21 products (`scripts/art/batch7_events.py`). Fixed: the counter strip cut orders to the first four, hiding event and catering cards
- [x] T9.1 Fruit Crate (3 tiers, in the Shop from Chapter 3), fruit tart and scone chains and recipes, 10 sprites (`batch8_fruit.py`)
- [x] T9.2 Catering orders. Contract approved Oct 3: `Order.catering`, `OrderRules.catering`, `cateringExpired`, `generatorUpgraded`. 6% of new orders from Chapter 3, one at a time, one baked item tier 3–4 (discovered), 24 h, coins ×6 + 5 stars, 15% chance to upgrade a board generator
- [x] T9.3 Catering card (butter background, countdown) in the counter strip; catering and event cards sort first
- [x] T9.4 Captain Marisol, Mr. Pell, Juno: data and 9 portraits (`portraits5.py`). **Awaiting Scott's approval of the portraits**
- [x] T9.5 `chapter3.json`: 20 `harbor-` tasks (324 stars), Fruit Crate unlocked by task 2, three regulars, Shop row, catering switched on
- [x] T9.6 `src/data/dialogue/chapter3.json`, 7 scenes. **Awaiting Scott's approval of the script**
- [x] T9.7 Harbor Market art: `harbor-market.png` and 40 before/after (`scripts/art/harbor.py`). **Awaiting Scott's approval**
- [x] T9.8 Balance pass. Contract approved Oct 3: `OrderRules.lowTierBias` = 2 (item weight ÷ tier²). Without it order cost outran the flat star reward and stars per session fell from ~35 to ~8. With it: Chapter 1 d2, Chapter 2 d4–7, Chapter 3 2–5 days later on 4 of 5 seeds (one seed stalls with 1 task left). Events halve on 16-day runs; sim now also reports catering
- [ ] T9.9 Phase-end review done Oct 3 (`catchUpChapter` walks a save finishing Chapter 2 on to Chapter 3; shop, events and catering gate on chapter order). Remaining: Scott's Chapter 3 playtest, including a browser check of the catering card and the Harbor Market scene

# Phase 8 — MegaBun competitive events

Source: Implementation Plan, Phase 8. Branches t8.1 … t8.9, each stacked on the one before.

- [x] T8.1 Contract (approved Oct 3), save v2 migration, `events.json` loader and validator, `claimMilestone` / `dismissEventResult`
- [x] T8.2 Schedule, start, expiry and MegaBun's score curve in `tickEvents` (src/core/events.ts). Added `EventDef.gapAfterSec` (not in the approved contract)
- [x] T8.3 Event generator placed at start; event items sold and generator removed at the end. Added chain kind `event` and `EventResult.coins` (not in the approved contract)
- [x] T8.4 Event orders (extra to the regular slots), Hometown Pride on delivery, reached milestones paid at the end. Added `EventDef.orders`
- [x] T8.5 Event pill, sheet and result card (src/ui/eventSheet.ts, eventModel.ts). Not checked in a browser: Chrome isn't installed for the Playwright tool
- [x] T8.6 Bake-Off Showdown data, Contest Mixer and Showpiece Cake chain (placeholder SVGs), `bakery.event()` dev helper
- [x] T8.7 Event dialogue: `src/data/dialogue/events.json`, 3 scenes per event, played by naming convention. Scott approved the script Oct 3
- [x] T8.8 Street Fair Standoff, Blind Taste Test, Flour Shortage (slows the Flour Mill's cooldowns), Charity Bake Sale. Added `EventDef.slow`, `orders.minTier`. Not done: the permanent rewards (Flour Mill upgrade, decor sets) — wins are recorded in `trophies` only
- [x] T8.9 Balance pass: `npm run balance` now also prints each event played alone (one event at a time, 2 seeds, 10 days). MegaBun's final scores and milestones rescaled (Bake-Off 1500, Street Fair 1500, Flour Shortage 1400, Charity 1800, Taste Test 150) so the bot, a faster player than most, reaches the target after 3–10 sessions of 12–21. Left open: the first event arrives a full gap (14 days) after reaching Chapter 2 — probably too late; decide with Scott
- [x] T8.10 Playtest fixes (Oct 3): event items and generators no longer raise the discovery card (its "Add to recipe book" went nowhere); the event sheet now says how to play; event orders are marked (pink border, "+N pride") and the counter strip scrolls past four cards. Scott replayed Oct 3 and confirmed the fixes work. Phase-end review done Oct 3 (seams read: tick composition, save v1 → v2 load, unknown event ids in old saves now dropped instead of throwing). Remaining: Scott's events playtest, including the browser check of the T8.5 UI

# Phase 7 — Chapter 2, The Café Terrace, and the Shop

Source: [Rise & Shine Bakery — Implementation Plan](https://claude.ai/artifact/CbuwDrEjZqWZnuhLP7pamp) (repo copy in docs/ is the current one)
Briefs: docs/briefs/ (rules for every session in working-rules.md)

Scope decided Oct 1: Chapter 2's content plus the Shop; the MegaBun competitive events are Phase 8.

- [x] T-O1 contract change, approved by Scott Oct 1: `ShopItem`/`ShopFile`/`GameData.shop`, the `buyShopItem` action, the `purchased` and `chapterStarted` events. No `GameState` change, so no save migration.
- [x] T7.1 Contract, dispatch cases, shop.json loader and validator, task ids unique across chapters (Opus). Generator placement is now shared by renovation unlocks and the Shop (src/core/placement.ts)
- [x] T7.2 Chapter progression: the last task moves to the next chapter and emits `chapterStarted` (Sonnet). `nextChapterId` in renovation.ts
- [x] T7.3 Three new Chapter 2 regulars and their 9 portraits (Sonnet) — Scott approved Oct 1; `public/art/portrait-<priya|bramble|theo>-*.png`
- [x] T7.4 chapter2.json: The Café Terrace's 20 tasks, unlocking the Hen Coop and Sugar Tin early (Sonnet) — after T7.2, T7.3
- [x] T7.5 Chapter transition UI: "Chapter complete" card, the next intro scene, the Bakery switching location (Sonnet) — after T7.2. src/ui/chapterTransition.ts; waits for the finale scene to close. `catchUpChapter` moves saves that finished Chapter 1 earlier on to Chapter 2 at load
- [x] T7.6 Chapter 2 dialogue (Sonnet) — Scott approved the script Oct 1. `src/data/dialogue/chapter2.json`, 7 scenes (`ch2-intro`, `ch2-priya`, `ch2-bramble`, `ch2-theo`, `ch2-neighbors`, `ch2-recipe-page`, `ch2-grand-opening`); `main.ts` merges both chapters' scenes
- [x] T7.7 Café Terrace art: scene and 40 before/after (Sonnet) — Scott approved; 41 files `public/art/cafe-terrace*.png`, generator `scripts/art/cafe.py`
- [x] T7.8 The Shop: shop.json, `buyShopItem`, the Shop screen (Sonnet) — after T7.1
- [x] T7.9 Balance pass across both chapters with the Shop (Opus). The simulator now plays past Chapter 1 and buys from the Shop (bot also uses Golden Whisks, merges toward open orders, sells dead weight). Scott approved raising the energy packs from 150/500 to 300/1000 (the only repeatable coin sink). After: all 5 seeds finish Chapter 2, 2–4 bot-days after Chapter 1 (days 4–6), and the bot ends with hundreds of coins, not thousands. Chapter 2 task costs unchanged
- [ ] T7.10 Phase-end review (T-O2), then Scott's Chapter 2 playtest (T-O5). Gate passed Oct 2 (typecheck, lint, 699 tests, `npm run build`). Playtest under way; the transition card and the Café Terrace art had not been checked in a browser before it
- [ ] Bug (playtest): dragging an item from the Pantry to the Kitchen selects all the text/elements on the page. Likely needs `user-select: none` (and/or `preventDefault` on dragstart/pointerdown) on the pantry drag source
- [ ] Bug (playtest): on the Recipes tab the fruit generator extends past the tab's edge and is hard to see. It should wrap to the next line

# Phase 5 — Chapter 1, UI, audio, and polish (done)

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
- [x] T5.5 Chapter 1 dialogue (Sonnet) — after T5.1 and T5.4 — Scott approved the script Oct 1

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
- [x] T-O3 balancing pass — simulator: `npm run balance` (a bot plays the real rules and data over simulated days, 5 seeds). Before: sessions ended in ~3 minutes when generator charges ran out with most energy unused, 7–15 orders per session, the chapter done in ~6 sessions, no croissant ever baked. Applied (Scott chose option 1): generator charges ×3 (36/48/60), walk-in orders up to tier 5 and regulars up to tier 7, task star costs ×2 (6–16 each, 212 total, against the GDD's 3–8), level XP thresholds ×2. After: from the third session on, sessions run 9–11 minutes and energy runs out at 10–12; the chapter takes sessions 7, 10, 11 and 12 in four seeds, and 19 in the fifth over a 5-day run, so about 2.5–3 days for the bot and longer for a person (corrected Oct 1: an earlier note had mis-converted day/session to session numbers); a croissant is baked in 4 of 5 seeds. Logic tests that had hard-coded the old numbers now read them from the data (level.test.ts pins its own fixed threshold table).
- [x] Smoothing the first session (Oct 1): walk-ins now ask for 2–3 items (2 stars, `starsByItemCount` [1, 2, 2]) and orders refill 90 s after the last one is delivered, up from 5 s. The first session drops from ~31 orders, 40 stars and 5 tasks to ~8 orders, 17 stars and 2.4 tasks; day 1 now ramps 2.4 / 2.2 / 1.8 / 1.2 tasks per session. Four seeds finish the chapter by session 10–11 (day 3); the fifth by session 14. Both changes depart from the GDD's text (walk-ins "1–2 items, 1 star"; "a completed order is replaced within 5 seconds").
- [ ] Balancing follow-ups, after T-O5: coins reach ~4,700–6,600 by day 3 with only Pantry slots to spend them on, so the Shop (still "Coming soon") needs a coin sink; orders per session stay at ~6–13 against the GDD's 3–5.
- [x] T-O5 Chapter 1 playtest (Scott) — passed Oct 1

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

- [x] Milestone 1 playtest (T-O5, Scott) — covered by the Chapter 1 playtest, Oct 1
- [ ] T0.4 "three passing checks" needs a GitHub remote and a first pull request
- [ ] T0.3 live window resize not yet checked in a visible browser tab
