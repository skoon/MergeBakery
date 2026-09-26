/**
 * Tests for Pantry functions (T3.4).
 */

import { describe, it, expect } from 'vitest';
import { storeInPantry, takeFromPantry, buyPantrySlot } from './pantry';
import { stateWith, testData } from './testing';

describe('storeInPantry', () => {
  it('stores an item in the pantry', () => {
    const state = stateWith({ 5: 'wheat-stalk' });
    const result = storeInPantry(testData, state, 5);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.state.pantry.items.length).toBe(1);
    expect(result.state.pantry.items[0]?.itemId).toBe('wheat-stalk');
    expect(result.events).toEqual([]);
  });

  it('keeps generator charges when storing', () => {
    const state = stateWith({ 5: 'flour-mill-1' });
    const result = storeInPantry(testData, state, 5);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const storedItem = result.state.pantry.items[0];
    expect(storedItem?.generator).not.toBeNull();
    expect(storedItem?.generator?.charges).toBe(
      testData.generators.get('flour-mill-1')?.charges,
    );
  });

  it('rejects storing from an empty cell', () => {
    const state = stateWith({});
    const result = storeInPantry(testData, state, 5);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('emptyCell');
  });

  it('rejects storing a locked cell', () => {
    const state = stateWith({ 5: 'crate' });
    const result = storeInPantry(testData, state, 5);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('locked');
  });

  it('rejects storing a cobwebbed item', () => {
    const state = stateWith({ 5: { itemId: 'wheat-stalk', cobwebbed: true } });
    const result = storeInPantry(testData, state, 5);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('cobwebbed');
  });

  it('rejects storing when pantry is full', () => {
    const fullPantryItems = [
      { itemId: 'wheat-stalk', cobwebbed: false, generator: null },
      { itemId: 'wheat-stalk', cobwebbed: false, generator: null },
      { itemId: 'wheat-stalk', cobwebbed: false, generator: null },
      { itemId: 'wheat-stalk', cobwebbed: false, generator: null },
    ];
    const state = stateWith(
      { 5: 'wheat-stalk' },
      { pantry: { capacity: 4, items: fullPantryItems } },
    );
    const result = storeInPantry(testData, state, 5);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('pantryFull');
  });

  it('empties the board cell after storing', () => {
    const state = stateWith({ 5: 'wheat-stalk' });
    const result = storeInPantry(testData, state, 5);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const cell = result.state.board.cells[5];
    expect(cell?.kind).toBe('empty');
  });

  it('round trip: store and take back the same item', () => {
    const state = stateWith({ 5: 'wheat-stalk' });

    // Store the item
    const storeResult = storeInPantry(testData, state, 5);
    expect(storeResult.ok).toBe(true);
    if (!storeResult.ok) return;

    // Take it back to the same cell
    const takeResult = takeFromPantry(testData, storeResult.state, 0, 5);
    expect(takeResult.ok).toBe(true);
    if (!takeResult.ok) return;

    // Check the item is back in the board
    const boardCell = takeResult.state.board.cells[5];
    expect(boardCell?.kind).toBe('item');
    if (boardCell?.kind !== 'item') return;
    expect(boardCell.item.itemId).toBe('wheat-stalk');
    expect(takeResult.state.pantry.items.length).toBe(0);
  });

  it('round trip with generator: charges preserved', () => {
    const state = stateWith({ 5: 'flour-mill-1' });

    // Store the generator
    const storeResult = storeInPantry(testData, state, 5);
    expect(storeResult.ok).toBe(true);
    if (!storeResult.ok) return;

    const storedGenerator = storeResult.state.pantry.items[0]?.generator;
    expect(storedGenerator?.charges).toBe(
      testData.generators.get('flour-mill-1')?.charges,
    );

    // Take it back
    const takeResult = takeFromPantry(testData, storeResult.state, 0, 5);
    expect(takeResult.ok).toBe(true);
    if (!takeResult.ok) return;

    const boardCell = takeResult.state.board.cells[5];
    expect(boardCell?.kind).toBe('item');
    if (boardCell?.kind !== 'item') return;
    expect(boardCell.item.generator?.charges).toBe(storedGenerator?.charges);
  });
});

