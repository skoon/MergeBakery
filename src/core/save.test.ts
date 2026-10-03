/**
 * Tests for the save format (T4.5).
 */

import { describe, it, expect } from 'vitest';
import { SAVE_VERSION, serializeSave, deserializeSave } from './save';
import { testData, stateWith } from './testing';
import { createNewGame } from './newGame';
import { getCell, setCell } from './board';
import type { Bake, BoardItem, GameState, LastSale, Order } from './types';

function buildBusyState(): GameState {
  let state = stateWith({
    0: { itemId: 'flour-mill-1', cobwebbed: false },
    1: { itemId: 'wheat-bundle', cobwebbed: true },
    2: 'crate',
  });

  // Put the generator at cell 0 on cooldown.
  const generatorCell = getCell(state.board, 0);
  if (generatorCell.kind === 'item') {
    const board = setCell(state.board, 0, {
      kind: 'item',
      item: {
        ...generatorCell.item,
        generator: { charges: 0, cooldownEndsAt: 30_000 },
      },
    });
    state = { ...state, board };
  }

  const pantryItem: BoardItem = {
    itemId: 'milk-bottle',
    cobwebbed: false,
    generator: null,
  };

  const order: Order = {
    id: 1,
    customerId: 'gus',
    wants: ['bread-loaf', 'bread-loaf'],
    reward: { coins: 50, stars: 2, xp: 10 },
  };

  const bake: Bake = {
    recipeId: 'bake-cookie',
    startedAt: 1000,
    endsAt: 61_000,
  };

  const lastSale: LastSale = {
    item: { itemId: 'apple', cobwebbed: false, generator: null },
    cell: 5,
    coins: 4,
    soldAt: 900,
  };

  return {
    ...state,
    pantry: { capacity: state.pantry.capacity, items: [pantryItem] },
    orders: [order],
    nextOrderAt: 5000,
    kitchen: { ovens: [{ ovenId: 'toaster-oven', slots: [bake] }] },
    lastSale,
  };
}

/** Parses a valid serialized save into a plain object for mutation in tests. */
function parseValidSave(
  state: GameState,
  savedAt = 1000,
): Record<string, unknown> {
  return JSON.parse(serializeSave(state, savedAt)) as Record<string, unknown>;
}

describe('serializeSave / deserializeSave round trips', () => {
  it('round trips a new game', () => {
    const state = createNewGame(testData, 1, 0);
    const text = serializeSave(state, 111);

    const result = deserializeSave(testData, text);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.save.version).toBe(SAVE_VERSION);
    expect(result.save.savedAt).toBe(111);
    expect(result.save.state).toEqual(state);
  });

  it('round trips a busy state (pantry, orders, a running bake, lastSale, cobwebbed and locked cells, a cooling-down generator)', () => {
    const state = buildBusyState();
    const text = serializeSave(state, 222);

    const result = deserializeSave(testData, text);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.save.state).toEqual(state);
  });
});

