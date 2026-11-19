# Phase 14 — Seasons (implementation plan, for review)

Scott, Nov 8: themed seasons (Halloween, Thanksgiving, Christmas, Easter, …) added one at a time as external modules the game consumes. Decisions, Nov 8:

- **Form:** runtime content packs that can also ship code. The game checks the server for newly deployed seasons, and a season can add its own rules.
- **Schedule:** real calendar, yearly, in the player's local date.
- **Opt-in:** the player chooses to play a season and can join at any time while its window is open. A player who doesn't join plays as if there were no season.
- **Content (first version):** seasonal generator + chain, seasonal recipes + orders, visual/audio theme, reward track with permanent keepsakes. Seasonal recipes exist only while the season is active.
- **MegaBun events:** paused while a joined season runs; a running event finishes first.
- **First pack:** Thanksgiving.
- **Art:** emoji placeholders for now; pixel art that matches the game comes later.

Nothing here is built yet. This needs your approval, including the contract changes in section 3, before any code is written.

---

## 1. How it fits together

```
seasons/<id>/            source of one pack (in this repo, outside src/)
  season.json            data: window, chains, items, generator, recipes, milestones, keepsakes, theme
  placeholders.json      spriteKey → emoji, for placeholder art
  rules.ts               optional code hooks (pure functions)
  rules.test.ts          tests against testData + this pack
  scenes.json            optional intro dialogue
  art/*.png              real art when it exists; overrides the emoji placeholder

        │  npm run build:seasons  (Vite library build, no new deps)
        ▼
public/seasons/index.json                  catalog: id, name, version, window, apiVersion, path
public/seasons/<id>/<version>/season.json
public/seasons/<id>/<version>/rules.js     ES module, self-contained
public/seasons/<id>/<version>/art/…        .png where drawn, generated emoji .svg otherwise
        │  deployed with the site (GitHub Pages workflow, unchanged)
        ▼
game at startup:  fetch index.json → pick packs → fetch season.json + import(rules.js)
                  → validate → merge into GameData → load save → create store
```

Packs are built separately from the game bundle and found at runtime, so a phone running an older cached build still picks up a new season from `index.json` without a game update. Paths are versioned (`<id>/<version>/`) so cached rules and data never mismatch.

**Layers stay one-directional.** Pack data is validated and merged into `GameData` by a loader outside core (`src/seasons/`). Core sees seasons only through `GameData.seasons` and `GameState.season`, and calls a season's hooks the same way it reads any other data. Core stays free of fetch, DOM, and `Date`.

**Calendar.** A pack declares a month-day window, e.g. `{ "start": "11-12", "end": "11-30" }` (Dec→Jan wrap allowed). The loader resolves it to concrete `startsAt`/`endsAt` timestamps for the current occurrence in local time. Core only compares `now` against those numbers.

**Checking for new seasons.** On startup, every 30 minutes, and when the tab becomes visible again, the game refetches `index.json`. If a season whose window is open isn't loaded, it shows a small "A new season has arrived — tap to see it" banner that reloads the page (the game autosaves first). I'm recommending reload over hot-swapping `GameData` under a running store: UI modules read `store.data` at mount, and swapping it live is where subtle bugs would come from.

**Offline (PWA).** `seasons/**` is excluded from the Workbox precache. `index.json` is network-first (3 s timeout, then cache); versioned pack files are cache-first. A season loaded once keeps working offline.

**Security.** Packs load only from this site's own origin under `BASE_URL/seasons/`; ids are checked against `^[a-z0-9-]+$`. A pack is code you deploy, so it runs with the game's full permissions — the same trust as the game itself, and never from a third-party URL.

**Placeholder art.** The pack build generates a 128×128 SVG for each sprite key without a PNG: the chain's color as a rounded tile, the emoji from `placeholders.json` in the middle, and the tier in a corner, matching the look of the current base-game placeholders. Dropping a PNG with the same key into `art/` replaces it, with no data change. Emoji inside an SVG loaded as an image use the device's emoji font; I'll confirm they render in the browser in T14.7.

---

## 2. What a season does in play

