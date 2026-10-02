# Handoff — Oct 1, 2026

Where Rise & Shine Bakery stands and what comes next. Read `CLAUDE.md`, `task.md` (top section is Phase 7) and `docs/briefs/working-rules.md` first.

## State

- **Branch** `t1.1-types`. Last commit `0a7693b` (T6.4 and T6.5). **Uncommitted:** the first-session tuning (T-O3 "smooth the first session") and all of Phase 7 so far. Scott commits — don't commit unless asked.
- **Gate** on Oct 1: typecheck clean, eslint clean, prettier clean, 55 test files / 699 tests pass. `npm run build` was not re-run (it can take over 10 min on WSL `/mnt/d`; it passed after T6.5).
- **Phases 1–6 done.** Scott playtested Chapter 1 (T-O5 passed, script approved).
- **Phase 7 = Chapter 2 (The Café Terrace) + the Shop.** Plan: "Phase 7" in `docs/Rise & Shine Bakery — Implementation Plan.md`. MegaBun events are Phase 8, after Chapter 2.

## Phase 7 progress

| Task                    | Status                                                                                                                                                                                    |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T-O1 contract           | Approved by Scott Oct 1. `ShopItem`/`ShopFile`/`GameData.shop`, `buyShopItem` action, `purchased` and `chapterStarted` events. No `GameState` change. `types.ts` is frozen again.         |
| T7.1 loader             | Done. `src/data/shop.json`, zod + cross-checks in `data.ts`, task ids unique across chapters, `src/core/placement.ts` (shared generator placement).                                       |
| T7.2 progression        | Done. Last task of a chapter sets `chapterId` and emits `chapterStarted` (`renovation.ts`). `catchUpChapter` moves old saves that already finished Chapter 1 forward at load (`main.ts`). |
| T7.3 new regulars       | **Data done** (priya, bramble, theo in `customers.json`). **Portraits waiting on Scott's approval:** `docs/art-review/T7.3-chapter2-regulars.png`.                                        |
| T7.4 chapter2.json      | Done. 20 `cafe-` tasks, costs 8–20 (total 274). Hen Coop and Sugar Tin unlock in the first five tasks. All `sceneId`s and `introSceneId` are still `null`.                                |
| T7.5 transition UI      | Done in code (`src/ui/chapterTransition.ts`). **Not yet checked in a browser.**                                                                                                           |
| T7.6 Chapter 2 script   | **Next.**                                                                                                                                                                                 |
| T7.7 Café Terrace art   | **Next.**                                                                                                                                                                                 |
| T7.8 Shop               | Done. `src/core/shop.ts`, `src/ui/shopScreen.ts` and `shopModel.ts`. The Pantry slot is sold there too.                                                                                   |
| T7.9 balance            | Not started.                                                                                                                                                                              |
| T7.10 review + playtest | Not started.                                                                                                                                                                              |

## What's next, in order

1. **T7.3 portraits.** Once Scott approves the sheet, render each one at native 32×32 to `public/art/portrait-<id>-<neutral|happy|impatient>.png`: `CHARACTERS[id](expr).save(...)` in `scripts/art/portraits3.py`. Then delete `docs/art-review/`. The counter reuses `-neutral`.
2. **T7.6 Chapter 2 script.** Write it in the same format as the Chapter 1 scenes: `ch2-intro`, a scene for each new regular's unlock, the Chapter 1 regulars dropping by, and a finale. Then set `introSceneId` and the task `sceneId`s in `chapter2.json`. `main.ts` only parses `chapter1Scenes` today, so merge Chapter 2's scenes in there. **Scott approves the script.**
3. **T7.7 Café Terrace art.** Draw the `cafe-terrace` scene (96×128) and 40 `cafe-terrace-<slug>-before/after` sprites (32×32), following `scripts/art/scene.py` and `shop.py` (the Chapter 1 versions). Send review sheets in batches to `docs/art-review/`. **Scott approves each batch** before anything goes in `public/art/`. Missing art falls back to `_missing`, so the game still runs before then.
4. **T7.9 balance.** Extend `src/sim/simulate.ts` so the bot can buy from the Shop and play past Chapter 1. Tune Chapter 2 task costs and the Shop prices (generators 400 / 600, energy 150 / 500, both guesses). `npm run balance`.
5. **T7.10.** Phase-end review, the full gate including `npm run build`, then Scott's Chapter 2 playtest.

## Standing rules from Scott

- **Pixel art.** Items are 16×16. Portraits and scene objects are 32×32. Ink outline `#3a2414`. Scott approves every batch first. He can't see images sent through chat, so point him to `D:\source\MergeBakery\docs\art-review\<file>.png`.
- **Recipes** only use items the player can get at that point.
- **Contract changes** to `src/core/types.ts` need Scott's T-O1 approval. Stop and explain first.
- **Tests** that check tunables read their values from the data, not hard-coded numbers. Simulator tests have explicit timeouts (60–120 s).
- **Python art scripts** need Pillow. `scripts/art/pixart.py` and `portraits.py` hold the shared helpers (`Canvas`, `outline`, `shaded_head`, `face`). Each script's `__main__` writes only a review sheet.

## Known gotchas

- On WSL `/mnt/d`, npm installs and `vite build` are very slow. Run long commands in the background.
- Rewriting the data JSON with Python's `json.dump` reflows the whole file. Use targeted text edits instead.
