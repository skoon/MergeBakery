/**
 * Order generation and refilling for Rise & Shine Bakery (T3.6).
 *
 * Customer orders are created deterministically from a seeded Rng, favoring
 * items the next renovation task features and items the customer likes, and
 * are refilled up to `economy.orders.maxOpen` once the refill delay elapses.
 */

import { weightedPick } from './rng';
import type {
  ActionResult,
  ChainId,
  Customer,
  CustomerId,
  CustomerKind,
  GameData,
  GameEvent,
  GameState,
  Item,
  ItemId,
  Order,
  OrderKindRules,
  RenovationTask,
  Rng,
  Timestamp,
  WeightedEntry,
} from './types';

function orderKindRules(data: GameData, kind: CustomerKind): OrderKindRules {
  return kind === 'regular'
    ? data.economy.orders.regular
    : data.economy.orders.walkIn;
}

/** Picks one element uniformly. Calls rng.next() exactly once. Throws on an empty array. */
export function pickUniform<T>(items: readonly T[], rng: Rng): T {
  const index = Math.min(
    items.length - 1,
    Math.floor(rng.next() * items.length),
  );
  const value = items[index];
  if (value === undefined) {
    throw new Error('pickUniform: cannot pick from an empty array');
  }
  return value;
}

/** Items an order of this kind may ask for: discovered, in an ingredient or baked chain, tier <= the kind's maxTier. */
export function orderCandidates(
  data: GameData,
  state: GameState,
  kind: CustomerKind,
): Item[] {
  const rules = orderKindRules(data, kind);
  const discovered = new Set(state.discovered);
  const result: Item[] = [];

  for (const item of data.items.values()) {
    if (!discovered.has(item.id)) {
      continue;
    }
    const chain = data.chains.get(item.chainId);
    if (chain === undefined) {
      throw new Error(
        `orderCandidates: item "${item.id}" has unknown chain "${item.chainId}"`,
      );
    }
    if (chain.kind !== 'ingredient' && chain.kind !== 'baked') {
      continue;
    }
    if (item.tier > rules.maxTier) {
      continue;
    }
    result.push(item);
  }

  return result;
}

/**
 * Chains the player can produce right now: those with an item in the spawn
 * table of a generator they own, on the board (not cobwebbed) or in the Pantry.
 */
export function producibleChains(
  data: GameData,
  state: GameState,
): Set<ChainId> {
  const generatorItemIds = new Set<ItemId>();
  for (const cell of state.board.cells) {
    if (
      cell.kind === 'item' &&
      cell.item.generator !== null &&
      !cell.item.cobwebbed
    ) {
      generatorItemIds.add(cell.item.itemId);
    }
  }
  for (const pantryItem of state.pantry.items) {
    if (pantryItem.generator !== null) {
      generatorItemIds.add(pantryItem.itemId);
    }
  }

  const chains = new Set<ChainId>();
  for (const generatorItemId of generatorItemIds) {
    const generatorDef = data.generators.get(generatorItemId);
    if (generatorDef === undefined) {
      continue;
    }
    for (const entry of generatorDef.spawnTable) {
      const spawnItem = data.items.get(entry.itemId);
      if (spawnItem !== undefined) {
        chains.add(spawnItem.chainId);
      }
    }
  }
  return chains;
}

/**
 * True when the item is discovered, in an ingredient chain, and some generator that is on the
 * board (not cobwebbed) or in the Pantry has a spawn table containing an item of that chain.
 */
export function isProducible(
  data: GameData,
  state: GameState,
  itemId: ItemId,
): boolean {
  const item = data.items.get(itemId);
  if (item === undefined) {
    throw new Error(`isProducible: unknown item id "${itemId}"`);
  }

  if (!state.discovered.includes(itemId)) {
    return false;
  }

  const chain = data.chains.get(item.chainId);
  if (chain === undefined || chain.kind !== 'ingredient') {
    return false;
  }

  return producibleChains(data, state).has(item.chainId);
}

