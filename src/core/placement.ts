/**
 * Placing a new generator: a renovation unlock (T5.2) and a Shop purchase
 * (T7.8) both use this, so they always land the same way.
 */

import { nearestEmpty, setCell, toIndex } from './board';
import { discover } from './discovery';
import type {
  BoardItem,
  GameData,
  GameEvent,
  GameState,
  ItemId,
} from './types';

/** The cell new generators and collected bakes aim for. */
export function middleCell(state: GameState): number {
  return toIndex(
    state.board,
    Math.floor(state.board.cols / 2),
    Math.floor(state.board.rows / 2),
  );
}

/** Empty board cells plus free Pantry slots. */
export function roomForItems(state: GameState): number {
  return (
    state.board.cells.filter((c) => c.kind === 'empty').length +
    (state.pantry.capacity - state.pantry.items.length)
  );
}

/**
 * Places a fully charged generator on the empty cell nearest the middle, else
 * in the Pantry, and records its discovery. Events: `spawned` when it lands on
 * the board, then any `discovered`. Null when there's no room anywhere, so the
 * caller can reject before changing anything. Throws for an item with no
 * generator definition.
 */
export function placeGenerator(
  data: GameData,
  state: GameState,
  itemId: ItemId,
): { state: GameState; events: GameEvent[] } | null {
  const def = data.generators.get(itemId);
  if (!def) {
    throw new Error(`placeGenerator: "${itemId}" has no generator definition`);
  }
  if (roomForItems(state) === 0) return null;

  const item: BoardItem = {
    itemId,
    cobwebbed: false,
    generator: { charges: def.charges, cooldownEndsAt: null },
  };
  const events: GameEvent[] = [];
  let next: GameState;

  const cell = nearestEmpty(state.board, middleCell(state));
  if (cell !== null) {
    next = {
      ...state,
      board: setCell(state.board, cell, { kind: 'item', item }),
    };
    events.push({ type: 'spawned', itemId, cell, rare: false });
  } else {
    next = {
      ...state,
      pantry: { ...state.pantry, items: [...state.pantry.items, item] },
    };
  }

  const found = discover(data, next, itemId);
  return { state: found.state, events: [...events, ...found.events] };
}