**Invitation.** When a season's window is open and the tutorial is done, a season button appears in the top bar, and the first time the player sees it a card invites them ("Harvest Supper has come to the harbor — join in?"). "Not now" closes the card; the button stays for the whole window, so the player can join at any time. Whether the card was seen is a UI setting in localStorage, not game state.

**Not joined.** The pack's data is loaded, but nothing in play changes: no generator, no seasonal orders or recipes, no theme, no rule hooks, and MegaBun events run as usual.

**Joining.** `joinSeason` records the choice. The season's content starts at once, even if a MegaBun event is running: the two run side by side until the event ends (Scott, Nov 18; it used to wait for the event). Once joined, the season runs until its window ends; there's no leaving early (say if you want a "leave season" option — the end-of-season sweep already does what leaving would need).

**Seasonal chain and recipes.** Pack chains and recipes merge into the normal systems: tap, merge, bake, and Recipe Book discovery all work unchanged. Seasonal recipes may mix seasonal and base ingredients (Pumpkin + Flour + Butter → Pumpkin Pie). They appear in the Kitchen and Recipe Book only while the joined season is running.

**Seasonal orders.** Separate from regular orders, like event orders: up to `orders.maxOpen` walk-ins asking for the pack's items, paying coins and Season Points. Regular orders never ask for seasonal items.

**Reward track.** Season Points fill a milestone track. A milestone pays coins, gems, and/or a keepsake. Keepsakes are permanent; the state stores a snapshot (id, name, spriteKey, season, year), so a keepsake still shows after its pack is gone. They go on a shelf in the Location view beside the trophies.

**MegaBun events.** No event starts while a joined season runs. An event that came due during the season starts when the season ends.

**End.** At the window end: seasonal items on the board, in the Pantry, and in oven slots are sold at their sell value; the generator is removed; unclaimed reached milestones are paid; a result card shows. Seasonal ids are removed from `discovered` and `pendingDiscoveries`, so the save stays valid without the pack.

**Theme.** While a joined season runs: CSS token overrides (only names that already exist in `tokens.css`), an optional board background sprite, a music theme in the same shape as `music.json`, and an optional intro scene played on joining.

**A save whose pack can't load** (offline before ever caching it, or a broken deploy). Today `deserializeSave` rejects any save with an unknown item id, which would lose the player's game. New step in save loading: when `state.season` names a season missing from `GameData`, ids starting with `<seasonId>-` are removed from the board, Pantry, ovens, orders, and discoveries, each item paying `economy.seasons.orphanItemCoins`, and the season ends without a result. Pack ids must carry the season prefix (the validator enforces it), which is what makes this safe.

---

## 3. Contract changes needed (`types.ts` is frozen — approval requested)

New types:

```ts
export type SeasonId = string;
export type KeepsakeId = string;

export interface SeasonWindow {
  readonly start: string;
  readonly end: string;
} // "MM-DD", local date

export interface SeasonReward {
  readonly coins: number;
  readonly gems: number;
  readonly keepsakeId?: KeepsakeId;
}
export interface SeasonMilestone {
  readonly points: number;
  readonly reward: SeasonReward;
}
export interface KeepsakeDef {
  readonly id: KeepsakeId;
  readonly name: string;
  readonly spriteKey: string;
}

export interface SeasonDef {
  readonly id: SeasonId;
  readonly name: string;
  readonly version: string;
  readonly apiVersion: number;
  readonly window: SeasonWindow;
  readonly generatorItemId: ItemId;
  readonly pointsPerItem: number;
  readonly orders: EventOrderRules; // reused
  readonly milestones: readonly SeasonMilestone[];
  readonly keepsakes: readonly KeepsakeDef[];
}

/** A pack as core sees it: its def, its resolved window, its hooks. */
export interface LoadedSeason {
  readonly def: SeasonDef;
  readonly startsAt: Timestamp;
  readonly endsAt: Timestamp;
  readonly rules: SeasonRules | null; // from seasonApi.ts
}

/** The season the player joined. */
export interface ActiveSeason {
  readonly seasonId: SeasonId;
  readonly joinedAt: Timestamp;
  /** When its content started; null while waiting for a running MegaBun event to end. */
  readonly startedAt: Timestamp | null;
  readonly endsAt: Timestamp;
  readonly points: number;
  readonly claimedMilestones: readonly number[];
  /** The pack's own saved state for its rules. Plain JSON. */
  readonly custom: JsonValue;
}

export interface SeasonResult {
  readonly seasonId: SeasonId;
  readonly points: number;
  readonly coins: number;
}

export interface KeepsakeRecord {
  readonly id: KeepsakeId;
  readonly seasonId: SeasonId;
  readonly name: string;
  readonly spriteKey: string;
  readonly year: number;
}
```