/** The first task in the current chapter, in order, that isn't complete and whose prerequisites are. Null when none. */
export function nextTask(
  data: GameData,
  state: GameState,
): RenovationTask | null {
  const chapter = data.chapters.get(state.chapterId);
  if (chapter === undefined) {
    throw new Error(`nextTask: unknown chapter id "${state.chapterId}"`);
  }

  for (const task of chapter.tasks) {
    if (state.completedTasks.includes(task.id)) {
      continue;
    }
    const prerequisitesMet = task.prerequisites.every((p) =>
      state.completedTasks.includes(p),
    );
    if (prerequisitesMet) {
      return task;
    }
  }

  return null;
}

/** All customers of `kind` with no currently open order; every customer of that kind if that would be empty. */
export function eligibleCustomers(
  pool: readonly Customer[],
  state: GameState,
): readonly Customer[] {
  const openCustomerIds = new Set<CustomerId>(
    state.orders.map((o) => o.customerId),
  );
  const withoutOpenOrder = pool.filter((c) => !openCustomerIds.has(c.id));
  return withoutOpenOrder.length > 0 ? withoutOpenOrder : pool;
}

/**
 * A new order with id state.nextOrderId. Doesn't change state; the caller adds it.
 */
export function generateOrder(
  data: GameData,
  state: GameState,
  rng: Rng,
): Order {
  const allCustomers = Array.from(data.customers.values());
  const regularPool = allCustomers.filter(
    (c) => c.kind === 'regular' && state.unlockedCustomers.includes(c.id),
  );
  const walkInPool = allCustomers.filter((c) => c.kind === 'walkIn');

  const eligibleRegulars = eligibleCustomers(regularPool, state);
  const eligibleWalkIns = eligibleCustomers(walkInPool, state);

  let customer: Customer;
  if (
    eligibleRegulars.length > 0 &&
    rng.next() * 100 < data.economy.orders.regularChancePercent
  ) {
    customer = pickUniform(eligibleRegulars, rng);
  } else {
    if (eligibleWalkIns.length === 0) {
      throw new Error('generateOrder: no walk-in customers available');
    }
    customer = pickUniform(eligibleWalkIns, rng);
  }

  const rules = orderKindRules(data, customer.kind);
  const itemCount =
    rules.minItems +
    Math.floor(rng.next() * (rules.maxItems - rules.minItems + 1));

  let candidates = orderCandidates(data, state, customer.kind);
  const anyOpenOrderFullyProducible = state.orders.some((order) =>
    order.wants.every((id) => isProducible(data, state, id)),
  );
  if (!anyOpenOrderFullyProducible) {
    candidates = candidates.filter((item) =>
      isProducible(data, state, item.id),
    );
  }
  if (candidates.length === 0) {
    throw new Error('generateOrder: no candidates remain');
  }

  const featuredItems = nextTask(data, state)?.featuredItems ?? [];
  const featuredWeight = data.economy.orders.featuredWeight;
  const table: WeightedEntry[] = candidates.map((item) => {
    let weight = 1 / item.tier ** (data.economy.orders.lowTierBias ?? 0);
    if (featuredItems.includes(item.id)) {
      weight *= featuredWeight;
    }
    if (customer.favoriteItems.includes(item.id)) {
      weight *= featuredWeight;
    }
    return { itemId: item.id, weight };
  });

  const wants: ItemId[] = [];
  for (let i = 0; i < itemCount; i++) {
    wants.push(weightedPick(table, rng));
  }

  const wantedItems = wants.map((id) => {
    const item = data.items.get(id);
    if (item === undefined) {
      throw new Error(`generateOrder: unknown item id "${id}"`);
    }
    return item;
  });
  const sellSum = wantedItems.reduce((sum, item) => sum + item.sellValue, 0);
  const tierSum = wantedItems.reduce((sum, item) => sum + item.tier, 0);

  const stars = rules.starsByItemCount[itemCount - 1];
  if (stars === undefined) {
    throw new Error(
      `generateOrder: starsByItemCount has no entry for item count ${itemCount}`,
    );
  }

  return {
    id: state.nextOrderId,
    customerId: customer.id,
    wants,
    reward: {
      coins: Math.round(sellSum * rules.coinMultiplier),
      stars,
      xp: tierSum * rules.xpPerTier,
    },
  };
}

