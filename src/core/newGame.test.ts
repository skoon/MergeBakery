/**
 * Tests for createNewGame (T1.8).
 */

import { describe, it, expect } from 'vitest';
import { loadGameData } from './data';
import { createNewGame } from './newGame';
import type {
  Chain,
  Chapter,
  Customer,
  Economy,
  GameData,
  GeneratorDef,
  Item,
  NewGameConfig,
  OvenDef,
  Recipe,
} from './types';

const ECONOMY: Economy = {
  energy: { cap: 100, regenSec: 120, perTap: 1 },
  xpPerMergeTier: 1,
  levels: [{ level: 1, xpTotal: 0, gems: 0 }],
  pantry: { startSlots: 4, slotCosts: [50, 100] },
  rushGemsPerMinute: 1,
  sellUndoSec: 10,
  goldenWhiskMaxTier: 5,
  orders: {
    maxOpen: 4,
    refillDelaySec: 5,
    regularChancePercent: 40,
    featuredWeight: 3,
    walkIn: {
      minItems: 1,
      maxItems: 2,
      maxTier: 3,
      starsByItemCount: [1, 1],
      coinMultiplier: 2,
      xpPerTier: 1,
    },
    regular: {
      minItems: 2,
      maxItems: 3,
      maxTier: 6,
      starsByItemCount: [2, 2, 3],
      coinMultiplier: 3,
      xpPerTier: 2,
    },
  },
};

const NEW_GAME_CONFIG: NewGameConfig = {
  cols: 7,
  rows: 9,
  locks: [
    ...Array.from({ length: 7 }, (_, i) => ({
      cell: 42 + i,
      lock: 'crate' as const,
    })),
    ...Array.from({ length: 14 }, (_, i) => ({
      cell: 49 + i,
      lock: 'flourSack' as const,
    })),
  ],
  items: [
    { cell: 23, itemId: 'flour-mill-1', cobwebbed: false },
    { cell: 25, itemId: 'dairy-fridge-1', cobwebbed: false },
    { cell: 30, itemId: 'wheat-stalk', cobwebbed: false },
    { cell: 32, itemId: 'milk-splash', cobwebbed: false },
    { cell: 36, itemId: 'wheat-bundle', cobwebbed: true },
    { cell: 40, itemId: 'milk-bottle', cobwebbed: true },
  ],
  ovens: ['toaster-oven'],
  coins: 50,
  gems: 10,
  chapterId: 'chapter1',
  unlockedCustomers: [],
};

const GENERATORS = new Map<string, GeneratorDef>([
  [
    'flour-mill-1',
    {
      itemId: 'flour-mill-1',
      spawnTable: [{ itemId: 'wheat-stalk', weight: 100 }],
      charges: 12,
      cooldownSec: 300,
    },
  ],
  [
    'dairy-fridge-1',
    {
      itemId: 'dairy-fridge-1',
      spawnTable: [{ itemId: 'milk-splash', weight: 100 }],
      charges: 12,
      cooldownSec: 300,
    },
  ],
]);

const OVENS = new Map<string, OvenDef>([
  [
    'toaster-oven',
    {
      id: 'toaster-oven',
      name: 'Toaster Oven',
      tier: 1,
      slots: 1,
      bakeTimeMultiplier: 1,
      spriteKey: 'toaster-oven',
    },
  ],
]);

const ITEMS = new Map<string, Item>([
  [
    'wheat-stalk',
    {
      id: 'wheat-stalk',
      name: 'Wheat stalk',
      chainId: 'flour',
      tier: 1,
      spriteKey: 'wheat-stalk',
      sellValue: 1,
      note: null,
      collectReward: null,
    },
  ],
]);

function makeGameData(overrides: Partial<GameData> = {}): GameData {
  return {
    items: ITEMS,
    chains: new Map<string, Chain>(),
    chainItems: new Map(),
    generators: GENERATORS,
    rareDrops: { chancePercent: 0, table: [] },
    recipes: new Map<string, Recipe>(),
    ovens: OVENS,
    customers: new Map<string, Customer>(),
    chapters: new Map<string, Chapter>(),
    economy: ECONOMY,
    newGame: NEW_GAME_CONFIG,
    shop: new Map(),
    ...overrides,
  };
}

