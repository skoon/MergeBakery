/**
 * Pure view model for the Pantry drawer (T3.11).
 *
 * No DOM here; `pantryDrawer.ts` renders this.
 */

import type { GameData, GameState, ItemId } from '../core/types';

export interface PantryModel {
  slots: ({ itemId: ItemId; name: string; spriteKey: string } | null)[]; // length = capacity
  used: number;
  capacity: number;
  /** Cost of the next slot; null when every slot is bought. */
  nextSlotCost: number | null;
  canAffordSlot: boolean;
}

export function pantryModel(data: GameData, state: GameState): PantryModel {
  const { capacity, items } = state.pantry;

  const slots: PantryModel['slots'] = [];
  for (let i = 0; i < capacity; i++) {
    const boardItem = items[i];
    if (!boardItem) {
      slots.push(null);
      continue;
    }

    const itemDef = data.items.get(boardItem.itemId);
    if (!itemDef) {
      throw new Error(`pantryModel: unknown item id "${boardItem.itemId}"`);
    }

    slots.push({
      itemId: itemDef.id,
      name: itemDef.name,
      spriteKey: itemDef.spriteKey,
    });
  }

  const slotsBought = capacity - data.economy.pantry.startSlots;
  const slotCosts = data.economy.pantry.slotCosts;
  const nextSlotCost =
    slotsBought < slotCosts.length ? (slotCosts[slotsBought] ?? null) : null;

  return {
    slots,
    used: items.length,
    capacity,
    nextSlotCost,
    canAffordSlot: nextSlotCost !== null && state.coins >= nextSlotCost,
  };
}
