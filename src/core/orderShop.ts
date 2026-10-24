/**
 * The Shop's "For your orders" rows (T13): buying an item an open order still
 * needs. A bought item is never discovered, so it can't fill a Recipe Book
 * page or pay its gems.
 */

import { nearestEmpty, setCell } from './board';
import { middleCell, roomForItems } from './placement';
import type {
  ActionResult,
  BoardItem,
  GameData,
  GameEvent,
  GameState,
  ItemId,
} from './types';

export interface OrderShopRow {
  readonly itemId: ItemId;
  /** How many more the open orders want than the player has. */
  readonly missing: number;
  readonly price: number;
}

/** max(minPrice, sellValue × priceMultiplier). Throws on an unknown id. */
export function orderShopPrice(data: GameData, itemId: ItemId): number {
  const item = data.items.get(itemId);
  if (!item) {
    throw new Error(`orderShopPrice: unknown item id "${itemId}"`);
  }
  const { priceMultiplier, minPrice } = data.economy.orderShop;
  return Math.max(minPrice, item.sellValue * priceMultiplier);
}

/**
 * Ingredients and baked goods the open orders want more of than the player
 * holds (on the board or in the Pantry, not cobwebbed), in the order the
 * orders first ask for them.
 */
export function orderShopItems(
  data: GameData,
  state: GameState,
): OrderShopRow[] {
  const wanted = new Map<ItemId, number>();
  for (const itemId of state.orders.flatMap((o) => o.wants)) {
    const kind = data.chains.get(data.items.get(itemId)?.chainId ?? '')?.kind;
    if (kind === 'ingredient' || kind === 'baked') {
      wanted.set(itemId, (wanted.get(itemId) ?? 0) + 1);
    }
  }

  const held = new Map<ItemId, number>();
  const boardItems = state.board.cells.flatMap((c) =>
    c.kind === 'item' ? [c.item] : [],
  );
  for (const item of [...boardItems, ...state.pantry.items]) {
    if (!item.cobwebbed) {
      held.set(item.itemId, (held.get(item.itemId) ?? 0) + 1);
    }
  }

  return [...wanted].flatMap(([itemId, count]) => {
    const missing = count - (held.get(itemId) ?? 0);
    return missing > 0
      ? [{ itemId, missing, price: orderShopPrice(data, itemId) }]
      : [];
  });
}

/**
 * Throws for an unknown item. Rejects, in order: 'prerequisitesMissing' when
 * no open order still needs it, 'notEnoughCoins', and 'boardFull' when the
 * board and Pantry are full. Otherwise spends the coins and places the item
 * on the empty cell nearest the middle, else in the Pantry, without
 * discovering it. Events: `spawned` when it lands on the board, then
 * `itemBought`.
 */
export function buyOrderItem(
  data: GameData,
  state: GameState,
  itemId: ItemId,
): ActionResult {
  const price = orderShopPrice(data, itemId);
  if (!orderShopItems(data, state).some((row) => row.itemId === itemId)) {
    return { ok: false, reason: 'prerequisitesMissing' };
  }
  if (state.coins < price) {
    return { ok: false, reason: 'notEnoughCoins' };
  }
  if (roomForItems(state) === 0) {
    return { ok: false, reason: 'boardFull' };
  }

  const item: BoardItem = { itemId, cobwebbed: false, generator: null };
  const paid: GameState = { ...state, coins: state.coins - price };
  const events: GameEvent[] = [];
  let next: GameState;

  const cell = nearestEmpty(state.board, middleCell(state));
  if (cell !== null) {
    next = {
      ...paid,
      board: setCell(state.board, cell, { kind: 'item', item }),
    };
    events.push({ type: 'spawned', itemId, cell, rare: false });
  } else {
    next = {
      ...paid,
      pantry: { ...state.pantry, items: [...state.pantry.items, item] },
    };
  }

  events.push({ type: 'itemBought', itemId, coins: price });
  return { ok: true, state: next, events };
}