Additions to existing types:

- `GameData.seasons: ReadonlyMap<SeasonId, LoadedSeason>` (empty when no pack loaded).
- `Chain.seasonId?` and `Recipe.seasonId?`, stamped by the loader, never written in JSON.
- `Economy.seasons: { orphanItemCoins: number }`.
- `GameState.season: ActiveSeason | null`, `seasonResult: SeasonResult | null`, `keepsakes: readonly KeepsakeRecord[]`.
- `Order.seasonPoints?`.
- Actions: `joinSeason { seasonId }`, `claimSeasonMilestone { index }`, `dismissSeasonResult`.
- GameEvents: `seasonJoined`, `seasonStarted`, `seasonEnded { seasonId, points }`, `seasonMilestoneClaimed`, `keepsakeEarned`, and one generic `seasonRule { seasonId, name, payload }` a pack's rules can emit (for a sound or toast).
- RejectReasons: `seasonNotOpen` (joining outside the window, before the tutorial is done, or a season not loaded), `noActiveSeason` (claiming with no joined season). Joining twice reuses `alreadyCompleted`.
- **Save version 4.** Migration 3 → 4: `season: null`, `seasonResult: null`, `keepsakes: []`.

### The hook API — `src/core/seasonApi.ts` (new, frozen once approved, versioned)

```ts
export const SEASON_API_VERSION = 1;

export interface SeasonContext {
  readonly data: GameData;
  readonly season: LoadedSeason;
  readonly now: Timestamp;
  readonly rng: Rng;
}

export type SeasonHookResult =
  | {
      readonly ok: true;
      readonly state: GameState;
      readonly events: readonly GameEvent[];
    }
  | { readonly ok: false; readonly reason: RejectReason };

/** Every hook is optional, pure, and runs only while this season is joined and started. */
export interface SeasonRules {
  readonly apiVersion: 1;
  /** After the core tick. E.g. a ghost appears on the board at midnight. */
  onTick?(ctx: SeasonContext, state: GameState): SeasonHookResult;
  /** After any successful player action. E.g. merging two max-tier pumpkins pays a bonus. */
  afterAction?(
    ctx: SeasonContext,
    state: GameState,
    action: Action,
    events: readonly GameEvent[],
  ): SeasonHookResult;
  /** Extra entries mixed into a base generator's spawn table. E.g. pecans from the Flour Mill. */
  extraSpawns?(
    ctx: SeasonContext,
    generatorItemId: ItemId,
  ): readonly WeightedEntry[];
  /** Multiplies a generator chain's cooldown, like event perks. */
  cooldownMultiplier?(ctx: SeasonContext, chainId: ChainId): number;
  /** Adjusts an order's reward before it's paid. */
  orderReward?(
    ctx: SeasonContext,
    order: Order,
    reward: OrderReward,
  ): OrderReward;
}
```

`rules.ts` may only `import type` from `src/` (lint rule), so packs carry no copy of game code. A pack built for a different `apiVersion` is skipped with a `console.error` and that season doesn't run. In dev builds the state passed to hooks is deep-frozen, so a hook that mutates fails loudly. A hook that throws is a programming error and throws, like the rest of core.

Out of scope for v1: custom player actions and custom UI from packs. The five hooks above cover the rule ideas I could come up with for the first seasons; adding a hook later means `SEASON_API_VERSION` 2.

---

## 4. The Thanksgiving pack (T14.9 sketch)

"Harvest Supper", window Nov 12 – Nov 30 (Thanksgiving is Nov 26). Names and numbers are a first pass for the brief; tell me what to change.

