/**
 * What the Shop screen shows (T7.8). Pure, no DOM.
 */

import { orderShopItems } from '../core/orderShop';
import { shopItemsFor } from '../core/shop';
import type { GameData, GameState, ItemId, ShopItemId } from '../core/types';
import { pantryModel } from './pantryModel';

export interface ShopRow {
  id: ShopItemId;
  name: string;
  spriteKey: string;
  /** One line under the name: what you get. */
  detail: string;
  price: number;
  affordable: boolean;
}

/** A "For your orders" row (T13): an item open orders want more of than the player has. */
export interface OrderShopRow {
  itemId: ItemId;
  name: string;
  spriteKey: string;
  /** Who wants it, and how many when more than one. */
  detail: string;
  price: number;
  affordable: boolean;
}

export interface ShopModel {
  coins: number;
  forOrders: OrderShopRow[];
  /** Rows from chapters the player has reached, in data order. */
  rows: ShopRow[];
  /** The next Pantry slot, or null once the Pantry is as big as it gets. */
  pantrySlot: { price: number; affordable: boolean; capacity: number } | null;
}

export function shopModel(data: GameData, state: GameState): ShopModel {
  const rows = shopItemsFor(data, state).map((row): ShopRow => {
    let spriteKey = 'energy-jar';
    let detail = `+${(row.energy ?? 0).toString()} energy`;
    if (row.kind === 'generator' && row.itemId !== undefined) {
      spriteKey = data.items.get(row.itemId)?.spriteKey ?? row.itemId;
      const charges = data.generators.get(row.itemId)?.charges ?? 0;
      detail = `A new one, ready with ${charges.toString()} taps`;
    }
    return {
      id: row.id,
      name: row.name,
      spriteKey,
      detail,
      price: row.price,
      affordable: state.coins >= row.price,
    };
  });

  const names = new Intl.ListFormat('en');
  const forOrders = orderShopItems(data, state).map((row): OrderShopRow => {
    const item = data.items.get(row.itemId);
    const who = state.orders
      .filter((o) => o.wants.includes(row.itemId))
      .map((o) => data.customers.get(o.customerId)?.name ?? '');
    return {
      itemId: row.itemId,
      name: item?.name ?? row.itemId,
      spriteKey: item?.spriteKey ?? row.itemId,
      detail: `For ${names.format([...new Set(who)])}${row.missing > 1 ? `, ${row.missing.toString()} needed` : ''}`,
      price: row.price,
      affordable: state.coins >= row.price,
    };
  });

  const pantry = pantryModel(data, state);
  return {
    coins: state.coins,
    forOrders,
    rows,
    pantrySlot:
      pantry.nextSlotCost === null
        ? null
        : {
            price: pantry.nextSlotCost,
            affordable: pantry.canAffordSlot,
            capacity: state.pantry.capacity,
          },
  };
}
