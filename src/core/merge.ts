/**
 * Merge logic: deciding when two items can merge and what they become (T2.2).
 */

import type { GameData, Item, ItemId } from './types';

/**
 * The item one tier up in the same chain, or null at the chain's top tier.
 * Throws on an unknown id.
 */
export function nextTier(data: GameData, itemId: ItemId): Item | null {
  const item = data.items.get(itemId);
  if (!item) {
    throw new Error(`nextTier: unknown item id "${itemId}"`);
  }

  const chainItems = data.chainItems.get(item.chainId);
  if (!chainItems) {
    throw new Error(`nextTier: unknown chain id "${item.chainId}"`);
  }

  const nextTierIndex = item.tier;
  if (nextTierIndex >= chainItems.length) {
    return null;
  }

  return chainItems[nextTierIndex] ?? null;
}

/**
 * True when a and b are the same item and it has a next tier.
 * The Golden Whisk is handled elsewhere (T3.3).
 */
export function canMerge(data: GameData, a: ItemId, b: ItemId): boolean {
  if (a !== b) {
    return false;
  }

  const mergedItem = nextTier(data, a);
  return mergedItem !== null;
}
