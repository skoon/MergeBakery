/**
 * Order delivery (T3.7).
 */

import type {
  ActionResult,
  CellIndex,
  GameData,
  GameEvent,
  GameState,
  ItemId,
  OrderId,
  Rng,
  Timestamp,
} from './types';
import { setCell } from './board';
import { addXp } from './level';
import { nextTier } from './merge';
import { pickUniform } from './orders';

/**
 * For each wanted item, in order, a distinct board cell holding that item that isn't
 * cobwebbed, lowest index first; null where none is left.
 */
export function matchOrderItems(
  state: GameState,
  wants: readonly ItemId[],
): (CellIndex | null)[] {
  const matches: (CellIndex | null)[] = [];
  const usedCells = new Set<CellIndex>();

  for (const itemId of wants) {
    let found: CellIndex | null = null;

    // Find the lowest index cell with this item that isn't cobwebbed and hasn't been used
    for (let i = 0; i < state.board.cells.length; i++) {
      if (usedCells.has(i)) {
        continue;
      }

      const cell = state.board.cells[i];
      if (
        cell &&
        cell.kind === 'item' &&
        cell.item.itemId === itemId &&
        !cell.item.cobwebbed
      ) {
        found = i;
        break;
      }
    }

    matches.push(found);
    if (found !== null) {
      usedCells.add(found);
    }
  }

  return matches;
}

/**
 * Upgrades one generator on the board that has a next tier, picked at random,
 * to that tier with full charges. Null when there is none.
 */
function upgradeGenerator(
  data: GameData,
  state: GameState,
  rng: Rng,
): { state: GameState; event: GameEvent } | null {
  const upgradable: { cell: CellIndex; itemId: ItemId }[] = [];
  state.board.cells.forEach((cell, i) => {
    if (cell.kind !== 'item' || !cell.item.generator) return;
    const next = nextTier(data, cell.item.itemId);
    if (next && data.generators.has(next.id)) {
      upgradable.push({ cell: i, itemId: next.id });
    }
  });
  if (upgradable.length === 0) return null;
  const pick = pickUniform(upgradable, rng);
  const def = data.generators.get(pick.itemId);
  if (!def) return null;
  return {
    state: {
      ...state,
      board: setCell(state.board, pick.cell, {
        kind: 'item',
        item: {
          itemId: pick.itemId,
          cobwebbed: false,
          generator: { charges: def.charges, cooldownEndsAt: null },
        },
      }),
    },
    event: { type: 'generatorUpgraded', cell: pick.cell, itemId: pick.itemId },
  };
}

/**
 * Throws for an unknown orderId. Rejects 'missingItems' if any match is null. Otherwise
 * empties the matched cells, adds the reward's coins and stars, removes the order, sets
 * nextOrderAt to its current value or, if null, now + refillDelaySec × 1000, and adds the
 * reward's XP with addXp. Events: orderDelivered { orderId, reward }, then any levelUp events.
 * A catering order (T9.2) may also upgrade one board generator a tier, when `rng` is given.
 */
export function deliverOrder(
  data: GameData,
  state: GameState,
  orderId: OrderId,
  now: Timestamp,
  rng?: Rng,
): ActionResult {
  // Find the order
  const orderIndex = state.orders.findIndex((o) => o.id === orderId);
  if (orderIndex === -1) {
    throw new Error(`deliverOrder: unknown orderId ${orderId}`);
  }

  const order = state.orders[orderIndex]!;

  // Match items
  const matches = matchOrderItems(state, order.wants);

  // Check for missing items
  if (matches.some((m) => m === null)) {
    return { ok: false, reason: 'missingItems' };
  }

  // All matches are non-null, so we can proceed
  const matchedCells = matches as CellIndex[];

  // Empty the matched cells
  let newBoard = state.board;
  for (const cellIndex of matchedCells) {
    newBoard = setCell(newBoard, cellIndex, { kind: 'empty' });
  }

  // Remove the order
  const newOrders = state.orders.filter((_, i) => i !== orderIndex);

  // Calculate new nextOrderAt
  const newNextOrderAt =
    state.nextOrderAt !== null
      ? state.nextOrderAt
      : now + data.economy.orders.refillDelaySec * 1000;

  // Create new state with updated coins, stars, board, orders, and nextOrderAt
  let newState: GameState = {
    ...state,
    board: newBoard,
    coins: state.coins + order.reward.coins,
    stars: state.stars + order.reward.stars,
    orders: newOrders,
    nextOrderAt: newNextOrderAt,
    event:
      order.eventPoints !== undefined && state.event
        ? { ...state.event, points: state.event.points + order.eventPoints }
        : state.event,
  };

  // Add XP and get level-up events
  const { state: stateWithXp, events: xpEvents } = addXp(
    data,
    newState,
    order.reward.xp,
    now,
  );
  newState = stateWithXp;

  // Build events: orderDelivered first, then any levelUp events
  const events: GameEvent[] = [
    {
      type: 'orderDelivered',
      orderId,
      reward: order.reward,
    },
    ...xpEvents,
  ];

  if (
    order.catering &&
    rng &&
    rng.next() * 100 < order.catering.upgradeChancePercent
  ) {
    const upgraded = upgradeGenerator(data, newState, rng);
    if (upgraded) {
      newState = upgraded.state;
      events.push(upgraded.event);
    }
  }

  return {
    ok: true,
    state: newState,
    events,
  };
}
