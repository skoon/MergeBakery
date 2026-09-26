/**
 * Tests for board helpers (T2.1).
 */

import { describe, it, expect } from 'vitest';
import type { Board, Cell } from './types';
import {
  getCell,
  setCell,
  toIndex,
  toPos,
  neighbors,
  emptyCells,
  nearestEmpty,
} from './board';

function createTestBoard(cols: number, rows: number): Board {
  const cells: readonly Cell[] = Array.from(
    { length: cols * rows },
    (): Cell => ({
      kind: 'empty',
    }),
  );
  return { cols, rows, cells };
}

describe('board', () => {
  describe('getCell', () => {
    it('returns the cell at a valid index', () => {
      const board = createTestBoard(3, 3);
      const cell = getCell(board, 0);
      expect(cell.kind).toBe('empty');
    });

    it('throws RangeError when index is negative', () => {
      const board = createTestBoard(3, 3);
      expect(() => getCell(board, -1)).toThrow(RangeError);
    });

    it('throws RangeError when index is out of range', () => {
      const board = createTestBoard(3, 3);
      expect(() => getCell(board, 9)).toThrow(RangeError);
    });
  });

  describe('setCell', () => {
    it('returns a new Board with the cell replaced', () => {
      const board = createTestBoard(3, 3);
      const newCell = { kind: 'empty' } as const;
      const newBoard = setCell(board, 0, newCell);
      expect(newBoard).not.toBe(board);
      expect(newBoard.cells).not.toBe(board.cells);
    });

    it('does not mutate the input board', () => {
      const board = createTestBoard(3, 3);
      const originalCells = board.cells;
      const newCell = { kind: 'locked', lock: 'crate' } as const;
      setCell(board, 0, newCell);
      expect(board.cells).toBe(originalCells);
      expect(board.cells[0]?.kind).toBe('empty');
    });

    it('throws RangeError when index is negative', () => {
      const board = createTestBoard(3, 3);
      expect(() => setCell(board, -1, { kind: 'empty' })).toThrow(RangeError);
    });

    it('throws RangeError when index is out of range', () => {
      const board = createTestBoard(3, 3);
      expect(() => setCell(board, 9, { kind: 'empty' })).toThrow(RangeError);
    });
  });

  describe('toIndex', () => {
    it('converts col and row to index (row-major)', () => {
      const board = createTestBoard(3, 3);
      // index = row * cols + col
      // (col=0, row=0) -> 0
      // (col=1, row=0) -> 1
      // (col=2, row=0) -> 2
      // (col=0, row=1) -> 3
      expect(toIndex(board, 0, 0)).toBe(0);
      expect(toIndex(board, 1, 0)).toBe(1);
      expect(toIndex(board, 2, 0)).toBe(2);
      expect(toIndex(board, 0, 1)).toBe(3);
      expect(toIndex(board, 2, 2)).toBe(8);
    });

    it('throws RangeError when col is negative', () => {
      const board = createTestBoard(3, 3);
      expect(() => toIndex(board, -1, 0)).toThrow(RangeError);
    });

    it('throws RangeError when col is >= board.cols', () => {
      const board = createTestBoard(3, 3);
      expect(() => toIndex(board, 3, 0)).toThrow(RangeError);
    });

    it('throws RangeError when row is negative', () => {
      const board = createTestBoard(3, 3);
      expect(() => toIndex(board, 0, -1)).toThrow(RangeError);
    });

    it('throws RangeError when row is >= board.rows', () => {
      const board = createTestBoard(3, 3);
      expect(() => toIndex(board, 0, 3)).toThrow(RangeError);
    });
  });

  describe('toPos', () => {
    it('converts index to col and row', () => {
      const board = createTestBoard(3, 3);
      expect(toPos(board, 0)).toEqual({ col: 0, row: 0 });
      expect(toPos(board, 1)).toEqual({ col: 1, row: 0 });
      expect(toPos(board, 3)).toEqual({ col: 0, row: 1 });
      expect(toPos(board, 8)).toEqual({ col: 2, row: 2 });
    });
  });

  describe('neighbors', () => {
    it('returns neighbors in order: up, right, down, left', () => {
      const board = createTestBoard(3, 3);
      // Center cell (index 4, col=1, row=1)
      const result = neighbors(board, 4);
      expect(result).toEqual([1, 5, 7, 3]);
    });

    it('returns only valid neighbors for corner cells', () => {
      const board = createTestBoard(3, 3);
      // Top-left corner (index 0, col=0, row=0)
      expect(neighbors(board, 0)).toEqual([1, 3]);
    });

    it('returns only valid neighbors for edge cells', () => {
      const board = createTestBoard(3, 3);
      // Top edge (index 1, col=1, row=0)
      expect(neighbors(board, 1)).toEqual([2, 4, 0]);
    });
  });

  describe('emptyCells', () => {
    it('returns all empty cells in ascending order', () => {
      const board = createTestBoard(3, 3);
      const result = emptyCells(board);
      expect(result).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    });

    it('returns empty array when board is full', () => {
      const board = createTestBoard(2, 2);
      const cells = [
        { kind: 'locked', lock: 'crate' } as const,
        { kind: 'locked', lock: 'flourSack' } as const,
        {
          kind: 'item',
          item: { itemId: 'flour-sack-1', cobwebbed: false, generator: null },
        } as const,
        {
          kind: 'item',
          item: { itemId: 'flour-sack-2', cobwebbed: false, generator: null },
        } as const,
      ];
      const fullBoard = { ...board, cells };
      expect(emptyCells(fullBoard)).toEqual([]);
    });

    it('excludes non-empty cells', () => {
      let board = createTestBoard(3, 3);
      board = setCell(board, 0, { kind: 'locked', lock: 'crate' });
      board = setCell(board, 4, {
        kind: 'item',
        item: { itemId: 'flour-sack-1', cobwebbed: false, generator: null },
      });
      const result = emptyCells(board);
      expect(result).toEqual([1, 2, 3, 5, 6, 7, 8]);
    });
  });

  describe('nearestEmpty', () => {
    it('returns null when board is full', () => {
      const board = createTestBoard(2, 2);
      const cells = [
        { kind: 'locked', lock: 'crate' } as const,
        { kind: 'locked', lock: 'flourSack' } as const,
        {
          kind: 'item',
          item: { itemId: 'flour-sack-1', cobwebbed: false, generator: null },
        } as const,
        {
          kind: 'item',
          item: { itemId: 'flour-sack-2', cobwebbed: false, generator: null },
        } as const,
      ];
      const fullBoard = { ...board, cells };
      expect(nearestEmpty(fullBoard, 0)).toBeNull();
    });

    it('returns the cell itself if it is empty', () => {
      const board = createTestBoard(3, 3);
      expect(nearestEmpty(board, 4)).toBe(4);
    });

    it('finds the nearest empty cell by distance', () => {
      let board = createTestBoard(3, 3);
      board = setCell(board, 4, {
        kind: 'item',
        item: { itemId: 'flour-sack-1', cobwebbed: false, generator: null },
      });
      // From index 4 (center), which is now occupied
      // Neighbors are at equal distance: 1, 3, 5, 7
      // Should return the lowest index among equally-distant neighbors
      const result = nearestEmpty(board, 4);
      expect(result).toBe(1);
    });

    it('resolves ties by lowest index', () => {
      let board = createTestBoard(5, 5);
      // Place item at center (index 12)
      board = setCell(board, 12, {
        kind: 'item',
        item: { itemId: 'flour-sack-1', cobwebbed: false, generator: null },
      });
      // Neighbors of 12 are at indices: 7, 13, 17, 11
      // All at equal distance, should return lowest index (7)
      const result = nearestEmpty(board, 12);
      expect(result).toBe(7);
    });
  });
});
