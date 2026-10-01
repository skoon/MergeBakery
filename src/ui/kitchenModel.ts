/**
 * What the Kitchen sheet and Oven button show (T4.4). Pure, no DOM.
 */

import { bakeStatus, rushCost, type BakeStatus } from '../core/bakes';
import { matchOrderItems } from '../core/deliver';
import { bakeDurationMs } from '../core/kitchen';
import { producibleChains } from '../core/orders';
import { nextOven } from '../core/ovens';
import type {
  BakeSlotRef,
  CellIndex,
  GameData,
  GameState,
  ItemId,
  OvenId,
  Recipe,
  RecipeId,
  Timestamp,
} from '../core/types';

export interface SlotView {
  slot: BakeSlotRef;
  status: BakeStatus;
  recipeName: string | null;
  /** formatDuration(msLeft) while baking, else null. */
  timeLeft: string | null;
  /** While baking, else null. */
  rushCost: number | null;
  canAffordRush: boolean;
}

export interface OvenView {
  index: number;
  ovenId: OvenId;
  name: string;
  /** The oven's art (T6.3). */
  spriteKey: string;
  slots: SlotView[];
}

export interface RecipeView {
  recipeId: RecipeId;
  name: string;
  outputSpriteKey: string;
  inputs: { itemId: ItemId; name: string; spriteKey: string; ready: boolean }[];
  /** Board cells for the inputs, in recipe order, when every input is on the board; else null. */
  cells: CellIndex[] | null;
  /** formatDuration of the bake in the oven of `freeSlot`, else the first oven. */
  bakeTime: string;
}

export interface KitchenModel {
  ovens: OvenView[];
  /** Recipes the player can make now (see recipeAvailable), in data order. */
  recipes: RecipeView[];
  /** The first empty slot, scanning ovens then slots in order; null when all are busy. */
  freeSlot: BakeSlotRef | null;
  /** For the button ring: the highest progress among baking slots, or null when none is baking. */
  ringProgress: number | null;
  doneCount: number;
  /** The first pair of ovens with the same id and a next tier: `to` is the earlier index. Null when none. */
  upgrade: { from: number; to: number; nextName: string } | null;
}

/** "m:ss" under an hour, else "h:mm:ss"; seconds rounded up. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const ss = seconds.toString().padStart(2, '0');
  if (hours > 0) {
    return `${hours.toString()}:${minutes.toString().padStart(2, '0')}:${ss}`;
  }
  return `${minutes.toString()}:${ss}`;
}

function firstFreeSlot(state: GameState): BakeSlotRef | null {
  const ovens = state.kitchen.ovens;
  for (let oven = 0; oven < ovens.length; oven++) {
    const slots = ovens[oven]?.slots ?? [];
    for (let slot = 0; slot < slots.length; slot++) {
      if (slots[slot] === null) return { oven, slot };
    }
  }
  return null;
}

/** Cells for `inputs`, in order, or null when any is missing from the board. */
function inputCells(
  state: GameState,
  inputs: readonly ItemId[],
): CellIndex[] | null {
  const matches = matchOrderItems(state, inputs);
  return matches.every((cell) => cell !== null) ? matches : null;
}

/**
 * True when the player can get every input right now: its chain is fed by a
 * generator they own, or the item is already on the board or in the Pantry.
 * Recipes needing a generator the player hasn't unlocked stay hidden.
 */
export function recipeAvailable(
  data: GameData,
  state: GameState,
  recipe: Recipe,
): boolean {
  const chains = producibleChains(data, state);
  const held = new Set<ItemId>(state.pantry.items.map((item) => item.itemId));
  for (const cell of state.board.cells) {
    if (cell.kind === 'item') held.add(cell.item.itemId);
  }
  return recipe.inputs.every((itemId) => {
    const chainId = data.items.get(itemId)?.chainId;
    return held.has(itemId) || (chainId !== undefined && chains.has(chainId));
  });
}

