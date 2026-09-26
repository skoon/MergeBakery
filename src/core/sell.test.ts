/**
 * Tests for selling items (T2.10).
 */

import { describe, it, expect } from 'vitest';
import { sellItem, undoSell } from './sell';
import { testData, stateWith } from './testing';

describe('sellItem', () => {
  it('sells an item and adds coins', () => {
    const state = stateWith({ 0: 'wheat-stalk' });
    const now = 1000;

    const result = sellItem(testData, state, 0, now);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.state.coins).toBe(state.coins + 1); // wheat-stalk has sellValue 1
    expect(result.state.board.cells[0]?.kind).toBe('empty');
    expect(result.state.lastSale).not.toBeNull();
    if (result.state.lastSale) {
      expect(result.state.lastSale.item.itemId).toBe('wheat-stalk');
      expect(result.state.lastSale.cell).toBe(0);
      expect(result.state.lastSale.coins).toBe(1);
      expect(result.state.lastSale.soldAt).toBe(now);
    }
    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.type).toBe('sold');
  });

  it('rejects empty cell', () => {
    const state = stateWith({ 0: 'wheat-stalk' });
    const result = sellItem(testData, state, 1, 1000);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('emptyCell');
  });

  it('rejects locked cell', () => {
    const state = stateWith({ 0: 'crate' });
    const result = sellItem(testData, state, 0, 1000);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('locked');
  });

  it('rejects cobwebbed item', () => {
    const state = stateWith({ 0: { itemId: 'wheat-stalk', cobwebbed: true } });
    const result = sellItem(testData, state, 0, 1000);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('cobwebbed');
  });

  it('rejects item with sellValue 0', () => {
    const state = stateWith({ 0: 'flour-mill-1' }); // generator has sellValue 0
    const result = sellItem(testData, state, 0, 1000);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('notSellable');
  });
});

