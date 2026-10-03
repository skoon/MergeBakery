# Handoff — Oct 2, 2026

Where Rise & Shine Bakery stands and what comes next. Read `CLAUDE.md`, `task.md` (top section is Phase 7) and `docs/briefs/working-rules.md` first.

## State

- **Branch** `t1.1-types`. Last commit `0a7693b` (T6.4 and T6.5). **Uncommitted:** the first-session tuning (T-O3 "smooth the first session") and all of Phase 7. Scott commits — don't commit unless asked.
- **Gate** on Oct 2: typecheck clean, eslint and prettier clean, 55 test files / 699 tests pass, `npm run build` exits 0 (about 2.5 min).
- **Phases 1–6 done.** Phase 7 (Chapter 2, The Café Terrace, and the Shop) is built and gated. **Scott's Chapter 2 playtest (T-O5) is under way and going well.** MegaBun events are Phase 8, after Chapter 2.

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
