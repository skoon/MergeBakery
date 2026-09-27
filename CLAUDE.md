# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Rise & Shine Bakery: a browser merge game. TypeScript (strict), Vite, PixiJS, Vitest, zod. Chapter 1 is the MVP.

## Commands

| Command                                 | What it does                                   |
| --------------------------------------- | ---------------------------------------------- |
| `npm run dev`                           | Dev server (tokens page at `/dev/tokens.html`) |
| `npm test`                              | All tests once                                 |
| `npx vitest run src/core/ovens.test.ts` | One test file                                  |
| `npx vitest run -t 'name'`              | One test by name                               |
| `npm run typecheck`                     | `tsc --noEmit` (Vitest does NOT typecheck)     |
| `npm run lint`                          | ESLint + Prettier check                        |
| `npm run build`                         | Typecheck then Vite build                      |
| `npm run art:placeholders`              | Regenerate `public/art/*.svg` from items.json  |

CI (on PRs) runs lint, typecheck, and test as separate jobs.

## Architecture

Four layers, one direction: `data → core → ui/render`.

- **`src/data/*.json`** — every tunable number (energy regen, costs, drop rates, durations). Never hard-code them. `loadGameData()` in `src/core/data.ts` imports them via `import.meta.glob`, validates with zod, cross-checks ids/weights/sequences, and builds the `GameData` lookup maps. Chapter files are discovered by the `chapterN.json` name pattern.
- **`src/core/`** — all game logic as pure functions. No DOM, no rendering, no storage, no `Date.now()`. Each action has its own module (`merge.ts`, `sell.ts`, `pantry.ts`, `kitchen.ts`, `ovens.ts`, …) returning an `ActionResult`.
- **`src/core/dispatch.ts`** — the reducer. `createDispatch(handlers)` builds an `Rng` from `state.rngState`, routes the `Action` to its module, and writes `rng.getState()` back into the returned state. A new action type means: a case in `routeAction` plus an entry in the exported `dispatch` handler map.
- **`src/ui/store.ts`** — `createStore(data, initial, dispatch, clock)`. Stamps `now` onto actions, keeps the current state, notifies subscribers with `(state, events)`. This is the only place UI and render touch state; both `src/render/` and `src/ui/` take a `GameStore`.
- **`src/main.ts`** — wiring only: load data, new game, create store, mount Pixi board view + HTML overlays, and a 1 s `tick` interval.

Rendering is split: PixiJS canvas for the board (`src/render/`), HTML/CSS overlays for HUD, pantry, sell bin, counter (`src/ui/`). Overlay logic that can be tested lives in a `*Model.ts` beside the DOM file. Art is looked up by `spriteKey` through `src/render/assets.ts`, which falls back to a `_missing` placeholder rather than throwing.

`src/core/types.ts` is the frozen contract for all of it: state shape, `ActionBody`, `RejectReason`, `GameEvent`, `Dispatch`. Read it before writing core code.

## Conventions

- `src/core/types.ts` is frozen. If a contract looks wrong, stop and explain — don't edit it.
- Core functions are pure and never mutate inputs. `data: GameData` is the first parameter; time arrives as `now`, randomness as `rng`.
- A broken game rule returns `{ ok: false, reason }` with a `RejectReason`. A programming error (unknown id, out-of-range index) throws.
- Durations in data are seconds (`...Sec`); timestamps in state are milliseconds.
- `noUncheckedIndexedAccess` is on — indexing an array gives `T | undefined`. Passing tests are not enough; run `npm run typecheck`.
- Tests are Vitest, colocated as `<file>.test.ts`. Build states with `stateWith()` from `src/core/testing.ts` and real data from `testData` there.
- No new dependencies.

## Task workflow

Work is driven by `task.md` (current phase checklist and decisions) and per-task briefs in `docs/briefs/T<phase>.<n>.md`. Each brief names the files it may touch and its "Done when" check. `docs/briefs/working-rules.md` holds the rules for handed-off sessions — notably that other sessions may be editing this folder concurrently, so avoid repo-wide `npm run format`, lint, or git commands, and edit shared files (`src/main.ts`, `dispatch.ts`) with small targeted edits.

One task, one branch, one PR.
