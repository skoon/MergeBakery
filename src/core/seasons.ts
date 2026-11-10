/**
 * Seasons in core (T14.4): joining a loaded season while its window is open,
 * starting it (its generator placed, its orders opened), its milestones and
 * keepsakes, and the end-of-season sweep. Modeled on MegaBun events.
 *
 * Core never loads packs or reads the clock: `data.seasons` arrives with each
 * window already resolved to this year's run (src/seasons/).
 */

import { eligibleCustomers, pickUniform } from './orders';
import { placeGenerator } from './placement';
import type {
  ActionResult,
  ActiveSeason,
  BoardItem,
  ChainId,
  GameData,
  GameEvent,
  GameState,
  ItemId,
  KeepsakeId,
  KeepsakeRecord,
  LoadedSeason,
  Order,
  Rng,
  SeasonDef,
  SeasonId,
  Timestamp,
} from './types';

const DAY = 86_400_000;

type Step = { state: GameState; events: GameEvent[] };

/** The joined season once its content has started and while its pack is loaded; null otherwise. */
export function runningSeason(
  data: GameData,
  state: GameState,
): LoadedSeason | null {
  const season = state.season;
  if (!season || season.startedAt === null) return null;
  return data.seasons.get(season.seasonId) ?? null;
}

/**
 * True for base-game content (no `seasonId`), and for a season's content while
 * that season runs.
 */
export function seasonContentAvailable(
  data: GameData,
  state: GameState,
  seasonId: SeasonId | undefined,
): boolean {
  return (
    seasonId === undefined || runningSeason(data, state)?.def.id === seasonId
  );
}

/** True for an item a season pack added. Throws on an unknown id. */
export function isSeasonalItem(data: GameData, itemId: ItemId): boolean {
  const item = data.items.get(itemId);
  if (!item) throw new Error(`isSeasonalItem: unknown item id "${itemId}"`);
  return data.chains.get(item.chainId)?.seasonId !== undefined;
}

/**
 * The calendar year a season's window opened. `endsAt` is local midnight
 * after the window's last day; every time zone is within a day of UTC, so the
 * last day's year is the first whose UTC date after the last day is no more
 * than a day before it. A run ended early (dev tools' "end season now", T14.8)
 * still counts as the run it was in.
 */
function seasonYear(def: SeasonDef, endsAt: Timestamp): number {
  const [month = 0, day = 0] = def.window.end.split('-').map(Number);
  const near = new Date(endsAt).getUTCFullYear();
  const lastDayYear = [near - 1, near, near + 1].find(
    (year) => Date.UTC(year, month - 1, day + 1) >= endsAt - DAY,
  );
  if (lastDayYear === undefined) {
    throw new Error(
      `seasonYear: season "${def.id}" can't end at ${endsAt.toString()}`,
    );
  }
  return def.window.end < def.window.start ? lastDayYear - 1 : lastDayYear;
}

function keepsakeRecord(
  def: SeasonDef,
  keepsakeId: KeepsakeId,
  endsAt: Timestamp,
): KeepsakeRecord {
  const keepsake = def.keepsakes.find((k) => k.id === keepsakeId);
  if (!keepsake) {
    throw new Error(
      `keepsakeRecord: season "${def.id}" has no keepsake "${keepsakeId}"`,
    );
  }
  return {
    id: keepsake.id,
    seasonId: def.id,
    name: keepsake.name,
    spriteKey: keepsake.spriteKey,
    year: seasonYear(def, endsAt),
  };
}

/**
 * A new seasonal order with id state.nextOrderId: a walk-in asks for
 * minItems–maxItems items, picked evenly from the pack's ingredient and baked
 * items within its tiers. It pays the items' sellValue in coins, no stars or
 * XP, and pointsPerItem per item in Season Points.
 */
function generateSeasonOrder(
  data: GameData,
  state: GameState,
  def: SeasonDef,
  rng: Rng,
): Order {
  const minTier = def.orders.minTier ?? 1;
  const candidates = [...data.items.values()].filter((item) => {
    const chain = data.chains.get(item.chainId);
    return (
      chain?.seasonId === def.id &&
      (chain.kind === 'ingredient' || chain.kind === 'baked') &&
      item.tier >= minTier &&
      item.tier <= def.orders.maxTier
    );
  });
  if (candidates.length === 0) {
    throw new Error(`generateSeasonOrder: no items for season "${def.id}"`);
  }
  const walkIns = [...data.customers.values()].filter(
    (c) => c.kind === 'walkIn',
  );
  const customer = pickUniform(eligibleCustomers(walkIns, state), rng);

  const count =
    def.orders.minItems +
    Math.floor(rng.next() * (def.orders.maxItems - def.orders.minItems + 1));
  const wants = Array.from(
    { length: count },
    () => pickUniform(candidates, rng).id,
  );
  const coins = wants.reduce(
    (sum, id) => sum + (data.items.get(id)?.sellValue ?? 0),
    0,
  );
  return {
    id: state.nextOrderId,
    customerId: customer.id,
    wants,
    reward: { coins, stars: 0, xp: 0 },
    seasonPoints: def.pointsPerItem * count,
  };
}

