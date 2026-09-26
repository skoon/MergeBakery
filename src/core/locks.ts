/**
 * Lock opening for Rise & Shine Bakery (T2.5).
 *
 * Opens crates and flour sacks adjacent to a merge, expanding the playable board.
 */

import type { GameState, CellIndex } from './types';
import { neighbors, getCell, setCell } from './board';

/**
 * Opens every locked cell orthogonally next to `cell` (either lock kind): each becomes
 * { kind: 'empty' }. `unlocked` lists the opened cells ascending. When nothing opens,
 * returns the same state object and an empty list.
 */
export function clearAdjacentLocks(
  state: GameState,
  cell: CellIndex,
): { state: GameState; unlocked: CellIndex[] } {
  const adjacentNeighbors = neighbors(state.board, cell);
  const unlocked: CellIndex[] = [];
  let newBoard = state.board;

  for (const neighbor of adjacentNeighbors) {
    const neighborCell = getCell(state.board, neighbor);
    if (neighborCell.kind === 'locked') {
      unlocked.push(neighbor);
      newBoard = setCell(newBoard, neighbor, { kind: 'empty' });
    }
  }

  if (unlocked.length === 0) {
    return { state, unlocked: [] };
  }

  // Sort unlocked cells in ascending order
  unlocked.sort((a, b) => a - b);

  return {
    state: {
      ...state,
      board: newBoard,
    },
    unlocked,
  };
}
