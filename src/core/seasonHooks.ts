/**
 * Season rule hooks (T14.5): core's calls into a season pack's `rules`. See
 * seasonApi.ts for the hook contract. Each function here does nothing unless
 * the player has joined a season, it has started, and its rules define the
 * hook; so a player who never joins plays exactly as without the pack.
 *
 * A bad value returned by a hook is a programming error in the pack and
 * throws, naming the season and the hook. In dev builds (and Vitest) what a
 * hook is given is deep-frozen first, so a hook that mutates it throws.
 */

import type { SeasonContext, SeasonRules } from './seasonApi';
import { runningSeason } from './seasons';
import type {
  Action,
  ActionResult,
  ChainId,
  GameData,
  GameState,
  ItemId,
  LoadedSeason,
  Order,
  OrderReward,
  Rng,
  Timestamp,
  WeightedEntry,
} from './types';

type Done = Extract<ActionResult, { ok: true }>;

interface Active {
  readonly season: LoadedSeason;
  readonly rules: SeasonRules;
}

function activeRules(data: GameData, state: GameState): Active | null {
  const season = runningSeason(data, state);
  return season?.rules ? { season, rules: season.rules } : null;
}

function context(
  data: GameData,
  season: LoadedSeason,
  now: Timestamp,
  rng: Rng,
): SeasonContext {
  return { data, season, now, rng };
}

function fail(season: LoadedSeason, hook: string, problem: string): never {
  throw new Error(`season "${season.def.id}" ${hook}: ${problem}`);
}

/** Subtrees already deep-frozen, so each tick only walks what's new. */
const deepFrozen = new WeakSet<object>();

function deepFreeze(value: unknown): void {
  if (typeof value !== 'object' || value === null || deepFrozen.has(value)) {
    return;
  }
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  deepFrozen.add(value);
}

/** Freezes in place rather than copying, so a hook that returns its state unchanged keeps it the same object. */
function frozen<T>(value: T): T {
  if (import.meta.env.DEV) deepFreeze(value);
  return value;
}

/**
 * Runs the season's hook after a dispatched action: `onTick` after a `tick`,
 * `afterAction` after anything else. The hook's events follow the action's.
 * An `afterAction` rejection rejects the whole action; an `onTick` rejection
 * throws, since a rejected tick would be dropped silently.
 */
export function runSeasonHooks(
  data: GameData,
  result: Done,
  action: Action,
  rng: Rng,
): ActionResult {
  const active = activeRules(data, result.state);
  if (!active) return result;
  const { season, rules } = active;
  const ctx = context(data, season, action.now, rng);

  if (action.type === 'tick') {
    if (!rules.onTick) return result;
    const out = rules.onTick(ctx, frozen(result.state));
    if (!out.ok) fail(season, 'onTick', `rejected the tick ("${out.reason}")`);
    return {
      ok: true,
      state: out.state,
      events: [...result.events, ...out.events],
    };
  }

  if (!rules.afterAction) return result;
  const out = rules.afterAction(
    ctx,
    frozen(result.state),
    frozen(action),
    frozen(result.events),
  );
  if (!out.ok) return out;
  return {
    ok: true,
    state: out.state,
    events: [...result.events, ...out.events],
  };
}

/**
 * The table a tap of `generatorItemId` picks from: `table` plus the season's
 * `extraSpawns`, or `table` itself when there are none.
 */
export function seasonSpawnTable(
  data: GameData,
  state: GameState,
  generatorItemId: ItemId,
  table: readonly WeightedEntry[],
  now: Timestamp,
  rng: Rng,
): readonly WeightedEntry[] {
  const active = activeRules(data, state);
  if (!active) return table;
  const { season, rules } = active;
  if (!rules.extraSpawns) return table;
  const extra = rules.extraSpawns(
    context(data, season, now, rng),
    generatorItemId,
  );
  for (const entry of extra) {
    if (!data.items.has(entry.itemId)) {
      fail(season, 'extraSpawns', `unknown item id "${entry.itemId}"`);
    }
    if (!(Number.isFinite(entry.weight) && entry.weight > 0)) {
      fail(
        season,
        'extraSpawns',
        `weight ${String(entry.weight)} for "${entry.itemId}" isn't above 0`,
      );
    }
  }
  return extra.length === 0 ? table : [...table, ...extra];
}

/** The season's `cooldownMultiplier` for a generator chain; 1 when it has none. */
export function seasonCooldownMultiplier(
  data: GameData,
  state: GameState,
  chainId: ChainId,
  now: Timestamp,
  rng: Rng,
): number {
  const active = activeRules(data, state);
  if (!active) return 1;
  const { season, rules } = active;
  if (!rules.cooldownMultiplier) return 1;
  const multiplier = rules.cooldownMultiplier(
    context(data, season, now, rng),
    chainId,
  );
  if (!(Number.isFinite(multiplier) && multiplier > 0)) {
    fail(
      season,
      'cooldownMultiplier',
      `${String(multiplier)} for "${chainId}" isn't above 0`,
    );
  }
  return multiplier;
}

/**
 * The reward to pay for delivering `order`: the season's `orderReward`, or
 * the order's own. Throws if the hook would run but no `rng` was given.
 */
export function seasonOrderReward(
  data: GameData,
  state: GameState,
  order: Order,
  now: Timestamp,
  rng: Rng | undefined,
): OrderReward {
  const active = activeRules(data, state);
  if (!active) return order.reward;
  const { season, rules } = active;
  if (!rules.orderReward) return order.reward;
  if (!rng) fail(season, 'orderReward', 'no rng was passed to deliverOrder');
  const reward = rules.orderReward(
    context(data, season, now, rng),
    frozen(order),
    frozen(order.reward),
  );
  const amounts: [string, number | undefined][] = [
    ['coins', reward.coins],
    ['stars', reward.stars],
    ['xp', reward.xp],
    ['reputation', reward.reputation],
  ];
  for (const [name, amount] of amounts) {
    if (amount !== undefined && !(Number.isInteger(amount) && amount >= 0)) {
      fail(
        season,
        'orderReward',
        `${name} ${String(amount)} isn't a whole number of 0 or more`,
      );
    }
  }
  return reward;
}
