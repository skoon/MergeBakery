# Handoff — Oct 3, 2026

Where Rise & Shine Bakery stands and what comes next. Read `CLAUDE.md`, `task.md` (top section is Phase 8) and `docs/briefs/working-rules.md` first.

## State

- **Branches** are stacked, one per task: `t8.1-events-contract` → `t8.2-event-schedule` → … → `t8.10-review`. Phase 7 is committed on `t1.1-types`. Nothing is merged to `main` and there is no remote yet (T0.4).
- **Phase 8 (MegaBun events) is built**: five event types on one framework, all in `src/core/events.ts`, run from the `tick` handler in `dispatch.ts`. 742 tests pass; typecheck and ESLint are clean.
- **Not checked in a browser:** the event pill, sheet and result card (T8.5). The Playwright tool had no Chrome. Start one with `bakery.event()` in the console (dev only), then `bakery.away(4400)` to expire it.
- **Waiting on Scott:** the event dialogue script (`src/data/dialogue/events.json`, T8.7) and the events playtest (T8.10).

## Phase 8 as built

- Contract changes: Scott approved the T8.1 proposal on Oct 3. Added after that, and listed in the header of `types.ts`: `EventDef.gapAfterSec`, `EventDef.orders`, `EventDef.slow`, `EventOrderRules.minTier`, chain kind `event`, `EventResult.coins`. Save version is 2 (migration in `migrate.ts`).
- Events: `bake-off`, `street-fair`, `taste-test`, `flour-shortage`, `charity-sale` in `src/data/events.json`, each with its own generator and product chain in `items.json` and `generators.json` (placeholder SVGs only).
- Rules: one event at a time; the next starts `gapAfterSec` (14 days) after the last ends; the first starts one gap after the player reaches `minChapter`. Event orders are extra, outside the 4 regular slots. At the end, event items are sold, the generator removed, reached milestones paid, and a win pays `trophyGems` and is recorded in `trophies`.
- Dialogue: scenes `event-<id>-start`, `-win`, `-lose`, played from `main.ts` by naming convention. Win and lose play after the result card is dismissed.
- Balance: `npm run balance` prints each event played alone. The bot reaches MegaBun's final score after 3–10 sessions.

## Open for Phase 8

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
