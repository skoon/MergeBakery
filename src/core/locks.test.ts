import { describe, it, expect } from 'vitest';
import { clearAdjacentLocks } from './locks';
import { stateWith } from './testing';
import { getCell } from './board';

describe('clearAdjacentLocks', () => {
  it('opens an orthogonal crate', () => {
    // Set up a board with a crate at index 1 (right of cell 0)
    const state = stateWith({
      0: 'apple-1',
      1: 'crate',
    });

    const result = clearAdjacentLocks(state, 0);

    expect(result.unlocked).toEqual([1]);
    expect(getCell(result.state.board, 1)).toEqual({ kind: 'empty' });
  });

  it('opens an orthogonal flour sack', () => {
    // Set up a board with a flour sack at index 1 (right of cell 0)
    const state = stateWith({
      0: 'apple-1',
      1: 'flourSack',
    });

    const result = clearAdjacentLocks(state, 0);

    expect(result.unlocked).toEqual([1]);
    expect(getCell(result.state.board, 1)).toEqual({ kind: 'empty' });
  });

  it('opens multiple orthogonal locks', () => {
    // Board is 7 cols x 9 rows
    // Cell 50 is at (1, 7)
    // Up: 43, Right: 51, Down: 57, Left: 49
    const state = stateWith({
      43: 'crate',
      50: 'apple-1',
      51: 'flourSack',
      57: 'crate',
    });

    const result = clearAdjacentLocks(state, 50);

    expect(result.unlocked.sort((a, b) => a - b)).toEqual([43, 51, 57]);
    expect(getCell(result.state.board, 43)).toEqual({ kind: 'empty' });
    expect(getCell(result.state.board, 51)).toEqual({ kind: 'empty' });
    expect(getCell(result.state.board, 57)).toEqual({ kind: 'empty' });
  });

  it('does not open diagonal locks', () => {
    // Board is 10 cols x 10 rows
    // Cell 50 is at (0, 5)
    // Diagonals would be at (1,4), (1,6) = 41, 61
    const state = stateWith({
      41: 'crate',
      50: 'apple-1',
      61: 'crate',
    });

    const result = clearAdjacentLocks(state, 50);

    expect(result.unlocked).toEqual([]);
    expect(result.state).toBe(state); // Same state object
    expect(getCell(result.state.board, 41)).toEqual({
      kind: 'locked',
      lock: 'crate',
    });
    expect(getCell(result.state.board, 61)).toEqual({
      kind: 'locked',
      lock: 'crate',
    });
  });

  it('handles a corner cell (top-left)', () => {
    // Board is 7 cols x 9 rows
    // Cell 0 is at (0, 0)
    // Neighbors: Right (1), Down (7)
    const state = stateWith({
      0: 'apple-1',
      1: 'crate',
      7: 'flourSack',
    });

    const result = clearAdjacentLocks(state, 0);

    expect(result.unlocked.sort((a, b) => a - b)).toEqual([1, 7]);
    expect(getCell(result.state.board, 1)).toEqual({ kind: 'empty' });
    expect(getCell(result.state.board, 7)).toEqual({ kind: 'empty' });
  });

  it('handles a corner cell (top-right)', () => {
    // Board is 7 cols x 9 rows
    // Cell 6 is at (6, 0)
    // Neighbors: Down (13), Left (5)
    const state = stateWith({
      5: 'crate',
      6: 'apple-1',
      13: 'flourSack',
    });

    const result = clearAdjacentLocks(state, 6);

    expect(result.unlocked.sort((a, b) => a - b)).toEqual([5, 13]);
    expect(getCell(result.state.board, 5)).toEqual({ kind: 'empty' });
    expect(getCell(result.state.board, 13)).toEqual({ kind: 'empty' });
  });

  it('handles a corner cell (bottom-left)', () => {
    // Board is 7 cols x 9 rows
    // Cell 56 is at (0, 8)
    // Neighbors: Up (49), Right (57)
    const state = stateWith({
      49: 'crate',
      56: 'apple-1',
      57: 'flourSack',
    });

    const result = clearAdjacentLocks(state, 56);

    expect(result.unlocked.sort((a, b) => a - b)).toEqual([49, 57]);
    expect(getCell(result.state.board, 49)).toEqual({ kind: 'empty' });
    expect(getCell(result.state.board, 57)).toEqual({ kind: 'empty' });
  });

  it('handles a corner cell (bottom-right)', () => {
    // Board is 7 cols x 9 rows
    // Cell 62 is at (6, 8)
    // Neighbors: Up (55), Left (61)
    const state = stateWith({
      55: 'crate',
      61: 'flourSack',
      62: 'apple-1',
    });

    const result = clearAdjacentLocks(state, 62);

    expect(result.unlocked.sort((a, b) => a - b)).toEqual([55, 61]);
    expect(getCell(result.state.board, 55)).toEqual({ kind: 'empty' });
    expect(getCell(result.state.board, 61)).toEqual({ kind: 'empty' });
  });

  it('returns the same state object when no locks are adjacent', () => {
    const state = stateWith({
      0: 'apple-1',
      1: 'apple-2',
    });

    const result = clearAdjacentLocks(state, 0);

    expect(result.state).toBe(state);
    expect(result.unlocked).toEqual([]);
  });

  it('does not mutate the input state', () => {
    const state = stateWith({
      0: 'apple-1',
      1: 'crate',
    });

    const originalCell = getCell(state.board, 1);
    clearAdjacentLocks(state, 0);

    expect(getCell(state.board, 1)).toBe(originalCell);
  });

  it('does not mutate the input board', () => {
    const state = stateWith({
      0: 'apple-1',
      1: 'crate',
    });

    const originalCells = state.board.cells;
    clearAdjacentLocks(state, 0);

    expect(state.board.cells).toBe(originalCells);
  });

  it('returns unlocked cells in ascending order', () => {
    // Board is 7 cols x 9 rows
    // Cell 50 at (1, 7)
    // Neighbors: Up (43), Right (51), Down (57), Left (49)
    const state = stateWith({
      57: 'crate',
      49: 'flourSack',
      43: 'crate',
      50: 'apple-1',
      51: 'flourSack',
    });

    const result = clearAdjacentLocks(state, 50);

    expect(result.unlocked).toEqual([43, 49, 51, 57]);
  });
});