/**
 * A catering order, or null when none is due: catering is on, the player has
 * reached its chapter, none is open, the roll succeeds, and a baked item of the
 * right tier has been discovered. One high-tier item, a day to fill it, a
 * generous payout. The roll is the first rng call, so a regular order that
 * follows is unaffected when catering is off.
 */
export function generateCateringOrder(
  data: GameData,
  state: GameState,
  rng: Rng,
  now: Timestamp,
): Order | null {
  const rules = data.economy.orders.catering;
  if (!rules) return null;
  const chapterIds = [...data.chapters.keys()];
  if (
    chapterIds.indexOf(state.chapterId) < chapterIds.indexOf(rules.minChapter)
  ) {
    return null;
  }
  if (state.orders.some((o) => o.catering !== undefined)) return null;
  if (rng.next() * 100 >= rules.chancePercent) return null;

  const discovered = new Set(state.discovered);
  const candidates = [...data.items.values()].filter(
    (i) =>
      discovered.has(i.id) &&
      data.chains.get(i.chainId)?.kind === 'baked' &&
      i.tier >= rules.minTier &&
      i.tier <= rules.maxTier,
  );
  if (candidates.length === 0) return null;
  const item = pickUniform(candidates, rng);

  const customers = [...data.customers.values()].filter(
    (c) => c.kind === 'walkIn' || state.unlockedCustomers.includes(c.id),
  );
  const customer = pickUniform(eligibleCustomers(customers, state), rng);

  return {
    id: state.nextOrderId,
    customerId: customer.id,
    wants: [item.id],
    reward: {
      coins: Math.round(item.sellValue * rules.coinMultiplier),
      stars: rules.stars,
      xp: rules.xp,
    },
    catering: {
      expiresAt: now + rules.windowSec * 1000,
      upgradeChancePercent: rules.upgradeChancePercent,
    },
  };
}

/** Removes catering orders whose time is up. A refill follows; there is no penalty. */
function expireCatering(state: GameState, now: Timestamp): ActionResult {
  const expired = state.orders.filter(
    (o) => o.catering !== undefined && now >= o.catering.expiresAt,
  );
  if (expired.length === 0) return { ok: true, state, events: [] };
  return {
    ok: true,
    state: {
      ...state,
      orders: state.orders.filter((o) => !expired.includes(o)),
      nextOrderAt: state.nextOrderAt ?? now,
    },
    events: expired.map((o) => ({
      type: 'cateringExpired' as const,
      orderId: o.id,
    })),
  };
}

/** The tick handler. See "Refilling" below. */
export function refillOrders(
  data: GameData,
  state: GameState,
  rng: Rng,
  now: Timestamp,
): ActionResult {
  const expired = expireCatering(state, now);
  if (!expired.ok) return expired;
  state = expired.state;

  if (state.nextOrderAt === null || now < state.nextOrderAt) {
    return { ok: true, state, events: [...expired.events] };
  }

  let currentState = state;
  const events: GameEvent[] = [...expired.events];

  // Event orders (T8.4) are extra: they don't take a regular order's slot.
  const regularOpen = (s: GameState): number =>
    s.orders.filter((o) => o.eventPoints === undefined).length;
  while (regularOpen(currentState) < data.economy.orders.maxOpen) {
    const order =
      generateCateringOrder(data, currentState, rng, now) ??
      generateOrder(data, currentState, rng);
    currentState = {
      ...currentState,
      orders: [...currentState.orders, order],
      nextOrderId: currentState.nextOrderId + 1,
    };
    events.push({ type: 'orderArrived', orderId: order.id });
  }

  currentState = { ...currentState, nextOrderAt: null };

  return { ok: true, state: currentState, events };
}
