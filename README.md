# Rise & Shine Bakery

A browser merge game. Chapter 1 (Grandma's Corner Shop) is the MVP.

Stack: TypeScript (strict), Vite, PixiJS, Vitest, zod.

Plan: [Rise & Shine Bakery — Implementation Plan](https://claude.ai/artifact/CbuwDrEjZqWZnuhLP7pamp)

## Scripts

| Command             | What it does                     |
| ------------------- | -------------------------------- |
| `npm run dev`       | Start the dev server             |
| `npm test`          | Run unit tests once              |
| `npm run lint`      | ESLint plus Prettier check       |
| `npm run typecheck` | TypeScript with no emit          |
| `npm run build`     | Typecheck, then production build |
| `npm run format`    | Rewrite files with Prettier      |

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
