/**
 * Baking functions for Rise & Shine Bakery (T4.2).
 *
 * Manages bake status, collection, and rushing.
 */

import type {
  ActionResult,
  BakeSlotRef,
  GameData,
  GameState,
  RecipeId,
  Timestamp,
} from './types';
import { getBake, setBake } from './kitchen';
import { nearestEmpty, setCell, toIndex } from './board';
import { discover } from './discovery';

export type BakeStatus =
  | { kind: 'empty' }
  | { kind: 'baking'; recipeId: RecipeId; progress: number; msLeft: number }
  | { kind: 'done'; recipeId: RecipeId };

/**
 * Returns the current status of a bake in a slot.
 * Throws RangeError for a bad slot via getBake.
 */
export function bakeStatus(
  state: GameState,
  slot: BakeSlotRef,
  now: Timestamp,
): BakeStatus {
  const bake = getBake(state, slot);

  if (bake === null) {
    return { kind: 'empty' };
  }

  if (now >= bake.endsAt) {
    return { kind: 'done', recipeId: bake.recipeId };
  }

  const duration = bake.endsAt - bake.startedAt;
  const elapsed = now - bake.startedAt;
  const progress = elapsed / duration;
  const msLeft = bake.endsAt - now;

  return {
    kind: 'baking',
    recipeId: bake.recipeId,
    progress,
    msLeft,
  };
}

/**
 * Collects a finished bake and places its output on the board or in the Pantry.
 * Throws RangeError for a bad slot via getBake.
 */
export function collectBake(
  data: GameData,
  state: GameState,
  slot: BakeSlotRef,
  now: Timestamp,
): ActionResult {
  const bake = getBake(state, slot);

  if (bake === null) {
    return { ok: false, reason: 'slotEmpty' };
  }

  if (now < bake.endsAt) {
    return { ok: false, reason: 'bakeNotReady' };
  }

  const recipe = data.recipes.get(bake.recipeId);
  if (!recipe) {
    throw new Error(`collectBake: unknown recipe id "${bake.recipeId}"`);
  }

  const outputItem = data.items.get(recipe.output);
  if (!outputItem) {
    throw new Error(`collectBake: unknown output item id "${recipe.output}"`);
  }

  // Create the baked item (not cobwebbed, generator: null)
  const bakedItem = {
    itemId: recipe.output,
    cobwebbed: false,
    generator: null,
  };

  // Try to place on the board near the middle
  const middleRow = Math.floor(state.board.rows / 2);
  const middleCol = Math.floor(state.board.cols / 2);
  const middleCell = toIndex(state.board, middleCol, middleRow);

  const targetCell = nearestEmpty(state.board, middleCell);

  let placedAt: { cell: number } | 'pantry';
  let stateWithItem: GameState;

  if (targetCell !== null) {
    // Place on board
    const newBoard = setCell(state.board, targetCell, {
      kind: 'item',
      item: bakedItem,
    });
    stateWithItem = { ...state, board: newBoard };
    placedAt = { cell: targetCell };
  } else if (state.pantry.items.length < state.pantry.capacity) {
    // Place in pantry
    stateWithItem = {
      ...state,
      pantry: {
        ...state.pantry,
        items: [...state.pantry.items, bakedItem],
      },
    };
    placedAt = 'pantry';
  } else {
    // Both board and pantry are full
    return { ok: false, reason: 'boardFull' };
  }

  // Empty the slot
  let newState = setBake(stateWithItem, slot, null);

  // Discover the output item
  const { state: discoveredState, events: discoveryEvents } = discover(
    data,
    newState,
    recipe.output,
  );
  newState = discoveredState;

  const events = [
    {
      type: 'bakeCollected' as const,
      slot,
      itemId: recipe.output,
      to: placedAt,
    },
    ...discoveryEvents,
  ];

  return {
    ok: true,
    state: newState,
    events,
  };
}

/**
 * Cost in gems to finish a bake now.
 * Returns 0 for a finished bake.
 * Throws RangeError for an empty slot.
 */
export function rushCost(
  data: GameData,
  state: GameState,
  slot: BakeSlotRef,
  now: Timestamp,
): number {
  const bake = getBake(state, slot);

  if (bake === null) {
    throw new RangeError(`rushCost: slot is empty`);
  }

  if (now >= bake.endsAt) {
    return 0;
  }

  const msLeft = bake.endsAt - now;
  const minutesLeft = msLeft / 60000;
  const wholeMinutes = Math.ceil(minutesLeft);

  return wholeMinutes * data.economy.rushGemsPerMinute;
}

/**
 * Pay gems to finish a bake immediately.
 * Throws RangeError for an empty slot.
 */
export function rushBake(
  data: GameData,
  state: GameState,
  slot: BakeSlotRef,
  now: Timestamp,
): ActionResult {
  const bake = getBake(state, slot);

  if (bake === null) {
    return { ok: false, reason: 'slotEmpty' };
  }

  const cost = rushCost(data, state, slot, now);

  if (cost === 0) {
    // Already finished
    return { ok: true, state, events: [] };
  }

  if (state.gems < cost) {
    return { ok: false, reason: 'notEnoughGems' };
  }

  // Pay the cost and finish immediately
  const newState = setBake(state, slot, {
    ...bake,
    endsAt: now,
  });

  return {
    ok: true,
    state: {
      ...newState,
      gems: newState.gems - cost,
    },
    events: [],
  };
}
