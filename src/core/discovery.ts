/**
 * Item discovery: recording newly made items in the Recipe Book (T2.2), and
 * paying a chain's gems once its page is complete (T5.6).
 */

import type {
  ActionResult,
  GameData,
  GameEvent,
  GameState,
  ItemId,
} from './types';

/**
 * Records that an item was made. If it is new, appends it to `discovered` and
 * `pendingDiscoveries` and returns a `discovered` event. Otherwise returns the
 * same state object and no events. Throws on an unknown id.
 *
 * When the new item completes its chain — every item of the chain is now
 * discovered — and the chain has completionGems above 0 and hasn't paid yet,
 * adds the gems, records the chain in `rewardedChains`, and returns a
 * `chainCompleted` event after the `discovered` one. Chains worth 0 gems
 * (generators, bonus items, the Golden Whisk) never pay and are never recorded.
 */
export function discover(
  data: GameData,
  state: GameState,
  itemId: ItemId,
): { state: GameState; events: GameEvent[] } {
  const item = data.items.get(itemId);
  if (!item) {
    throw new Error(`discover: unknown item id "${itemId}"`);
  }

  // Event items and generators are temporary and have no Recipe Book page, so
  // they never get a discovery card.
  const chainKind = data.chains.get(item.chainId)?.kind;
  const isEventGenerator = [...data.events.values()].some(
    (e) => e.generatorItemId === itemId,
  );
  if (chainKind === 'event' || isEventGenerator) {
    return { state, events: [] };
  }

  // If already discovered, return the same state object with no events.
  if (state.discovered.includes(itemId)) {
    return { state, events: [] };
  }

  // New item: add to discovered and pendingDiscoveries.
  let newState: GameState = {
    ...state,
    discovered: [...state.discovered, itemId],
    pendingDiscoveries: [...state.pendingDiscoveries, itemId],
  };
  const events: GameEvent[] = [{ type: 'discovered', itemId }];

  const chain = data.chains.get(item.chainId);
  const chainItems = data.chainItems.get(item.chainId) ?? [];
  const complete = chainItems.every((i) => newState.discovered.includes(i.id));
  if (
    chain &&
    complete &&
    chain.completionGems > 0 &&
    !newState.rewardedChains.includes(chain.id)
  ) {
    newState = {
      ...newState,
      gems: newState.gems + chain.completionGems,
      rewardedChains: [...newState.rewardedChains, chain.id],
    };
    events.push({
      type: 'chainCompleted',
      chainId: chain.id,
      gems: chain.completionGems,
    });
  }

  return { state: newState, events };
}

/**
 * Removes itemId from pendingDiscoveries (T5.7). When it isn't pending — a
 * double tap on the card, say — returns ok with the same state object and no
 * events, so the store notifies no one. Throws on an unknown item id.
 */
export function dismissDiscovery(
  data: GameData,
  state: GameState,
  itemId: ItemId,
): ActionResult {
  if (!data.items.has(itemId)) {
    throw new Error(`dismissDiscovery: unknown item id "${itemId}"`);
  }
  if (!state.pendingDiscoveries.includes(itemId)) {
    return { ok: true, state, events: [] };
  }
  return {
    ok: true,
    state: {
      ...state,
      pendingDiscoveries: state.pendingDiscoveries.filter(
        (id) => id !== itemId,
      ),
    },
    events: [],
  };
}