/** Tops the started season's orders up to its maxOpen. Same state when none arrive. */
function topUpOrders(
  data: GameData,
  state: GameState,
  def: SeasonDef,
  rng: Rng,
): Step {
  let next = state;
  const events: GameEvent[] = [];
  if (!state.season || state.season.startedAt === null) {
    return { state, events };
  }
  const open = (): number =>
    next.orders.filter((o) => o.seasonPoints !== undefined).length;
  while (open() < def.orders.maxOpen) {
    const order = generateSeasonOrder(data, next, def, rng);
    next = {
      ...next,
      orders: [...next.orders, order],
      nextOrderId: next.nextOrderId + 1,
    };
    events.push({ type: 'orderArrived', orderId: order.id });
  }
  return { state: next, events };
}

/**
 * Starts a joined season that is waiting: once no MegaBun event is running and
 * its generator fits on the board or in the Pantry. Same state when it can't.
 */
function startSeason(
  data: GameData,
  state: GameState,
  def: SeasonDef,
  now: Timestamp,
): Step {
  const season = state.season;
  if (!season || season.startedAt !== null || state.event !== null) {
    return { state, events: [] };
  }
  const placed = placeGenerator(data, state, def.generatorItemId);
  if (!placed) return { state, events: [] };
  return {
    state: { ...placed.state, season: { ...season, startedAt: now } },
    events: [{ type: 'seasonStarted', seasonId: def.id }, ...placed.events],
  };
}

/**
 * Everything seasonal leaves at once: board, Pantry and oven items are sold,
 * seasonal orders, discoveries and staff assignments are dropped, and reached
 * but unclaimed milestones are paid. Leaves the result card.
 */
function endSeason(
  data: GameData,
  state: GameState,
  active: ActiveSeason,
  def: SeasonDef,
): Step {
  const ofSeason = (chainId: ChainId): boolean =>
    data.chains.get(chainId)?.seasonId === def.id;
  const seasonalItem = (itemId: ItemId): boolean => {
    const item = data.items.get(itemId);
    return item !== undefined && ofSeason(item.chainId);
  };

  let coins = 0;
  // True when the item is to be removed; adds its value to coins. Generators pay nothing.
  const sweep = (item: BoardItem): boolean => {
    const itemDef = data.items.get(item.itemId);
    const chain = itemDef && data.chains.get(itemDef.chainId);
    if (!itemDef || chain?.seasonId !== def.id) return false;
    if (chain.kind !== 'generator') coins += itemDef.sellValue;
    return true;
  };
  const cells = state.board.cells.map((cell) =>
    cell.kind === 'item' && sweep(cell.item)
      ? { kind: 'empty' as const }
      : cell,
  );
  const pantryItems = state.pantry.items.filter((item) => !sweep(item));
  const ovens = state.kitchen.ovens.map((oven) => ({
    ...oven,
    slots: oven.slots.map((bake) => {
      const recipe = bake && data.recipes.get(bake.recipeId);
      if (!bake || recipe?.seasonId !== def.id) return bake;
      coins += data.items.get(recipe.output)?.sellValue ?? 0;
      return null;
    }),
  }));

  const unclaimed = def.milestones.filter(
    (m, i) =>
      m.points <= active.points && !active.claimedMilestones.includes(i),
  );
  const keepsakes = unclaimed.flatMap((m) =>
    m.reward.keepsakeId === undefined
      ? []
      : [keepsakeRecord(def, m.reward.keepsakeId, active.endsAt)],
  );

  const next: GameState = {
    ...state,
    board: { ...state.board, cells },
    pantry: { ...state.pantry, items: pantryItems },
    kitchen: { ...state.kitchen, ovens },
    orders: state.orders.filter((o) => o.seasonPoints === undefined),
    // Undo mustn't bring a seasonal item back.
    lastSale:
      state.lastSale && seasonalItem(state.lastSale.item.itemId)
        ? null
        : state.lastSale,
    // The Recipe Book's seasonal pages reset, so next year can pay their gems again.
    discovered: state.discovered.filter((id) => !seasonalItem(id)),
    pendingDiscoveries: state.pendingDiscoveries.filter(
      (id) => !seasonalItem(id),
    ),
    rewardedChains: state.rewardedChains.filter((id) => !ofSeason(id)),
    staff: state.staff.map((s) => {
      const chain = s.assignedChain !== null && ofSeason(s.assignedChain);
      const recipeId = s.assignedRecipe ?? null;
      const recipe =
        recipeId !== null && data.recipes.get(recipeId)?.seasonId === def.id;
      if (!chain && !recipe) return s;
      return {
        ...s,
        ...(chain ? { assignedChain: null } : {}),
        ...(recipe ? { assignedRecipe: null } : {}),
      };
    }),
    coins:
      state.coins + coins + unclaimed.reduce((n, m) => n + m.reward.coins, 0),
    gems: state.gems + unclaimed.reduce((n, m) => n + m.reward.gems, 0),
    keepsakes: [...state.keepsakes, ...keepsakes],
    season: null,
    seasonResult: { seasonId: def.id, points: active.points, coins },
  };
  return {
    state: next,
    events: [
      ...keepsakes.map((k) => ({
        type: 'keepsakeEarned' as const,
        seasonId: def.id,
        keepsakeId: k.id,
      })),
      { type: 'seasonEnded', seasonId: def.id, points: active.points },
    ],
  };
}

