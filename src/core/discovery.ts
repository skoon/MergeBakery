/**
 * Item discovery: recording newly made items in the Recipe Book (T2.2).
 */

import type { GameData, GameEvent, GameState, ItemId } from './types';

/**
 * Records that an item was made. If it is new, appends it to `discovered` and
 * `pendingDiscoveries` and returns a `discovered` event. Otherwise returns the
 * same state object and no events. Throws on an unknown id.
 */
export function discover(
  data: GameData,
  state: GameState,
  itemId: ItemId,
): { state: GameState; events: GameEvent[] } {
  // Verify the item exists.
  if (!data.items.has(itemId)) {
    throw new Error(`discover: unknown item id "${itemId}"`);
  }

  // If already discovered, return the same state object with no events.
  if (state.discovered.includes(itemId)) {
    return { state, events: [] };
  }

  // New item: add to discovered and pendingDiscoveries.
  const newState: GameState = {
    ...state,
    discovered: [...state.discovered, itemId],
    pendingDiscoveries: [...state.pendingDiscoveries, itemId],
  };

  const events: GameEvent[] = [{ type: 'discovered', itemId }];

  return { state: newState, events };
}
