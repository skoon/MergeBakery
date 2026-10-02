/**
 * The Shop (T7.8): spending coins on extra generators and energy.
 */

import { addEnergy } from './energy';
import { placeGenerator } from './placement';
import type {
  ActionResult,
  GameData,
  GameEvent,
  GameState,
  ShopItem,
  ShopItemId,
  Timestamp,
} from './types';

/** Rows the player can see: those from chapters they've reached, in data order. */
export function shopItemsFor(data: GameData, state: GameState): ShopItem[] {
  const chapters = Array.from(data.chapters.keys());
  const reached = chapters.indexOf(state.chapterId);
  return Array.from(data.shop.values()).filter(
    (row) => chapters.indexOf(row.fromChapter) <= reached,
  );
}

/**
 * Throws for an unknown row. Rejects, in order: 'prerequisitesMissing' for a
 * row from a chapter not yet reached, 'notEnoughCoins', and 'boardFull' when a
 * generator has nowhere to go (board and Pantry full). Otherwise spends the
 * coins and delivers: a generator placed like a renovation unlock, or energy
 * added (it may go above the cap, like an energy jar).
 * Events: the placement's `spawned`/`discovered`, then `purchased`.
 */
export function buyShopItem(
  data: GameData,
  state: GameState,
  shopItemId: ShopItemId,
  now: Timestamp,
): ActionResult {
  const row = data.shop.get(shopItemId);
  if (!row) {
    throw new Error(`buyShopItem: unknown shop item "${shopItemId}"`);
  }
  if (!shopItemsFor(data, state).includes(row)) {
    return { ok: false, reason: 'prerequisitesMissing' };
  }
  if (state.coins < row.price) {
    return { ok: false, reason: 'notEnoughCoins' };
  }

  let next: GameState = { ...state, coins: state.coins - row.price };
  const events: GameEvent[] = [];

  if (row.kind === 'generator') {
    if (row.itemId === undefined) {
      throw new Error(`buyShopItem: "${shopItemId}" has no itemId`);
    }
    const placed = placeGenerator(data, next, row.itemId);
    if (!placed) {
      return { ok: false, reason: 'boardFull' };
    }
    next = placed.state;
    events.push(...placed.events);
  } else {
    next = {
      ...next,
      energy: addEnergy(data, next.energy, row.energy ?? 0, now),
    };
  }

  events.push({ type: 'purchased', shopItemId, coins: row.price });
  return { ok: true, state: next, events };
}