describe('createNewGame', () => {
  it('has 63 cells (7 x 9)', () => {
    const state = createNewGame(makeGameData(), 1, 1000);
    expect(state.board.cols).toBe(7);
    expect(state.board.rows).toBe(9);
    expect(state.board.cells).toHaveLength(63);
  });

  it('places the starting generators at 23 and 25 with full charges', () => {
    const state = createNewGame(makeGameData(), 1, 1000);
    const millCell = state.board.cells[23];
    const fridgeCell = state.board.cells[25];

    if (millCell?.kind !== 'item') {
      throw new Error('expected cell 23 to hold an item');
    }
    expect(millCell.item.itemId).toBe('flour-mill-1');
    expect(millCell.item.generator).toEqual({
      charges: 12,
      cooldownEndsAt: null,
    });

    if (fridgeCell?.kind !== 'item') {
      throw new Error('expected cell 25 to hold an item');
    }
    expect(fridgeCell.item.itemId).toBe('dairy-fridge-1');
    expect(fridgeCell.item.generator).toEqual({
      charges: 12,
      cooldownEndsAt: null,
    });
  });

  it('locks cells 42-62 with the right lock kinds', () => {
    const state = createNewGame(makeGameData(), 1, 1000);
    for (let cell = 42; cell <= 48; cell++) {
      expect(state.board.cells[cell]).toEqual({
        kind: 'locked',
        lock: 'crate',
      });
    }
    for (let cell = 49; cell <= 62; cell++) {
      expect(state.board.cells[cell]).toEqual({
        kind: 'locked',
        lock: 'flourSack',
      });
    }
  });

  it('marks the configured items as cobwebbed or not', () => {
    const state = createNewGame(makeGameData(), 1, 1000);
    const cobwebbed = [36, 40];
    const notCobwebbed = [23, 25, 30, 32];

    for (const cell of cobwebbed) {
      const boardCell = state.board.cells[cell];
      if (boardCell?.kind !== 'item') {
        throw new Error(`expected cell ${cell} to hold an item`);
      }
      expect(boardCell.item.cobwebbed).toBe(true);
    }

    for (const cell of notCobwebbed) {
      const boardCell = state.board.cells[cell];
      if (boardCell?.kind !== 'item') {
        throw new Error(`expected cell ${cell} to hold an item`);
      }
      expect(boardCell.item.cobwebbed).toBe(false);
    }
  });

  it('starts with full energy', () => {
    const state = createNewGame(makeGameData(), 1, 1000);
    expect(state.energy).toEqual({ value: 100, updatedAt: 1000 });
  });

  it('gives each configured oven empty slots matching its slot count', () => {
    const state = createNewGame(makeGameData(), 1, 1000);
    expect(state.kitchen.ovens).toEqual([
      { ovenId: 'toaster-oven', slots: [null] },
    ]);
  });

  it('sets the remaining top-level fields from the config', () => {
    const state = createNewGame(makeGameData(), 7, 1000);
    expect(state.coins).toBe(50);
    expect(state.gems).toBe(10);
    expect(state.stars).toBe(0);
    expect(state.xp).toBe(0);
    expect(state.level).toBe(1);
    expect(state.orders).toEqual([]);
    expect(state.nextOrderAt).toBe(1000);
    expect(state.pantry).toEqual({ capacity: 4, items: [] });
    expect(state.lastSale).toBeNull();
    expect(state.pendingDiscoveries).toEqual([]);
    expect(state.rewardedChains).toEqual([]);
    expect(state.chapterId).toBe('chapter1');
    expect(state.unlockedCustomers).toEqual([]);
    expect(state.completedTasks).toEqual([]);
    expect(state.tutorialStep).toBe('firstTap');
    expect(state.rngState).toBe(7 >>> 0);
    expect(state.nextOrderId).toBe(1);
  });

  it('deduplicates discovered items, in cell order', () => {
    const state = createNewGame(makeGameData(), 1, 1000);
    expect(state.discovered).toEqual([
      'flour-mill-1',
      'dairy-fridge-1',
      'wheat-stalk',
      'milk-splash',
      'wheat-bundle',
      'milk-bottle',
    ]);
  });

  it('the same seed gives an equal state', () => {
    const state1 = createNewGame(makeGameData(), 42, 5000);
    const state2 = createNewGame(makeGameData(), 42, 5000);
    expect(state1).toEqual(state2);
  });
});

describe('createNewGame with the real data', () => {
  const data = loadGameData();
  const state = createNewGame(data, 1, 1000);

  it('builds a 7×9 board with 21 locked cells and both generators charged', () => {
    expect(state.board.cells).toHaveLength(63);
    expect(state.board.cells.filter((c) => c.kind === 'locked')).toHaveLength(
      21,
    );
    for (const [cell, itemId] of [
      [23, 'flour-mill-1'],
      [25, 'dairy-fridge-1'],
    ] as const) {
      expect(state.board.cells[cell]).toEqual({
        kind: 'item',
        item: {
          itemId,
          cobwebbed: false,
          generator: {
            charges: data.generators.get(itemId)?.charges,
            cooldownEndsAt: null,
          },
        },
      });
    }
  });

  it('starts with one empty Toaster Oven slot and a 4-slot Pantry', () => {
    expect(state.kitchen.ovens).toEqual([
      { ovenId: 'toaster-oven', slots: [null] },
    ]);
    expect(state.pantry).toEqual({ capacity: 4, items: [] });
  });
});