- **Generator:** Pumpkin Patch 🎃, placed on joining.
- **Chains:** Pumpkin (🌱 seedling → 🎃 small pumpkin → pumpkin → prize pumpkin) and Cranberry (🫐 → handful → basket).
- **Recipes:** Pumpkin Pie 🥧 (pumpkin + flour + butter), Cranberry Tart (cranberries + flour + sugar), each starting a short baked chain the seasonal orders ask for.
- **Rules (`rules.ts`):** `extraSpawns` — the Flour Mill sometimes drops pecans 🌰 during the season; `orderReward` — a seasonal order with three items is a "Feast order" and pays 50% more coins.
- **Track:** 5 milestones (coins and gems), the top two paying keepsakes: a Harvest Wreath and a Prize Pumpkin Trophy.
- **Theme:** warm orange token overrides, an autumn music theme, an intro scene with Grandma's recipe card.

Timing: today is Nov 8 and the window closes Nov 30, so the system and the pack have to land in about three weeks to play this year. If they don't, the pack waits for next November, and dev tools can force it any time for testing.

---

## 5. Tasks (one branch and PR each, `t14.n-…`)

| Task   | What                                                                                                                                                                                                                                                                     | Main files                                                        |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| T14.1  | Contract: section 3 in `types.ts`, `seasonApi.ts`, save v4 + migration, save fixtures                                                                                                                                                                                    | `types.ts`, `seasonApi.ts`, `save.ts`, `migrate.ts`               |
| T14.2  | Pack format: zod schema, cross-checks (id prefix, references into base data, milestone order, keepsake ids), `withSeasons(base, packs)` building merged `GameData`; a fixture pack for tests                                                                             | `src/seasons/pack.ts`, `src/seasons/fixtures/`                    |
| T14.3  | Calendar: `resolveWindow(window, now, tzOffsetMin)`, year wrap, DST edges                                                                                                                                                                                                | `src/seasons/calendar.ts`                                         |
| T14.4  | Core lifecycle: `joinSeason`, deferred start behind a running event, seasonal orders and points, milestones, keepsakes, end-of-season sweep, events pause only when joined, regular orders exclude seasonal chains, seasonal recipes only while running; dispatch wiring | `src/core/seasons.ts`, `events.ts`, `orders.ts`, `dispatch.ts`    |
| T14.5  | Hooks: dispatch runs `onTick`/`afterAction`; generators use `extraSpawns`/`cooldownMultiplier`; delivery uses `orderReward`; all skipped unless joined and started; dev deep-freeze                                                                                      | `dispatch.ts`, `generators.ts`, `deliver.ts`                      |
| T14.6  | Runtime loading: index fetch, pack selection (open window + the save's season), `import()` of rules, art registry in `assets.ts`, orphan sweep in save loading, async startup in `main.ts`, periodic check + new-season banner                                           | `src/seasons/loader.ts`, `assets.ts`, `save.ts`, `main.ts`        |
| T14.7  | Build + deploy: `scripts/build-seasons.js` (Vite API, library mode) → `public/seasons/` (gitignored), emoji placeholder SVGs, `predev`/`prebuild`, Workbox `globIgnores` + runtime caching, `seasons/` in tsconfig/vitest/eslint                                         | `scripts/`, `vite.config.ts`, `package.json`                      |
| T14.8  | Season UI: top-bar season button and invitation card, season sheet (points, track, claim), result card, keepsake shelf, theme (tokens, board background, music), intro scene; dev tools "force season" and "end season now"                                              | `src/ui/season*.ts`, `locationView.ts`, `music.ts`, `devTools.ts` |
| T14.9  | Thanksgiving pack (section 4), placeholder art, sim run through the season window both joined and not joined                                                                                                                                                             | `seasons/thanksgiving/`, `src/sim/`                               |
| T14.10 | Scott plays the season                                                                                                                                                                                                                                                   | —                                                                 |

T14.2 and T14.3 can run in parallel after T14.1; T14.4–T14.6 follow in order; T14.7 and T14.8 can run alongside T14.5–T14.6. Each task gets a brief in `docs/briefs/` and a Phase 14 entry in `task.md` once this plan is approved. The existing balance test runs without packs, so it is unaffected.