describe('undoSell', () => {
  it('restores sold item when within window', () => {
    let state = stateWith({ 0: 'wheat-stalk' });
    const sellTime = 1000;

    const sellResult = sellItem(testData, state, 0, sellTime);
    expect(sellResult.ok).toBe(true);
    if (!sellResult.ok) return;
    state = sellResult.state;

    const undoTime = sellTime + 5000; // 5 seconds later
    const undoResult = undoSell(testData, state, undoTime);

    expect(undoResult.ok).toBe(true);
    if (!undoResult.ok) return;
    expect(undoResult.state.board.cells[0]?.kind).toBe('item');
    expect(undoResult.state.coins).toBe(testData.newGame.coins); // coins restored
    expect(undoResult.state.lastSale).toBeNull();
    expect(undoResult.events).toHaveLength(1);
    expect(undoResult.events[0]?.type).toBe('saleUndone');
  });

  it('rejects when no sale to undo', () => {
    const state = stateWith({});
    const result = undoSell(testData, state, 1000);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('nothingToUndo');
  });

  it('rejects when undo window has expired', () => {
    let state = stateWith({ 0: 'wheat-stalk' });
    const sellTime = 1000;

    const sellResult = sellItem(testData, state, 0, sellTime);
    expect(sellResult.ok).toBe(true);
    if (!sellResult.ok) return;
    state = sellResult.state;

    // sellUndoSec is 10, so we go 11 seconds forward
    const undoTime = sellTime + 11000;
    const undoResult = undoSell(testData, state, undoTime);

    expect(undoResult.ok).toBe(false);
    if (undoResult.ok) return;
    expect(undoResult.reason).toBe('undoExpired');
  });

  it('rejects right at the window edge (> sellUndoSec * 1000)', () => {
    let state = stateWith({ 0: 'wheat-stalk' });
    const sellTime = 1000;

    const sellResult = sellItem(testData, state, 0, sellTime);
    expect(sellResult.ok).toBe(true);
    if (!sellResult.ok) return;
    state = sellResult.state;

    // Exactly 10 seconds + 1ms later (beyond the window)
    const undoTime = sellTime + 10001;
    const undoResult = undoSell(testData, state, undoTime);

    expect(undoResult.ok).toBe(false);
    if (undoResult.ok) return;
    expect(undoResult.reason).toBe('undoExpired');
  });

  it('accepts right at the window edge (= sellUndoSec * 1000)', () => {
    let state = stateWith({ 0: 'wheat-stalk' });
    const sellTime = 1000;

    const sellResult = sellItem(testData, state, 0, sellTime);
    expect(sellResult.ok).toBe(true);
    if (!sellResult.ok) return;
    state = sellResult.state;

    // Exactly 10 seconds later (on the boundary)
    const undoTime = sellTime + 10000;
    const undoResult = undoSell(testData, state, undoTime);

    expect(undoResult.ok).toBe(true);
    if (!undoResult.ok) return;
    expect(undoResult.state.lastSale).toBeNull();
  });

  it('rejects when coins were spent', () => {
    let state = stateWith({ 0: 'wheat-stalk' });
    const sellTime = 1000;

    const sellResult = sellItem(testData, state, 0, sellTime);
    expect(sellResult.ok).toBe(true);
    if (!sellResult.ok) return;
    state = sellResult.state;

    // Set coins to be exactly the amount needed, then spend them
    state = { ...state, coins: 1 }; // Need 1 coin to undo wheat-stalk
    state = { ...state, coins: 0 }; // Spend the coin

    const undoResult = undoSell(testData, state, sellTime + 5000);

    expect(undoResult.ok).toBe(false);
    if (undoResult.ok) return;
    expect(undoResult.reason).toBe('notEnoughCoins');
  });

  it('places item at original cell if empty', () => {
    let state = stateWith({ 0: 'wheat-stalk', 1: 'milk-splash' });
    const sellTime = 1000;

    const sellResult = sellItem(testData, state, 0, sellTime);
    expect(sellResult.ok).toBe(true);
    if (!sellResult.ok) return;
    state = sellResult.state;

    const undoResult = undoSell(testData, state, sellTime + 5000);

    expect(undoResult.ok).toBe(true);
    if (!undoResult.ok) return;
    expect(undoResult.state.board.cells[0]?.kind).toBe('item');
    expect(undoResult.events[0]?.type).toBe('saleUndone');
    if (undoResult.events[0]?.type === 'saleUndone') {
      expect(undoResult.events[0].cell).toBe(0);
    }
  });

  it('places item at nearest empty when original is occupied', () => {
    // Create a board where cell 0 is empty and surrounded by occupied cells
    // For simplicity, fill most cells and leave one empty nearby
    let state = stateWith({
      0: 'wheat-stalk',
      1: 'milk-splash',
      2: 'egg',
    });
    const sellTime = 1000;

    const sellResult = sellItem(testData, state, 0, sellTime);
    expect(sellResult.ok).toBe(true);
    if (!sellResult.ok) return;
    state = sellResult.state;

    // Now place an item at cell 0 so it's not empty
    state = {
      ...state,
      board: {
        ...state.board,
        cells: state.board.cells.map((cell, idx) =>
          idx === 0
            ? {
                kind: 'item' as const,
                item: {
                  itemId: 'custard-cup',
                  cobwebbed: false,
                  generator: null,
                },
              }
            : cell,
        ),
      },
    };

    const undoResult = undoSell(testData, state, sellTime + 5000);

    expect(undoResult.ok).toBe(true);
    if (!undoResult.ok) return;
    // The item should be placed at the nearest empty cell (not cell 0)
    const placedCell = undoResult.events[0];
    expect(placedCell?.type).toBe('saleUndone');
    if (placedCell?.type === 'saleUndone') {
      expect(placedCell.cell).not.toBe(0);
      expect(undoResult.state.board.cells[placedCell.cell]?.kind).toBe('item');
    }
  });

  it('rejects when board is full', () => {
    // Start with an empty state and fill the entire board with items
    let state = stateWith({});

    // Fill every cell with an item (except cell 0 for now)
    state = {
      ...state,
      board: {
        ...state.board,
        cells: state.board.cells.map((_, idx) =>
          idx === 0
            ? {
                kind: 'item' as const,
                item: {
                  itemId: 'wheat-stalk',
                  cobwebbed: false,
                  generator: null,
                },
              }
            : {
                kind: 'item' as const,
                item: {
                  itemId: 'milk-splash',
                  cobwebbed: false,
                  generator: null,
                },
              },
        ),
      },
    };

    const sellTime = 1000;
    const sellResult = sellItem(testData, state, 0, sellTime);
    expect(sellResult.ok).toBe(true);
    if (!sellResult.ok) return;
    let soldState = sellResult.state;

    // Now fill the empty cell 0 with an item so the board is full
    soldState = {
      ...soldState,
      board: {
        ...soldState.board,
        cells: soldState.board.cells.map((cell, idx) =>
          idx === 0
            ? {
                kind: 'item' as const,
                item: { itemId: 'egg', cobwebbed: false, generator: null },
              }
            : cell,
        ),
      },
    };

    const undoResult = undoSell(testData, soldState, sellTime + 5000);

    expect(undoResult.ok).toBe(false);
    if (undoResult.ok) return;
    expect(undoResult.reason).toBe('boardFull');
  });
});