/**
 * Opts in to a loaded season while its window is open and the tutorial is
 * done, then starts it at once if it can. One season at a time.
 */
export function joinSeason(
  data: GameData,
  state: GameState,
  seasonId: SeasonId,
  rng: Rng,
  now: Timestamp,
): ActionResult {
  const loaded = data.seasons.get(seasonId);
  if (
    !loaded ||
    now < loaded.startsAt ||
    now >= loaded.endsAt ||
    state.tutorialStep !== 'done'
  ) {
    return { ok: false, reason: 'seasonNotOpen' };
  }
  if (state.season) return { ok: false, reason: 'alreadyCompleted' };

  const joined: GameState = {
    ...state,
    season: {
      seasonId,
      joinedAt: now,
      startedAt: null,
      endsAt: loaded.endsAt,
      points: 0,
      claimedMilestones: [],
      custom: null,
    },
  };
  const started = startSeason(data, joined, loaded.def, now);
  const topped = topUpOrders(data, started.state, loaded.def, rng);
  return {
    ok: true,
    state: topped.state,
    events: [
      { type: 'seasonJoined', seasonId },
      ...started.events,
      ...topped.events,
    ],
  };
}

/**
 * The tick half of seasons. Ends the joined season once its window has closed,
 * otherwise starts it when it can and keeps its orders topped up. A save whose
 * season is no longer loaded drops it quietly. Same state when nothing changed.
 */
export function tickSeason(
  data: GameData,
  state: GameState,
  rng: Rng,
  now: Timestamp,
): ActionResult {
  const active = state.season;
  if (!active) return { ok: true, state, events: [] };

  const loaded = data.seasons.get(active.seasonId);
  if (!loaded) {
    return {
      ok: true,
      state: {
        ...state,
        season: null,
        orders: state.orders.filter((o) => o.seasonPoints === undefined),
      },
      events: [],
    };
  }
  if (now >= active.endsAt) {
    return { ok: true, ...endSeason(data, state, active, loaded.def) };
  }

  const started = startSeason(data, state, loaded.def, now);
  const topped = topUpOrders(data, started.state, loaded.def, rng);
  return {
    ok: true,
    state: topped.state,
    events: [...started.events, ...topped.events],
  };
}

/** Pays a reached milestone of the joined season, once, with its keepsake if any. */
export function claimSeasonMilestone(
  data: GameData,
  state: GameState,
  index: number,
): ActionResult {
  const active = state.season;
  if (!active) return { ok: false, reason: 'noActiveSeason' };

  const loaded = data.seasons.get(active.seasonId);
  if (!loaded) {
    throw new Error(
      `claimSeasonMilestone: unknown season "${active.seasonId}"`,
    );
  }
  const milestone = loaded.def.milestones[index];
  if (!milestone) {
    throw new Error(`claimSeasonMilestone: no milestone ${index.toString()}`);
  }
  if (active.claimedMilestones.includes(index)) {
    return { ok: false, reason: 'alreadyCompleted' };
  }
  if (active.points < milestone.points) {
    return { ok: false, reason: 'milestoneNotReached' };
  }

  const { keepsakeId } = milestone.reward;
  const keepsake =
    keepsakeId === undefined
      ? null
      : keepsakeRecord(loaded.def, keepsakeId, active.endsAt);
  const events: GameEvent[] = [
    {
      type: 'seasonMilestoneClaimed',
      seasonId: active.seasonId,
      index,
      reward: milestone.reward,
    },
  ];
  if (keepsake) {
    events.push({
      type: 'keepsakeEarned',
      seasonId: active.seasonId,
      keepsakeId: keepsake.id,
    });
  }
  return {
    ok: true,
    state: {
      ...state,
      coins: state.coins + milestone.reward.coins,
      gems: state.gems + milestone.reward.gems,
      keepsakes: keepsake ? [...state.keepsakes, keepsake] : state.keepsakes,
      season: {
        ...active,
        claimedMilestones: [...active.claimedMilestones, index],
      },
    },
    events,
  };
}

