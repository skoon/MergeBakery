/**
 * What the Shop screen shows (T7.8). Pure, no DOM.
 */

import { shopItemsFor } from '../core/shop';
import type { GameData, GameState, ShopItemId } from '../core/types';
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

export interface ShopModel {
  coins: number;
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

  const pantry = pantryModel(data, state);
  return {
    coins: state.coins,
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