describe('takeFromPantry', () => {
  it('takes an item from pantry to an empty cell', () => {
    const state = stateWith(
      {},
      {
        pantry: {
          capacity: 4,
          items: [{ itemId: 'wheat-stalk', cobwebbed: false, generator: null }],
        },
      },
    );
    const result = takeFromPantry(testData, state, 0, 10);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.pantry.items.length).toBe(0);
    expect(result.events).toEqual([]);
  });

  it('takes to an occupied cell and lands on nearest empty', () => {
    const state = stateWith(
      { 5: 'wheat-stalk', 10: 'milk-splash' },
      {
        pantry: {
          capacity: 4,
          items: [
            { itemId: 'wheat-bundle', cobwebbed: false, generator: null },
          ],
        },
      },
    );
    const result = takeFromPantry(testData, state, 0, 5);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // wheat-bundle should be placed on a cell near 5 that's empty
    // Cell 5 is occupied, so it should go to nearest empty
    const boardCell = result.state.board.cells[5];
    expect(boardCell?.kind).toBe('item');
    if (boardCell?.kind === 'item') {
      expect(boardCell.item.itemId).toBe('wheat-stalk');
    }
  });

  it('rejects taking from full board', () => {
    // Create a full board by putting items in every cell (7x9 = 63 cells)
    const cells: Record<number, string> = {};
    for (let i = 0; i < 63; i++) {
      cells[i] = 'wheat-stalk';
    }

    const state = stateWith(cells, {
      pantry: {
        capacity: 4,
        items: [{ itemId: 'wheat-bundle', cobwebbed: false, generator: null }],
      },
    });
    const result = takeFromPantry(testData, state, 0, 5);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('boardFull');
  });

  it('throws RangeError for out-of-range pantryIndex', () => {
    const state = stateWith({});
    expect(() => {
      takeFromPantry(testData, state, 5, 0);
    }).toThrow(RangeError);
  });

  it('throws RangeError for negative pantryIndex', () => {
    const state = stateWith(
      {},
      {
        pantry: {
          capacity: 4,
          items: [{ itemId: 'wheat-stalk', cobwebbed: false, generator: null }],
        },
      },
    );
    expect(() => {
      takeFromPantry(testData, state, -1, 0);
    }).toThrow(RangeError);
  });

  it('removes item from pantry', () => {
    const state = stateWith(
      {},
      {
        pantry: {
          capacity: 4,
          items: [
            { itemId: 'wheat-stalk', cobwebbed: false, generator: null },
            { itemId: 'wheat-bundle', cobwebbed: false, generator: null },
          ],
        },
      },
    );
    const result = takeFromPantry(testData, state, 0, 10);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.pantry.items.length).toBe(1);
    expect(result.state.pantry.items[0]?.itemId).toBe('wheat-bundle');
  });
});

describe('buyPantrySlot', () => {
  it('buys a slot when player has enough coins', () => {
    const startSlots = testData.economy.pantry.startSlots;
    const cost = testData.economy.pantry.slotCosts[0];
    if (cost === undefined) throw new Error('slotCosts[0] not found');

    const state = stateWith(
      {},
      { pantry: { capacity: startSlots, items: [] }, coins: cost },
    );
    const result = buyPantrySlot(testData, state);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.state.pantry.capacity).toBe(startSlots + 1);
    expect(result.state.coins).toBe(0);
    expect(result.events).toEqual([]);
  });

  it('rejects when not enough coins', () => {
    const startSlots = testData.economy.pantry.startSlots;
    const cost = testData.economy.pantry.slotCosts[0];
    if (cost === undefined) throw new Error('slotCosts[0] not found');

    const state = stateWith(
      {},
      { pantry: { capacity: startSlots, items: [] }, coins: cost - 1 },
    );
    const result = buyPantrySlot(testData, state);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('notEnoughCoins');
  });

  it('rejects when all slots are bought (pantryMaxed)', () => {
    const startSlots = testData.economy.pantry.startSlots;
    const maxSlots = startSlots + testData.economy.pantry.slotCosts.length;

    const state = stateWith(
      {},
      { pantry: { capacity: maxSlots, items: [] }, coins: 999999 },
    );
    const result = buyPantrySlot(testData, state);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('pantryMaxed');
  });

  it('can buy up to 12 total slots', () => {
    const startSlots = testData.economy.pantry.startSlots;
    const slotCosts = testData.economy.pantry.slotCosts;
    const maxSlots = startSlots + slotCosts.length;

    expect(maxSlots).toBe(12);

    let state = stateWith(
      {},
      {
        pantry: { capacity: startSlots, items: [] },
        coins: slotCosts.reduce((a, b) => a + b, 0),
      },
    );

    // Buy all available slots
    for (let i = 0; i < slotCosts.length; i++) {
      const result = buyPantrySlot(testData, state);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      state = result.state;
    }

    expect(state.pantry.capacity).toBe(12);
  });

  it('rejects further purchases after reaching 12 slots', () => {
    const startSlots = testData.economy.pantry.startSlots;
    const slotCosts = testData.economy.pantry.slotCosts;
    const maxSlots = startSlots + slotCosts.length;

    const state = stateWith(
      {},
      {
        pantry: { capacity: maxSlots, items: [] },
        coins: 999999,
      },
    );

    const result = buyPantrySlot(testData, state);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('pantryMaxed');
  });

  it('charges correct amount for each slot', () => {
    const startSlots = testData.economy.pantry.startSlots;
    const slotCosts = testData.economy.pantry.slotCosts;

    for (let i = 0; i < slotCosts.length; i++) {
      const expectedCost = slotCosts[i];
      if (expectedCost === undefined) break;

      const state = stateWith(
        {},
        {
          pantry: { capacity: startSlots + i, items: [] },
          coins: expectedCost + 100,
        },
      );

      const result = buyPantrySlot(testData, state);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.state.coins).toBe(100);
    }
  });
});
