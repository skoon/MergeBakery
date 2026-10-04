# Handoff — Oct 3, 2026

Where Rise & Shine Bakery stands and what comes next. Read `CLAUDE.md`, `task.md` (top section is Phase 11) and `docs/briefs/working-rules.md` first.

## State

- **`main`** has Phases 7–10 (Chapter 4 merged Oct 3, fast-forward, not pushed; `origin` is configured). **Phase 11 (Chapter 5, the finale)** is built on stacked branches `t11.1-chocolate` … `t11.7-balance`; nothing there is merged.
- All five chapters, the MegaBun events, catering, wholesale, staff and automation are in. The game can be played start to finish.
- **Not checked in a browser** (no Chrome for the Playwright tool): the Staff panel recipe picker, the End card, the Factory scene.
- **Waiting on Scott:** Chapter 5's portraits (21), script (9 scenes) and art; playing to the ending.

## Phase 11 as built

- **Decisions (Scott, Oct 3):** automation is an Auto-Oven staff role; one ending (refuse the buyout).
- **Contract:** `StaffRole` 'oven', `StaffState.assignedRecipe`, `assignStaff.recipeId` (header of `types.ts`).
- **Chocolate line:** chains `brownie` and `bonbon`, recipes in `recipes.json`.
- **Chapter 5:** `chapter5.json` (ids `factory-`, scene `factory`), `dialogue/chapter5.json` (offer and finale scenes), `scripts/art/factory.py`, `portraits7.py`. The finale ends the story with `gameFinished` (no state) and `endCard.ts`.
- **Balance:** `lowTierBias` is 3. The bot finishes the whole game in 8–10 days; people will take longer.

## Open

1. Phase 12, the whole-game pass: a simulator regression with thresholds, a save-migration audit (v1 → v3 fixtures), a music track, a performance and size check, and a full playthrough.
2. A few small things: the credits are one card, not a roll; no "play again" or new-game-plus.
3. All art is scripted pixel art.

## Phase 10 as built (earlier)

- **Contract (approved Oct 3), save v3:** see `task.md`. Staff and wholesale live in `src/core/staff.ts`, `orders.ts` (`generateWholesaleOrder`), `deliver.ts` (Pantry top-up, reputation).
- **Staff** (`staff.json`): Sam (tapper, 5 min, 1500 coins, 10 reputation), Trevor (baker, ×0.8 bakes, 2500, 25), Rosa (tapper, 4 min, 3500, 50). Tappers are free of energy but use the generator's charges and need a free cell. The Staff panel is on the Bakery screen.
- **Wholesale** from Chapter 4 (`economy.json`): 8% of new orders, 5–10 of one tier 1–2 item, 48 h, no penalty.
- **Chapter 4** `chapter4.json` (ids `wholesale-`, scene `wholesale-kitchen`), dialogue `dialogue/chapter4.json`, art `scripts/art/wholesale.py`.

## Open (earlier)

1. **Balance is uncalibrated.** After the bot fix every chapter takes it about a day. Real pacing needs your playtest; if chapters are too quick, raise task costs (Chapter 4 is 380 stars).
2. Staff prices look cheap against the bot's wholesale income. Check in play.
3. Phase 11 (Chapter 5, the finale) needs automation helpers; Phase 12 is the whole-game pass.
4. All art is scripted pixel art.

## Phase 9 as built (earlier)

- **Contract changes**, all in the `types.ts` header: catering (`Order.catering`, `OrderRules.catering`, two events; approved Oct 3) and `OrderRules.lowTierBias` (approved Oct 3).
- **Fruit Crate** (3 tiers) is in `items.json`, `generators.json` and the Shop (800 coins from Chapter 3). New baked chains `tart` (4 tiers) and `scone` (3), recipes `bake-fruit-tart`, `bake-scone`.
- **Catering** (`generateCateringOrder`, `expireCatering` in `orders.ts`; the generator upgrade in `deliver.ts`). Rules are in `economy.json`.
- **Chapter 3** data `chapter3.json` (ids `harbor-`, scene `harbor-market`), dialogue `dialogue/chapter3.json`, art `scripts/art/harbor.py`.
- **Order bias.** `lowTierBias: 2` divides an item's weight by tier². It was needed because order cost grew with every discovered chain while stars stayed flat.

## Open (earlier)

1. Chapter 4 (Phase 10): wholesale orders, reputation, staff, Deck Oven in the Shop. Needs a contract change and a save migration (v3).
2. A sim seed still stalls near the end of Chapter 3 or in Chapter 2 now and then. It looks like a bot limit (four open orders the bot never fills, nothing refreshes them), but a player could meet the same thing: orders can't be skipped. Worth a look.
3. Event art and Chapter 3 art are scripted pixel art, not hand-polished.

## Phase 8 as built (earlier)

