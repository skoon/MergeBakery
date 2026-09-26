/**
 * Board helpers for Rise & Shine Bakery (T2.1).
 *
 * Cells are row-major: index = row * board.cols + col.
 */

import type { Board, Cell, CellIndex } from './types';

/**
 * Get the cell at the given index.
 * @throws RangeError when the index is out of range.
 */
export function getCell(board: Board, index: CellIndex): Cell {
  if (index < 0 || index >= board.cells.length) {
    throw new RangeError(
      `getCell: index ${index} is out of range [0, ${board.cells.length})`,
    );
  }
  const cell = board.cells[index];
  if (!cell) {
    throw new RangeError(`getCell: cell at index ${index} is undefined`);
  }
  return cell;
}

/**
 * Return a new Board with the cell at the given index replaced.
 * @throws RangeError when the index is out of range.
 */
export function setCell(board: Board, index: CellIndex, cell: Cell): Board {
  if (index < 0 || index >= board.cells.length) {
    throw new RangeError(
      `setCell: index ${index} is out of range [0, ${board.cells.length})`,
    );
  }
  const cells = [...board.cells];
  cells[index] = cell;
  return { ...board, cells };
}

/**
 * Convert column and row to a cell index.
 * @throws RangeError when the position is off the board.
 */
export function toIndex(board: Board, col: number, row: number): CellIndex {
  if (col < 0 || col >= board.cols || row < 0 || row >= board.rows) {
    throw new RangeError(
      `toIndex: (col=${col}, row=${row}) is off the ${board.cols}x${board.rows} board`,
    );
  }
  return row * board.cols + col;
}

/**
 * Convert a cell index to column and row.
 */
export function toPos(
  board: Board,
  index: CellIndex,
): { col: number; row: number } {
  const col = index % board.cols;
  const row = Math.floor(index / board.cols);
  return { col, row };
}

/**
 * Get the orthogonal neighbors of a cell, in order: up, right, down, left.
 */
export function neighbors(board: Board, index: CellIndex): CellIndex[] {
  const { col, row } = toPos(board, index);
  const result: CellIndex[] = [];

  // Up
  if (row > 0) {
    result.push(toIndex(board, col, row - 1));
  }

  // Right
  if (col < board.cols - 1) {
    result.push(toIndex(board, col + 1, row));
  }

  // Down
  if (row < board.rows - 1) {
    result.push(toIndex(board, col, row + 1));
  }

  // Left
  if (col > 0) {
    result.push(toIndex(board, col - 1, row));
  }

  return result;
}

/**
 * Get all empty cells on the board, in ascending index order.
 */
export function emptyCells(board: Board): CellIndex[] {
  const result: CellIndex[] = [];
  for (let i = 0; i < board.cells.length; i++) {
    const cell = board.cells[i];
    if (cell && cell.kind === 'empty') {
      result.push(i);
    }
  }
  return result;
}

/**
 * Get the empty cell closest to `from` by straight-line distance between cell centers.
 * The cell `from` itself counts if it is empty.
 * Ties go to the lowest index.
 * Returns null when no cell is empty.
 */
export function nearestEmpty(board: Board, from: CellIndex): CellIndex | null {
  const empties = emptyCells(board);
  if (empties.length === 0) {
    return null;
  }

  const fromPos = toPos(board, from);

  let nearest: CellIndex = empties[0]!;
  let nearestDist = calculateDistance(fromPos, toPos(board, nearest));

  for (let i = 1; i < empties.length; i++) {
    const empty = empties[i];
    if (empty === undefined) continue;
    const dist = calculateDistance(fromPos, toPos(board, empty));

    if (dist < nearestDist || (dist === nearestDist && empty < nearest)) {
      nearest = empty;
      nearestDist = dist;
    }
  }

  return nearest;
}

/**
 * Calculate straight-line distance between two positions.
 */
function calculateDistance(
  pos1: { col: number; row: number },
  pos2: { col: number; row: number },
): number {
  const dx = pos1.col - pos2.col;
  const dy = pos1.row - pos2.row;
  return Math.sqrt(dx * dx + dy * dy);
}