describe('deserializeSave error cases', () => {
  it('rejects text that is not JSON', () => {
    const result = deserializeSave(testData, '{not json');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/json/i);
  });

  it('rejects a JSON value that is not an object', () => {
    const result = deserializeSave(testData, JSON.stringify([1, 2, 3]));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/version/i);
  });

  it('rejects an object missing a numeric version', () => {
    const result = deserializeSave(
      testData,
      JSON.stringify({ savedAt: 1, state: {} }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/version/i);
  });

  it('rejects an object with a non-numeric version', () => {
    const result = deserializeSave(
      testData,
      JSON.stringify({ version: '1', savedAt: 1, state: {} }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/version/i);
  });

  it('rejects a version newer than SAVE_VERSION', () => {
    const state = createNewGame(testData, 1, 0);
    const parsed = parseValidSave(state);
    parsed['version'] = SAVE_VERSION + 1;

    const result = deserializeSave(testData, JSON.stringify(parsed));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/newer/i);
  });

  it('rejects a save whose migration throws (T4.6)', () => {
    const state = createNewGame(testData, 1, 0);
    const parsed = parseValidSave(state);
    // Older than anything MIGRATIONS knows how to upgrade from.
    parsed['version'] = 0;

    const result = deserializeSave(testData, JSON.stringify(parsed));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/no migration from version 0 to 1/);
  });

  it('rejects a state that does not match GameState exactly (missing field)', () => {
    const state = createNewGame(testData, 1, 0);
    const parsed = parseValidSave(state);
    const stateObj = parsed['state'] as Record<string, unknown>;
    delete stateObj['coins'];

    const result = deserializeSave(testData, JSON.stringify(parsed));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/GameState/);
  });

  it('rejects a state with an extra, unknown field', () => {
    const state = createNewGame(testData, 1, 0);
    const parsed = parseValidSave(state);
    const stateObj = parsed['state'] as Record<string, unknown>;
    stateObj['bogusField'] = true;

    const result = deserializeSave(testData, JSON.stringify(parsed));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/GameState/);
  });

  it('rejects a state with a field of the wrong type', () => {
    const state = createNewGame(testData, 1, 0);
    const parsed = parseValidSave(state);
    const stateObj = parsed['state'] as Record<string, unknown>;
    stateObj['coins'] = 'not-a-number';

    const result = deserializeSave(testData, JSON.stringify(parsed));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/GameState/);
  });

  it('rejects an unknown item id', () => {
    const state = createNewGame(testData, 1, 0);
    const parsed = parseValidSave(state);
    const stateObj = parsed['state'] as Record<string, unknown>;
    stateObj['discovered'] = ['not-a-real-item'];

    const result = deserializeSave(testData, JSON.stringify(parsed));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/unknown item/);
  });

  it('rejects an unknown oven id', () => {
    const state = createNewGame(testData, 1, 0);
    const parsed = parseValidSave(state);
    const stateObj = parsed['state'] as Record<string, unknown>;
    stateObj['kitchen'] = { ovens: [{ ovenId: 'not-a-real-oven', slots: [] }] };

    const result = deserializeSave(testData, JSON.stringify(parsed));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/unknown oven/);
  });

  it('rejects an unknown recipe id', () => {
    const state = createNewGame(testData, 1, 0);
    const parsed = parseValidSave(state);
    const stateObj = parsed['state'] as Record<string, unknown>;
    stateObj['kitchen'] = {
      ovens: [
        {
          ovenId: 'toaster-oven',
          slots: [
            { recipeId: 'not-a-real-recipe', startedAt: 0, endsAt: 1000 },
          ],
        },
      ],
    };

    const result = deserializeSave(testData, JSON.stringify(parsed));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/unknown recipe/);
  });

  it('rejects an unknown customer id', () => {
    const state = createNewGame(testData, 1, 0);
    const parsed = parseValidSave(state);
    const stateObj = parsed['state'] as Record<string, unknown>;
    stateObj['unlockedCustomers'] = ['not-a-real-customer'];

    const result = deserializeSave(testData, JSON.stringify(parsed));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/unknown customer/);
  });

  it('rejects an unknown chapter id', () => {
    const state = createNewGame(testData, 1, 0);
    const parsed = parseValidSave(state);
    const stateObj = parsed['state'] as Record<string, unknown>;
    stateObj['chapterId'] = 'not-a-real-chapter';

    const result = deserializeSave(testData, JSON.stringify(parsed));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/unknown chapter/);
  });

  it('rejects a board whose cols/rows differ from data.newGame', () => {
    const state = createNewGame(testData, 1, 0);
    const parsed = parseValidSave(state);
    const stateObj = parsed['state'] as Record<string, unknown>;
    const boardObj = stateObj['board'] as Record<string, unknown>;
    boardObj['cols'] = (boardObj['cols'] as number) + 1;

    const result = deserializeSave(testData, JSON.stringify(parsed));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/board/);
  });

  it('rejects a board whose cell count differs from data.newGame', () => {
    const state = createNewGame(testData, 1, 0);
    const parsed = parseValidSave(state);
    const stateObj = parsed['state'] as Record<string, unknown>;
    const boardObj = stateObj['board'] as Record<string, unknown>;
    const cells = boardObj['cells'] as unknown[];
    boardObj['cells'] = cells.slice(0, cells.length - 1);

    const result = deserializeSave(testData, JSON.stringify(parsed));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/board/);
  });
});

describe('loading a version 1 save (T8.1)', () => {
  it('migrates it to the current version with no event running', () => {
    const state = createNewGame(testData, 1, 0);
    const file = JSON.parse(serializeSave(state, 5000)) as {
      version: number;
      state: Record<string, unknown>;
    };
    // What a v1 file looked like: no event fields at all.
    for (const key of [
      'event',
      'nextEventAt',
      'eventResult',
      'trophies',
      'reputation',
      'staff',
    ]) {
      delete file.state[key];
    }
    file.version = 1;

    const loaded = deserializeSave(testData, JSON.stringify(file));
    if (!loaded.ok) throw new Error(loaded.error);
    expect(loaded.save.version).toBe(SAVE_VERSION);
    expect(loaded.save.state).toEqual(state);
  });
});