export function kitchenModel(
  data: GameData,
  state: GameState,
  now: Timestamp,
): KitchenModel {
  let ringProgress: number | null = null;
  let doneCount = 0;

  const ovens: OvenView[] = state.kitchen.ovens.map((oven, index) => {
    const def = data.ovens.get(oven.ovenId);
    const slots: SlotView[] = oven.slots.map((_, slotIndex) => {
      const slot = { oven: index, slot: slotIndex };
      const status = bakeStatus(state, slot, now);
      const recipeName =
        status.kind === 'empty'
          ? null
          : (data.recipes.get(status.recipeId)?.name ?? status.recipeId);

      if (status.kind === 'baking') {
        ringProgress = Math.max(ringProgress ?? 0, status.progress);
        const cost = rushCost(data, state, slot, now);
        return {
          slot,
          status,
          recipeName,
          timeLeft: formatDuration(status.msLeft),
          rushCost: cost,
          canAffordRush: state.gems >= cost,
        };
      }

      if (status.kind === 'done') doneCount++;
      return {
        slot,
        status,
        recipeName,
        timeLeft: null,
        rushCost: null,
        canAffordRush: false,
      };
    });

    return {
      index,
      ovenId: oven.ovenId,
      name: def?.name ?? oven.ovenId,
      spriteKey: def?.spriteKey ?? oven.ovenId,
      slots,
    };
  });

  const freeSlot = firstFreeSlot(state);
  const timingOven = state.kitchen.ovens[freeSlot?.oven ?? 0]?.ovenId;
  if (timingOven === undefined) {
    throw new Error('kitchenModel: the kitchen has no ovens');
  }

  const available = Array.from(data.recipes.values()).filter((recipe) =>
    recipeAvailable(data, state, recipe),
  );
  const recipes: RecipeView[] = available.map((recipe) => {
    const matches = matchOrderItems(state, recipe.inputs);
    const cells = matches.every((c) => c !== null) ? matches : null;
    return {
      recipeId: recipe.id,
      name: recipe.name,
      outputSpriteKey:
        data.items.get(recipe.output)?.spriteKey ?? recipe.output,
      inputs: recipe.inputs.map((itemId, i) => {
        const item = data.items.get(itemId);
        return {
          itemId,
          name: item?.name ?? itemId,
          spriteKey: item?.spriteKey ?? itemId,
          ready: matches[i] !== null,
        };
      }),
      cells,
      bakeTime: formatDuration(bakeDurationMs(data, recipe.id, timingOven)),
    };
  });

  let upgrade: KitchenModel['upgrade'] = null;
  const list = state.kitchen.ovens;
  search: for (let to = 0; to < list.length; to++) {
    const toOven = list[to];
    if (!toOven) continue;
    const next = nextOven(data, toOven.ovenId);
    if (!next) continue;
    for (let from = to + 1; from < list.length; from++) {
      if (list[from]?.ovenId === toOven.ovenId) {
        upgrade = { from, to, nextName: next.name };
        break search;
      }
    }
  }

  return { ovens, recipes, freeSlot, ringProgress, doneCount, upgrade };
}

/**
 * For a board item dropped on the Oven button: the first recipe, in data order,
 * that uses the item and has all its inputs on the board (using `cell` for the
 * dropped item), with its cells in recipe order and the first free slot. Null
 * when none qualifies or no slot is free.
 */
export function recipeForDrop(
  data: GameData,
  state: GameState,
  cell: CellIndex,
): { recipeId: RecipeId; cells: CellIndex[]; slot: BakeSlotRef } | null {
  const slot = firstFreeSlot(state);
  const dropped = state.board.cells[cell];
  if (!slot || dropped?.kind !== 'item' || dropped.item.cobwebbed) return null;
  const droppedId = dropped.item.itemId;

  for (const recipe of data.recipes.values()) {
    const at = recipe.inputs.indexOf(droppedId);
    if (at === -1) continue;

    // Match the other inputs with the dropped cell set aside.
    const others = recipe.inputs.filter((_, i) => i !== at);
    const withoutDropped: GameState = {
      ...state,
      board: {
        ...state.board,
        cells: state.board.cells.map((c, i) =>
          i === cell ? { kind: 'empty' } : c,
        ),
      },
    };
    const otherCells = inputCells(withoutDropped, others);
    if (!otherCells) continue;

    const cells = [...otherCells];
    cells.splice(at, 0, cell);
    return { recipeId: recipe.id, cells, slot };
  }

  return null;
}
