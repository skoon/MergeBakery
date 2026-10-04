# Rise & Shine Bakery

A browser merge game. Chapter 1 (Grandma's Corner Shop) is the MVP.

Stack: TypeScript (strict), Vite, PixiJS, Vitest, zod.

Plan: [Rise & Shine Bakery — Implementation Plan](https://claude.ai/artifact/CbuwDrEjZqWZnuhLP7pamp)

## Scripts

| Command             | What it does                           |
| ------------------- | -------------------------------------- |
| `npm run dev`       | Start the dev server                   |
| `npm test`          | Run unit tests once                    |
| `npm run lint`      | ESLint plus Prettier check             |
| `npm run typecheck` | TypeScript with no emit                |
| `npm run build`     | Typecheck, then production build       |
| `npm run format`    | Rewrite files with Prettier            |
| `npm run balance`   | Print the balancing simulator's report |

The color token test page is at `/dev/tokens.html` while the dev server runs.

## Folders

| Folder        | Holds                                                        |
| ------------- | ------------------------------------------------------------ |
| `src/core/`   | Game logic as pure functions; no rendering or DOM imports    |
| `src/data/`   | JSON game data: items, generators, recipes, economy          |
| `src/render/` | PixiJS rendering                                             |
| `src/ui/`     | HTML overlay screens and CSS tokens                          |
| `src/audio/`  | Audio manager and sound wiring                               |
| `public/art/` | SVG art, looked up through the asset registry by `spriteKey` |

## Handoff rules

- One task, one branch, one pull request. Merge only when its "Done when" check passes.
- Game logic lives in `src/core/` as pure TypeScript functions with no rendering or DOM imports. This is what makes most tasks safe to hand to small models.
- The contracts in `src/core/types.ts` (task T1.1) are frozen after review. Handed-off tasks may not edit them; they flag a needed change instead.
- Every core task ships with Vitest tests. Rendering tasks ship with a manual check listed in "Done when."
- Numbers (energy regen, costs, drop rates) come from JSON in `src/data/`, never hard-coded.

## Performance and size

Targets from the GDD: 60 fps on a mid-range phone, under 5 MB initial download, first merge within 10 seconds of load.

Measured on Oct 3, 2026 from `npm run build` (Vite 8, all five chapters, all art):

| What                     | Size                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Whole `dist/` folder     | about 1.27 MB (496 art files in 212 KB)                                                                                   |
| JavaScript, CSS and HTML | 968 kB raw, 280 kB gzipped (the game bundle is 396 kB raw, 111 kB gzipped; PixiJS's renderer chunks are most of the rest) |
| Service worker precache  | 529 entries, 1.14 MiB                                                                                                     |

The size target holds with a wide margin: the whole game, art included, is a quarter of the budget.

Not measured here, because it needs a real browser on a real phone, which this environment doesn't have:

- **Frame rate.** Open the game on a mid-range Android phone, play on a full board, and watch a frame-time graph (Chrome DevTools, Performance). The board redraws only on a state change, and the one-second `tick` returns the same state object when nothing happened, so an idle board does no work.
- **First merge.** Time from load to the first merge on a throttled connection (DevTools, Slow 4G). The first-time flow (T5.12) points at the first tap and merge.

Record both numbers here once measured.