/** Clears the result card. Nothing to dismiss changes nothing. */
export function dismissSeasonResult(state: GameState): ActionResult {
  if (!state.seasonResult) return { ok: true, state, events: [] };
  return { ok: true, state: { ...state, seasonResult: null }, events: [] };
}

/** What sweepOrphanSeason removed. */
export interface SeasonSweep {
  readonly seasonId: SeasonId;
  /** `orphanItemCoins` for each item and bake removed. */
  readonly coins: number;
  /** True when the season's pack isn't loaded and the season was ended. */
  readonly ended: boolean;
}

/**
 * Removes the joined season's content that `data` can't load, so the save
 * still loads (T14.6). Only ids starting with `<seasonId>-` are touched.
 * Without the season's pack, all of them go and the season ends, with no
 * result and no milestones paid. With the pack, only ids it doesn't know go
 * (a pack update dropped them) and the season keeps running. Each item and
 * bake removed pays `economy.seasons.orphanItemCoins`, generators included.
 * `sweep` is null, and `state` the same object, when nothing was removed.
 */
export function sweepOrphanSeason(
  data: GameData,
  state: GameState,
): { state: GameState; sweep: SeasonSweep | null } {
  const active = state.season;
  if (!active) return { state, sweep: null };
  const prefix = `${active.seasonId}-`;
  const ended = !data.seasons.has(active.seasonId);

  let removed = false;
  let items = 0;
  const gone =
    (known: ReadonlyMap<string, unknown>) =>
    (id: string): boolean => {
      const out = id.startsWith(prefix) && (ended || !known.has(id));
      if (out) removed = true;
      return out;
    };
  const itemGone = gone(data.items);
  const recipeGone = gone(data.recipes);
  const chainGone = gone(data.chains);
  const sell = (itemId: ItemId): boolean => {
    const out = itemGone(itemId);
    if (out) items += 1;
    return out;
  };

  const cells = state.board.cells.map((cell) =>
    cell.kind === 'item' && sell(cell.item.itemId)
      ? { kind: 'empty' as const }
      : cell,
  );
  const pantryItems = state.pantry.items.filter((item) => !sell(item.itemId));
  const ovens = state.kitchen.ovens.map((oven) => ({
    ...oven,
    slots: oven.slots.map((bake) => {
      if (!bake || !recipeGone(bake.recipeId)) return bake;
      items += 1;
      return null;
    }),
  }));
  const orders = state.orders.filter((order) => {
    const wantsGone = order.wants.some(itemGone);
    if (ended && order.seasonPoints !== undefined) removed = true;
    return !wantsGone && !(ended && order.seasonPoints !== undefined);
  });
  const lastSale =
    state.lastSale && itemGone(state.lastSale.item.itemId)
      ? null
      : state.lastSale;
  const discovered = state.discovered.filter((id) => !itemGone(id));
  const pendingDiscoveries = state.pendingDiscoveries.filter(
    (id) => !itemGone(id),
  );
  const rewardedChains = state.rewardedChains.filter((id) => !chainGone(id));
  const staff = state.staff.map((s) => {
    const chain = s.assignedChain !== null && chainGone(s.assignedChain);
    const recipeId = s.assignedRecipe ?? null;
    const recipe = recipeId !== null && recipeGone(recipeId);
    if (!chain && !recipe) return s;
    return {
      ...s,
      ...(chain ? { assignedChain: null } : {}),
      ...(recipe ? { assignedRecipe: null } : {}),
    };
  });

  if (!ended && !removed) return { state, sweep: null };
  const coins = items * data.economy.seasons.orphanItemCoins;
  return {
    state: {
      ...state,
      board: { ...state.board, cells },
      pantry: { ...state.pantry, items: pantryItems },
      kitchen: { ...state.kitchen, ovens },
      orders,
      lastSale,
      discovered,
      pendingDiscoveries,
      rewardedChains,
      staff,
      coins: state.coins + coins,
      season: ended ? null : active,
    },
    sweep: { seasonId: active.seasonId, coins, ended },
  };
}
