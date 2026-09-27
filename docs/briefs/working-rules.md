# Working rules for handed-off tasks

Every brief's Rules line points here. Follow all of these.

## Scope

- Edit only the files your brief lists. Never edit `src/core/types.ts` or another task's files. If you need a change outside your files, stop and explain it in your report.
- No new dependencies.
- When your brief names a function from another task's file, import it; don't copy its logic.

## Working alongside other sessions

- Other sessions work in this folder at the same time. Don't run git commands, `npm install`, `npm run format`, or Prettier or ESLint on the whole folder.
- Don't start the dev server or use a browser. The phase-end review does the browser checks.
- If your brief lets you add lines to a shared file such as `src/main.ts`, change it with small Edit calls, never a full rewrite. If an edit fails because the file changed, read it again and retry.

## Core conventions (from the header of `src/core/types.ts`)

- Core functions are pure: never mutate inputs; return new objects. No DOM, rendering, storage, or `Date.now()` in `src/core`.
- `data: GameData` is the first parameter. Time comes in as `now`, randomness as `rng`.
- A player action that breaks a rule returns `{ ok: false, reason }` using a `RejectReason` from types.ts. A programming error (unknown id, out-of-range cell) throws.
- Durations in data are seconds; timestamps in state are milliseconds.

## Tests

- Vitest, colocated as `<file>.test.ts`. Tests for new logic are required.
- Use `loadGameData()` from `src/core/data.ts` for real data. Build test states with `stateWith()` from `src/core/testing.ts` once it exists (task T2.1 adds it).

## Before you finish

Run all of these and report each result:

1. `npx vitest run <your test files>`
2. `npm run typecheck`: it must print no errors in your files (Vitest doesn't typecheck, so passing tests aren't enough). The project uses `noUncheckedIndexedAccess`, so indexing an array gives `T | undefined`. List any errors in other files without fixing them
3. `npx eslint <your files>`
4. `npx prettier --write <your files>`, then `npx prettier --check <your files>`

Then reply with the files you changed, each "Done when" check with its result, and anything in the contract that seemed wrong.
