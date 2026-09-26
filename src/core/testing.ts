/**
 * Testing helpers for Rise & Shine Bakery (T2.1).
 *
 * Used only by test files.
 */

import type { Cell, GameData, GameState, ItemId, LockKind } from './types';
import { createNewGame } from './newGame';
import { loadGameData } from './data';
import { setCell } from './board';

export type CellSpec =
  | ItemId
  | { readonly itemId: ItemId; readonly cobwebbed: boolean }
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  | LockKind;

/**
 * loadGameData(), loaded once.
 */
export const testData: GameData = loadGameData();

/**
 * Create a test GameState.
 *
 * Starts with createNewGame(testData, 1, 0) with every board cell emptied,
 * then `cells` are placed.
 *
 * A string equal to "crate" or "flourSack" is a lock; any other string is an
 * item id. Generator items get full charges from testData.generators.
 * `overrides` replace top-level GameState fields.
 */
export function stateWith(
  cells: Readonly<Record<number, CellSpec>>,
  overrides?: Partial<GameState>,
): GameState {
  let state = createNewGame(testData, 1, 0);

  // Empty the board
  const emptyCellsArray: readonly Cell[] = Array.from(
    { length: state.board.cells.length },
    (): Cell => ({
      kind: 'empty',
    }),
  );
  let board: typeof state.board = {
    ...state.board,
    cells: emptyCellsArray,
  };

  // Place specified cells
  for (const [indexStr, spec] of Object.entries(cells)) {
    const index = parseInt(indexStr, 10);

    if (spec === 'crate' || spec === 'flourSack') {
      // It's a lock
      board = setCell(board, index, {
        kind: 'locked',
        lock: spec,
      });
    } else {
      // It's an item
      const itemId = typeof spec === 'string' ? spec : spec.itemId;
      const cobwebbed = typeof spec === 'string' ? false : spec.cobwebbed;

      const generatorDef = testData.generators.get(itemId);
      const item = {
        itemId,
        cobwebbed,
        generator: generatorDef
          ? { charges: generatorDef.charges, cooldownEndsAt: null }
          : null,
      };

      board = setCell(board, index, {
        kind: 'item',
        item,
      });
    }
  }

  state = {
    ...state,
    board,
  };

  // Apply overrides
  if (overrides) {
    state = { ...state, ...overrides };
  }

  return state;
}
