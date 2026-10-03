/**
 * Kitchen functions for Rise & Shine Bakery (T4.1).
 *
 * Manages recipe loading and baking in ovens.
 */

import type {
  ActionResult,
  Bake,
  BakeSlotRef,
  CellIndex,
  GameData,
  GameState,
  OvenId,
  RecipeId,
  Timestamp,
} from './types';
import { getCell, setCell } from './board';

/**
 * The bake in a slot, or null when empty. Throws RangeError for an oven or slot
 * index that doesn't exist.
 */
export function getBake(state: GameState, slot: BakeSlotRef): Bake | null {
  const { oven, slot: slotIndex } = slot;
  const ovens = state.kitchen.ovens;

  if (oven < 0 || oven >= ovens.length) {
    throw new RangeError(
      `getBake: oven ${oven} is out of range [0, ${ovens.length})`,
    );
  }

  const ovenState = ovens[oven];
  if (!ovenState) {
    throw new RangeError(`getBake: oven ${oven} is undefined`);
  }

  if (slotIndex < 0 || slotIndex >= ovenState.slots.length) {
    throw new RangeError(
      `getBake: slot ${slotIndex} is out of range [0, ${ovenState.slots.length})`,
    );
  }

  const bake = ovenState.slots[slotIndex];
  if (bake === undefined) {
    throw new RangeError(`getBake: slot ${slotIndex} is undefined`);
  }

  return bake;
}

/**
 * A new state with that one slot replaced. Throws RangeError like getBake.
 */
export function setBake(
  state: GameState,
  slot: BakeSlotRef,
  bake: Bake | null,
): GameState {
  const { oven, slot: slotIndex } = slot;
  const ovens = state.kitchen.ovens;

  if (oven < 0 || oven >= ovens.length) {
    throw new RangeError(
      `setBake: oven ${oven} is out of range [0, ${ovens.length})`,
    );
  }

  const ovenState = ovens[oven];
  if (!ovenState) {
    throw new RangeError(`setBake: oven ${oven} is undefined`);
  }

  if (slotIndex < 0 || slotIndex >= ovenState.slots.length) {
    throw new RangeError(
      `setBake: slot ${slotIndex} is out of range [0, ${ovenState.slots.length})`,
    );
  }

  const newSlots = [...ovenState.slots];
  newSlots[slotIndex] = bake;

  const newOvenState = { ...ovenState, slots: newSlots };
  const newOvens = [...ovens];
  newOvens[oven] = newOvenState;

  return {
    ...state,
    kitchen: { ovens: newOvens },
  };
}

/** The product of every hired baker's bakeTimeMultiplier (T10.3); 1 with none. */
export function staffBakeMultiplier(data: GameData, state: GameState): number {
  let multiplier = 1;
  for (const hired of state.staff) {
    const def = data.staff.get(hired.staffId);
    if (def?.role === 'baker') multiplier *= def.bakeTimeMultiplier ?? 1;
  }
  return multiplier;
}

/**
 * recipe.bakeSec × 1000 × the oven's bakeTimeMultiplier × the staff's (when
 * `state` is given), rounded to whole ms. Throws on unknown ids.
 */
export function bakeDurationMs(
  data: GameData,
  recipeId: RecipeId,
  ovenId: OvenId,
  state?: GameState,
): number {
  const recipe = data.recipes.get(recipeId);
  if (!recipe) {
    throw new Error(`bakeDurationMs: unknown recipe id "${recipeId}"`);
  }

  const oven = data.ovens.get(ovenId);
  if (!oven) {
    throw new Error(`bakeDurationMs: unknown oven id "${ovenId}"`);
  }

  return Math.round(
    recipe.bakeSec *
      1000 *
      oven.bakeTimeMultiplier *
      (state ? staffBakeMultiplier(data, state) : 1),
  );
}

/**
 * Throws for an unknown recipe, a bad slot, or `cells` whose length differs
 * from the recipe's inputs or that repeats a cell (programming errors: the UI
 * builds `cells`).
 * Rejects 'slotBusy' when the slot holds a bake, and 'missingItems' when any
 * cells[i] doesn't hold recipe.inputs[i] (empty, locked, a different item, or
 * cobwebbed).
 * Otherwise empties those cells and sets the slot to
 * { recipeId, startedAt: now, endsAt: now + bakeDurationMs(recipe, the slot's oven) }.
 * Event: bakeStarted { slot, recipeId }.
 */
export function loadRecipe(
  data: GameData,
  state: GameState,
  slot: BakeSlotRef,
  recipeId: RecipeId,
  cells: readonly CellIndex[],
  now: Timestamp,
): ActionResult {
  // Validate recipe exists
  const recipe = data.recipes.get(recipeId);
  if (!recipe) {
    throw new Error(`loadRecipe: unknown recipe id "${recipeId}"`);
  }

  // Validate slot exists
  let currentBake: Bake | null;
  try {
    currentBake = getBake(state, slot);
  } catch (e) {
    if (e instanceof RangeError) {
      throw e;
    }
    throw e;
  }

  // Validate cells array length matches recipe inputs
  if (cells.length !== recipe.inputs.length) {
    throw new Error(
      `loadRecipe: cells length ${cells.length} does not match recipe inputs length ${recipe.inputs.length}`,
    );
  }

  // Validate no repeated cells
  const cellSet = new Set(cells);
  if (cellSet.size !== cells.length) {
    throw new Error(`loadRecipe: cells array contains repeated indices`);
  }

  // Check if slot is busy
  if (currentBake !== null) {
    return { ok: false, reason: 'slotBusy' };
  }

  // Validate each cell has the right item
  for (let i = 0; i < cells.length; i++) {
    const cellIndex = cells[i]!;
    const requiredItemId = recipe.inputs[i]!;

    const cell = getCell(state.board, cellIndex);

    // Check if cell is empty
    if (cell.kind === 'empty') {
      return { ok: false, reason: 'missingItems' };
    }

    // Check if cell is locked
    if (cell.kind === 'locked') {
      return { ok: false, reason: 'missingItems' };
    }

    // Cell is an item
    const boardItem = cell.item;

    // Check if item matches
    if (boardItem.itemId !== requiredItemId) {
      return { ok: false, reason: 'missingItems' };
    }

    // Check if item is cobwebbed
    if (boardItem.cobwebbed) {
      return { ok: false, reason: 'missingItems' };
    }
  }

  // All validations passed. Empty the cells and set the bake.
  let newBoard = state.board;

  for (const cellIndex of cells) {
    newBoard = setCell(newBoard, cellIndex, { kind: 'empty' });
  }

  let newState = { ...state, board: newBoard };

  // Get the oven to calculate duration
  const ovenState = state.kitchen.ovens[slot.oven];
  if (!ovenState) {
    throw new Error(`loadRecipe: oven ${slot.oven} does not exist`);
  }

  const ovenId = ovenState.ovenId;
  const duration = bakeDurationMs(data, recipeId, ovenId, state);

  const bake: Bake = {
    recipeId,
    startedAt: now,
    endsAt: now + duration,
  };

  newState = setBake(newState, slot, bake);

  return {
    ok: true,
    state: newState,
    events: [
      {
        type: 'bakeStarted',
        slot,
        recipeId,
      },
    ],
  };
}
