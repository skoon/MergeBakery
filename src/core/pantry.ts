/**
 * Pantry functions for Rise & Shine Bakery (T3.4).
 *
 * Move items between the board and the Pantry, and buy more Pantry slots.
 */

import type { ActionResult, CellIndex, GameData, GameState } from './types';
import { getCell, setCell, nearestEmpty } from './board';

/**
 * Moves the board item at `cell` to the end of the Pantry, keeping its generator charges.
 * Rejects: 'emptyCell' (nothing there), 'locked', 'cobwebbed', 'pantryFull' (items.length >= capacity).
 */
export function storeInPantry(
  _data: GameData,
  state: GameState,
  cell: CellIndex,
): ActionResult {
  const boardCell = getCell(state.board, cell);

  // Check if cell is empty
  if (boardCell.kind === 'empty') {
    return { ok: false, reason: 'emptyCell' };
  }

  // Check if cell is locked
  if (boardCell.kind === 'locked') {
    return { ok: false, reason: 'locked' };
  }

  // Cell must be an item
  const item = boardCell.item;

  // Check if item is cobwebbed
  if (item.cobwebbed) {
    return { ok: false, reason: 'cobwebbed' };
  }

  // Check if pantry is full
  if (state.pantry.items.length >= state.pantry.capacity) {
    return { ok: false, reason: 'pantryFull' };
  }

  // Create new board with empty cell at the old position
  const newBoard = setCell(state.board, cell, { kind: 'empty' });

  // Create new pantry with item appended
  const newPantryItems = [...state.pantry.items, item];
  const newPantry = { ...state.pantry, items: newPantryItems };

  // Return new state
  const newState = {
    ...state,
    board: newBoard,
    pantry: newPantry,
  };

  return { ok: true, state: newState, events: [] };
}

/**
 * Moves pantry.items[pantryIndex] to `to` if that cell is empty, else to nearestEmpty(board, to).
 * Rejects 'boardFull' when no cell is empty. Throws RangeError for a bad pantryIndex.
 */
export function takeFromPantry(
  _data: GameData,
  state: GameState,
  pantryIndex: number,
  to: CellIndex,
): ActionResult {
  // Throw RangeError for bad pantryIndex
  if (pantryIndex < 0 || pantryIndex >= state.pantry.items.length) {
    throw new RangeError(
      `takeFromPantry: pantryIndex ${pantryIndex} is out of range [0, ${state.pantry.items.length})`,
    );
  }

  const item = state.pantry.items[pantryIndex];
  if (!item) {
    throw new RangeError(
      `takeFromPantry: pantry item at index ${pantryIndex} is undefined`,
    );
  }

  // Determine target cell
  let targetCell = to;
  const targetBoardCell = getCell(state.board, to);
  if (targetBoardCell.kind !== 'empty') {
    // Try to find nearest empty
    const nearest = nearestEmpty(state.board, to);
    if (nearest === null) {
      return { ok: false, reason: 'boardFull' };
    }
    targetCell = nearest;
  }

  // Create new board with item placed at targetCell
  const newBoard = setCell(state.board, targetCell, {
    kind: 'item',
    item,
  });

  // Create new pantry without the item
  const newPantryItems = state.pantry.items.filter(
    (_, idx) => idx !== pantryIndex,
  );
  const newPantry = { ...state.pantry, items: newPantryItems };

  // Return new state
  const newState = {
    ...state,
    board: newBoard,
    pantry: newPantry,
  };

  return { ok: true, state: newState, events: [] };
}

/**
 * Slots bought so far = capacity - economy.pantry.startSlots; the next costs slotCosts[bought].
 * Rejects 'pantryMaxed' when every slot is bought and 'notEnoughCoins' when coins < cost.
 * Otherwise capacity + 1 and coins - cost.
 */
export function buyPantrySlot(data: GameData, state: GameState): ActionResult {
  const startSlots = data.economy.pantry.startSlots;
  const slotCosts = data.economy.pantry.slotCosts;
  const currentCapacity = state.pantry.capacity;

  // Calculate how many slots have been bought
  const slotsBought = currentCapacity - startSlots;

  // Check if all slots are already bought
  if (slotsBought >= slotCosts.length) {
    return { ok: false, reason: 'pantryMaxed' };
  }

  // Get the cost of the next slot
  const nextCost = slotCosts[slotsBought];
  if (nextCost === undefined) {
    return { ok: false, reason: 'pantryMaxed' };
  }

  // Check if player has enough coins
  if (state.coins < nextCost) {
    return { ok: false, reason: 'notEnoughCoins' };
  }

  // Create new pantry with increased capacity
  const newPantry = {
    ...state.pantry,
    capacity: currentCapacity + 1,
  };

  // Create new state with updated pantry and coins
  const newState = {
    ...state,
    pantry: newPantry,
    coins: state.coins - nextCost,
  };

  return { ok: true, state: newState, events: [] };
}
