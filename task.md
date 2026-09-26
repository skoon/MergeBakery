# Phases 2 and 3 — Board, merge, generators, energy, orders

Source: [Rise & Shine Bakery — Implementation Plan](https://claude.ai/artifact/CbuwDrEjZqWZnuhLP7pamp)
Briefs: docs/briefs/ (rules for every session in working-rules.md)

Tasks start as soon as their dependencies finish. Opus connects each core function to src/core/dispatch.ts as it lands.

## Core

- [x] T2.1 board.ts helpers + testing.ts `stateWith` (Haiku)
- [x] T2.2 merge.ts `canMerge`/`nextTier` + discovery.ts `discover` (Haiku; review fix: test typecheck)
- [x] T3.1 energy.ts (Haiku)
- [x] T3.5 customers.json (Haiku)
- [x] T3.8 level.ts `addXp` (Haiku)
- [x] T2.5 locks.ts `clearAdjacentLocks` (Haiku) — after T2.1
- [x] T3.4 pantry.ts (Haiku) — after T2.1
- [x] T3.6 orders.ts `generateOrder`/`refillOrders` (Sonnet) — after T3.5, T2.1
- [x] T3.2 generators.ts `tapGenerator`/`collectBonus` (Sonnet) — after T2.1, T2.2, T3.1
- [x] T2.3 drop.ts `applyDrop` (Sonnet) — after T2.1, T2.2, T2.5, T3.8
- [x] T3.7 deliver.ts `deliverOrder` (Haiku) — after T3.6
- [x] T2.4 five-merge bonus in drop.ts (Sonnet) — after T2.3
- [x] T3.3 Golden Whisk in drop.ts (Haiku) — after T2.4
- [x] Wire handlers into dispatch.ts (Opus): drop, tapGenerator, collectBonus, sell, undoSell, storeInPantry, takeFromPantry, buyPantrySlot, deliverOrder, tick. Still stubs (Phases 4–5): loadRecipe, collectBake, rushBake, mergeOvens, completeTask, dismissDiscovery, setTutorialStep

## Rendering and UI

- [x] T2.6 assets.ts registry + \_missing.svg (Haiku)
- [x] T2.7 placeholder SVGs + scripts/gen-placeholder-art.js (Haiku)
- [x] T2.8 store, layout, drop zones, BoardView, main.ts (Sonnet) — after T2.3, T2.6, drop wired
- [x] T2.9 merge and sell animations (Sonnet) — after T2.8
- [x] T2.10 sell/undoSell + sell bin (Haiku) — after T2.8
- [x] T3.9 counter strip (Sonnet) — after T2.8, T3.7
- [x] T3.10 top bar (Haiku) — after T2.8
- [x] T3.11 Pantry drawer (Sonnet) — after T2.8, T3.4

## Phase-end review (T-O2)

- [x] Lint, typecheck, 395 tests in 28 files, build
- [x] Browser (375 × 812 and 1280 × 800): tap, merge, deliver, new order after 5 s; sell and undo; Pantry store, take out, buy slot; HUD countdown; no console errors. Not checked: 60 fps and the merge pop's feel (the pane was hidden)
- [ ] Milestone 1 playtest (T-O5, Scott) after T2.9

## Review fixes

- assets.ts `setImageArt`: images rebuilt after a key had failed stayed broken; known-missing keys now go straight to the placeholder
- counterStrip.css: cards overflowed the 104 px strip and the portrait covered the name; now a compact grid (about 96 px)
- boardView.ts: flour sacks looked like empty tiles; now butter-filled with a tie
- pantryDrawer.ts: dragging a tile out never reached the board (pointer capture didn't hold, and a failed drag left stale state); drag now tracked on window, native image drag blocked
- main.ts: removed stopgap `export`s

## Notes

- 2026-09-25 17:07: node_modules was reinstalled for Linux from outside this session; reinstalled for Windows at Scott's OK.
- Haiku sessions have twice reported a clean typecheck that wasn't; every report gets rechecked.

## Open from earlier phases

- [ ] T0.4 "three passing checks" needs a GitHub remote and a first pull request
- [ ] T0.3 live window resize not yet checked in a visible browser tab