- Contract changes: Scott approved the T8.1 proposal on Oct 3. Added after that, and listed in the header of `types.ts`: `EventDef.gapAfterSec`, `EventDef.orders`, `EventDef.slow`, `EventOrderRules.minTier`, chain kind `event`, `EventResult.coins`. Save version is 2 (migration in `migrate.ts`).
- Events: `bake-off`, `street-fair`, `taste-test`, `flour-shortage`, `charity-sale` in `src/data/events.json`, each with its own generator and product chain in `items.json` and `generators.json` (placeholder SVGs only).
- Rules: one event at a time; the next starts `gapAfterSec` (14 days) after the last ends; the first starts one gap after the player reaches `minChapter`. Event orders are extra, outside the 4 regular slots. At the end, event items are sold, the generator removed, reached milestones paid, and a win pays `trophyGems` and is recorded in `trophies`.
- Dialogue: scenes `event-<id>-start`, `-win`, `-lose`, played from `main.ts` by naming convention. Win and lose play after the result card is dismissed.
- Balance: `npm run balance` prints each event played alone. The bot reaches MegaBun's final score after 3–10 sessions.

## Open for Phase 8 (earlier)

1. **First event delay.** It arrives a full 14 days after Chapter 2 starts. Probably too late; a shorter first gap needs a data field.
2. **Permanent rewards** (Flour Mill upgrade, decor sets) are not built; wins are only recorded in `trophies`.
3. **Spy regular and portraits** for the hint letters are not built; the letters are narrator lines.
4. **Event art** is placeholder SVG; the event items and generators need pixel art in the T5.14 style.
5. A Golden Whisk can copy an event item (harmless: it is sold at the end).

## Phase 7 progress

| Task                    | Status                                                                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T-O1 contract           | Approved Oct 1. `ShopItem`/`ShopFile`/`GameData.shop`, `buyShopItem`, `purchased` and `chapterStarted`. No `GameState` change. `types.ts` is frozen again.          |
| T7.1 loader             | Done. `shop.json`, zod and cross-checks in `data.ts`, `src/core/placement.ts`.                                                                                      |
| T7.2 progression        | Done. `renovation.ts`; `catchUpChapter` in `main.ts` for old saves.                                                                                                 |
| T7.3 new regulars       | Done. Priya, Bramble and Theo: data and 9 portraits in `public/art`. Approved.                                                                                      |
| T7.4 chapter2.json      | Done. 20 `cafe-` tasks, costs 8–20 (total 274).                                                                                                                     |
| T7.5 transition UI      | Done in code (`src/ui/chapterTransition.ts`). Being exercised in the playtest.                                                                                      |
| T7.6 Chapter 2 script   | Done, approved. `src/data/dialogue/chapter2.json`, 7 scenes wired to `introSceneId` and the task `sceneId`s. `main.ts` merges both chapters' scenes.                |
| T7.7 Café Terrace art   | Done, approved. `cafe-terrace.png` and 40 `cafe-terrace-<slug>-before/after.png` in `public/art`. Generator: `scripts/art/cafe.py`.                                 |
| T7.8 Shop               | Done. `src/core/shop.ts`, `src/ui/shopScreen.ts`, `shopModel.ts`.                                                                                                   |
| T7.9 balance            | Done. Simulator plays past Chapter 1 and buys from the Shop. Energy packs raised 150/500 to 300/1000 (Scott approved). Chapter 2 takes the bot 2–4 days. See below. |
| T7.10 review + playtest | Gate passed. Playtest under way. The phase-end read-through of the integration seams has not been done.                                                             |

## What's next, in order

1. **Collect Scott's playtest notes** and fix what he finds. Likely places: the chapter transition card and Chapter 2 intro scene, each task spot against the scene art, the Shop (prices, a full board when buying a generator).
2. **T7.10 review.** Read the merged Phase 7 code for seams (dispatch cases, `main.ts` wiring, `catchUpChapter`), then update the briefs for Phase 8.
3. **Housekeeping Scott does or approves:** delete `docs/art-review/` (an `rm` was denied in auto mode; it holds the T7.3 and T7.7 review sheets); commit the branch.
4. **Phase 8:** MegaBun competitive events, starting with the Bake-Off Showdown (see the Implementation Plan).

## Balance notes (T7.9)

- Run `npm run balance`: 5 seeds, 10 days. The bot is a fast, tireless player, so people will take longer.
- Chapter 1 finishes by day 2 for the bot (was about 2.5–3 days). The bot now buys energy, which probably explains it; the early sessions are unchanged.
- Chapter 2: all 5 seeds finish on days 4–6. The Shop's generators (400 / 400 / 600 / 600) are bought early; energy is the repeatable coin sink.
- Bot caveats: it leaves generators unmerged and never uses the Pantry, so it clogs the board more than a person would. It stalled in some seeds before the energy price rise.

## Standing rules from Scott

- **Pixel art.** Items are 16×16. Portraits and scene objects are 32×32. Ink outline `#3a2414`. Scott approves every batch first. He can't see images sent through chat, so point him to `D:\source\MergeBakery\docs\art-review\<file>.png`.
- **Recipes** only use items the player can get at that point.
- **Contract changes** to `src/core/types.ts` need Scott's T-O1 approval. Stop and explain first.
- **Tests** that check tunables read their values from the data, not hard-coded numbers. Simulator tests have explicit timeouts (60–120 s).
- **Python art scripts** need Pillow. `scripts/art/pixart.py` and `portraits.py` hold the shared helpers (`Canvas`, `outline`, `shaded_head`, `face`). Each script's `__main__` writes only a review sheet (`cafe.py` takes an output folder).

## Known gotchas

- On WSL `/mnt/d`, npm installs and `vite build` are very slow. Run long commands in the background.
- Rewriting the data JSON with Python's `json.dump` reflows the whole file. Use targeted text edits instead.
