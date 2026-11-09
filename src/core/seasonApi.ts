/**
 * The hook API a season pack's rules.ts implements (T14.1).
 *
 * FROZEN once approved, like types.ts (Seasons, Scott, Nov 8). A pack declares
 * the SEASON_API_VERSION it was built for; the game skips a pack built for a
 * different one. Adding or changing a hook means a new SEASON_API_VERSION.
 *
 * Rules a pack must follow:
 * - Every hook is pure, under the same conventions as core (see types.ts): it
 *   never mutates its inputs, and time and randomness arrive in the context.
 * - rules.ts may only `import type` from the game, so a pack carries no copy of
 *   game code.
 * - Hooks run only while the player has joined the season and its content has
 *   started (`GameState.season.startedAt` is set). A pack's own saved state
 *   lives in `GameState.season.custom`.
 * - A hook that throws is a programming error, and the error propagates.
 */

import type {
  Action,
  ChainId,
  GameData,
  GameEvent,
  GameState,
  ItemId,
  LoadedSeason,
  Order,
  OrderReward,
  RejectReason,
  Rng,
  Timestamp,
  WeightedEntry,
} from './types';

export const SEASON_API_VERSION = 1;

/** What every hook is given besides its own arguments. */
export interface SeasonContext {
  readonly data: GameData;
  readonly season: LoadedSeason;
  readonly now: Timestamp;
  readonly rng: Rng;
}

/** Like ActionResult: a rejection from `afterAction` rejects the whole action. */
export type SeasonHookResult =
  | {
      readonly ok: true;
      readonly state: GameState;
      readonly events: readonly GameEvent[];
    }
  | { readonly ok: false; readonly reason: RejectReason };

/** A season pack's rules: rules.ts's default export. Every hook is optional. */
export interface SeasonRules {
  readonly apiVersion: typeof SEASON_API_VERSION;
  /** Runs after the core tick. E.g. a ghost appears on the board at midnight. */
  onTick?(ctx: SeasonContext, state: GameState): SeasonHookResult;
  /**
   * Runs after any successful player action (not `tick`), on the state that
   * action produced. E.g. merging two top-tier pumpkins pays a bonus.
   */
  afterAction?(
    ctx: SeasonContext,
    state: GameState,
    action: Action,
    events: readonly GameEvent[],
  ): SeasonHookResult;
  /**
   * Entries mixed into a base generator's spawn table on each tap, weighted
   * against the table's own entries. E.g. pecans from the Flour Mill.
   */
  extraSpawns?(
    ctx: SeasonContext,
    generatorItemId: ItemId,
  ): readonly WeightedEntry[];
  /** Multiplies a generator chain's cooldown, like an event perk. 1 is no change. */
  cooldownMultiplier?(ctx: SeasonContext, chainId: ChainId): number;
  /** Adjusts a delivered order's reward before it is paid. */
  orderReward?(
    ctx: SeasonContext,
    order: Order,
    reward: OrderReward,
  ): OrderReward;
}
