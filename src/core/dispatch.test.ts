/**
 * Tests for the dispatch skeleton (T1.8).
 */

import { describe, it, expect } from 'vitest';
import { createDispatch, dispatch } from './dispatch';
import type { Handlers } from './dispatch';
import { createNewGame } from './newGame';
import { createRng } from './rng';
import { stateWith, testData } from './testing';
import type {
  Action,
  ActionResult,
  ActionType,
  GameData,
  GameState,
} from './types';

const NOW = 1000;

function makeGameData(): GameData {
  return {
    items: new Map(),
    chains: new Map(),
    chainItems: new Map(),
    generators: new Map(),
    rareDrops: { chancePercent: 0, table: [] },
    recipes: new Map(),
    ovens: new Map(),
    customers: new Map(),
    chapters: new Map(),
    economy: {
      energy: { cap: 100, regenSec: 120, perTap: 1 },
      xpPerMergeTier: 1,
      levels: [{ level: 1, xpTotal: 0, gems: 0 }],
      pantry: { startSlots: 4, slotCosts: [] },
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
    },
    newGame: {
      cols: 1,
      rows: 1,
      locks: [],
      items: [],
      ovens: [],
      coins: 0,
      gems: 0,
      chapterId: 'chapter1',
      unlockedCustomers: [],
    },
  };
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    board: { cols: 1, rows: 1, cells: [{ kind: 'empty' }] },
    pantry: { capacity: 4, items: [] },
    energy: { value: 100, updatedAt: NOW },
    coins: 0,
    stars: 0,
    gems: 0,
    xp: 0,
    level: 1,
    orders: [],
    nextOrderAt: null,
    kitchen: { ovens: [] },
    lastSale: null,
    discovered: [],
    pendingDiscoveries: [],
    rewardedChains: [],
    chapterId: 'chapter1',
    completedTasks: [],
    unlockedCustomers: [],
    tutorialStep: 'firstTap',
    rngState: 0,
    nextOrderId: 1,
    ...overrides,
  };
}

/** A Handlers object where every action type throws if actually called. */
function makeThrowingHandlers(): Handlers {
  const notCalled = (): never => {
    throw new Error('unexpected handler call');
  };

  return {
    drop: notCalled,
    tapGenerator: notCalled,
    collectBonus: notCalled,
    sell: notCalled,
    undoSell: notCalled,
    storeInPantry: notCalled,
    takeFromPantry: notCalled,
    buyPantrySlot: notCalled,
    deliverOrder: notCalled,
    loadRecipe: notCalled,
    collectBake: notCalled,
    rushBake: notCalled,
    mergeOvens: notCalled,
    completeTask: notCalled,
    dismissDiscovery: notCalled,
    setTutorialStep: notCalled,
    tick: notCalled,
  };
}

const SAMPLE_ACTIONS: readonly Action[] = [
  { type: 'drop', from: 0, to: 1, now: NOW },
  { type: 'tapGenerator', cell: 0, now: NOW },
  { type: 'collectBonus', cell: 0, now: NOW },
  { type: 'sell', cell: 0, now: NOW },
  { type: 'undoSell', now: NOW },
  { type: 'storeInPantry', cell: 0, now: NOW },
  { type: 'takeFromPantry', pantryIndex: 0, to: 0, now: NOW },
  { type: 'buyPantrySlot', now: NOW },
  { type: 'deliverOrder', orderId: 1, now: NOW },
  {
    type: 'loadRecipe',
    slot: { oven: 0, slot: 0 },
    recipeId: 'bake-cookie',
    cells: [0],
    now: NOW,
  },
  { type: 'collectBake', slot: { oven: 0, slot: 0 }, now: NOW },
  { type: 'rushBake', slot: { oven: 0, slot: 0 }, now: NOW },
  { type: 'mergeOvens', from: 0, to: 1, now: NOW },
  { type: 'completeTask', taskId: 'task-1', now: NOW },
  { type: 'dismissDiscovery', itemId: 'wheat-stalk', now: NOW },
  { type: 'setTutorialStep', step: 'firstMerge', now: NOW },
  { type: 'tick', now: NOW },
];

/** Action types whose handlers are connected to core functions. */
const WIRED: ReadonlySet<ActionType> = new Set<ActionType>([
  'drop',
  'tapGenerator',
  'collectBonus',
  'sell',
  'undoSell',
  'storeInPantry',
  'takeFromPantry',
  'buyPantrySlot',
  'deliverOrder',
  'loadRecipe',
  'collectBake',
  'rushBake',
  'mergeOvens',
  'tick',
]);

describe('dispatch (stub)', () => {
  it('covers all 17 action types', () => {
    expect(SAMPLE_ACTIONS).toHaveLength(17);
  });

  it.each(
    SAMPLE_ACTIONS.filter((action) => !WIRED.has(action.type)).map(
      (action) => ({ action }),
    ),
  )('throws "Not implemented: $action.type"', ({ action }) => {
    const data = makeGameData();
    const state = makeState();
    expect(() => dispatch(data, state, action)).toThrow(
      `Not implemented: ${action.type}`,
    );
  });
});

describe('createDispatch', () => {
  it('stores the advanced rng state when a handler succeeds', () => {
    const handlers: Handlers = {
      ...makeThrowingHandlers(),
      tick: (_data, state, _action, rng) => {
        rng.next();
        return { ok: true, state, events: [] };
      },
    };
    const customDispatch = createDispatch(handlers);

    const data = makeGameData();
    const state = makeState({ rngState: 12345 });
    const result = customDispatch(data, state, { type: 'tick', now: NOW });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('expected ok: true');
    }

    const expectedRng = createRng(12345);
    expectedRng.next();
    expect(result.state.rngState).toBe(expectedRng.getState());
    expect(result.state.rngState).not.toBe(12345);
  });

  it('returns an ok: false result unchanged', () => {
    const rejectResult: ActionResult = { ok: false, reason: 'locked' };
    const handlers: Handlers = {
      ...makeThrowingHandlers(),
      drop: () => rejectResult,
    };
    const customDispatch = createDispatch(handlers);

    const data = makeGameData();
    const state = makeState({ rngState: 999 });
    const result = customDispatch(data, state, {
      type: 'drop',
      from: 0,
      to: 1,
      now: NOW,
    });

    expect(result).toBe(rejectResult);
  });
});

function expectOk(result: ActionResult): GameState {
  if (!result.ok) {
    throw new Error(`expected ok, got rejection: ${result.reason}`);
  }
  return result.state;
}

describe('dispatch (wired)', () => {
  it('stores a board item in the Pantry and takes it back out', () => {
    const start = stateWith({ 10: 'wheat-stalk' });
    const stored = expectOk(
      dispatch(testData, start, { type: 'storeInPantry', cell: 10, now: NOW }),
    );
    expect(stored.board.cells[10]).toEqual({ kind: 'empty' });
    expect(stored.pantry.items.map((item) => item.itemId)).toEqual([
      'wheat-stalk',
    ]);

    const taken = expectOk(
      dispatch(testData, stored, {
        type: 'takeFromPantry',
        pantryIndex: 0,
        to: 20,
        now: NOW,
      }),
    );
    expect(taken.pantry.items).toEqual([]);
    expect(taken.board.cells[20]).toMatchObject({
      kind: 'item',
      item: { itemId: 'wheat-stalk' },
    });
  });

  it('buys a Pantry slot', () => {
    const start = stateWith({}, { coins: 1000 });
    const next = expectOk(
      dispatch(testData, start, { type: 'buyPantrySlot', now: NOW }),
    );
    expect(next.pantry.capacity).toBe(start.pantry.capacity + 1);
    expect(next.coins).toBeLessThan(1000);
  });

  it('taps a generator, spending energy and advancing the stored rng state', () => {
    const start = stateWith({ 23: 'flour-mill-1' });
    const result = dispatch(testData, start, {
      type: 'tapGenerator',
      cell: 23,
      now: NOW,
    });
    const next = expectOk(result);
    expect(result.ok && result.events[0]).toMatchObject({ type: 'spawned' });
    expect(next.energy.value).toBe(start.energy.value - 1);
    expect(next.rngState).not.toBe(start.rngState);
  });

  it('collects a coin pouch', () => {
    const start = stateWith({ 5: 'coin-pouch' });
    const next = expectOk(
      dispatch(testData, start, { type: 'collectBonus', cell: 5, now: NOW }),
    );
    expect(next.coins).toBe(start.coins + 25);
    expect(next.board.cells[5]).toEqual({ kind: 'empty' });
  });

  it('merges two matching items with a drop', () => {
    const start = stateWith({ 10: 'wheat-stalk', 11: 'wheat-stalk' });
    const result = dispatch(testData, start, {
      type: 'drop',
      from: 10,
      to: 11,
      now: NOW,
    });
    const next = expectOk(result);
    expect(result.ok && result.events[0]).toMatchObject({ type: 'merged' });
    expect(next.board.cells[10]).toEqual({ kind: 'empty' });
    expect(next.board.cells[11]).toMatchObject({
      kind: 'item',
      item: { itemId: 'wheat-bundle' },
    });
  });

  it('fills the counter with orders on the first tick', () => {
    const start = createNewGame(testData, 1, NOW);
    const result = dispatch(testData, start, { type: 'tick', now: NOW });
    const next = expectOk(result);
    const maxOpen = testData.economy.orders.maxOpen;
    expect(next.orders).toHaveLength(maxOpen);
    expect(next.nextOrderAt).toBeNull();
    expect(result.ok && result.events).toHaveLength(maxOpen);
  });

  it('delivers an order whose items are on the board', () => {
    const start = stateWith(
      { 0: 'wheat-stalk' },
      {
        orders: [
          {
            id: 7,
            customerId: 'walkin-hiker',
            wants: ['wheat-stalk'],
            reward: { coins: 5, stars: 1, xp: 1 },
          },
        ],
      },
    );
    const next = expectOk(
      dispatch(testData, start, { type: 'deliverOrder', orderId: 7, now: NOW }),
    );
    expect(next.orders).toEqual([]);
    expect(next.coins).toBe(start.coins + 5);
    expect(next.stars).toBe(start.stars + 1);
  });

  it('sells an item and undoes the sale', () => {
    const start = stateWith({ 12: 'wheat-bundle' });
    const sold = expectOk(
      dispatch(testData, start, { type: 'sell', cell: 12, now: NOW }),
    );
    expect(sold.board.cells[12]).toEqual({ kind: 'empty' });
    expect(sold.coins).toBe(start.coins + 2);

    const undone = expectOk(
      dispatch(testData, sold, { type: 'undoSell', now: NOW + 1000 }),
    );
    expect(undone.coins).toBe(start.coins);
    expect(undone.board.cells[12]).toMatchObject({
      kind: 'item',
      item: { itemId: 'wheat-bundle' },
    });
  });

  it('loads a recipe into the Toaster Oven', () => {
    const start = stateWith({ 3: 'dough-ball', 4: 'butter-block' });
    const next = expectOk(
      dispatch(testData, start, {
        type: 'loadRecipe',
        slot: { oven: 0, slot: 0 },
        recipeId: 'bake-croissant',
        cells: [3, 4],
        now: NOW,
      }),
    );
    expect(next.board.cells[3]).toEqual({ kind: 'empty' });
    expect(next.kitchen.ovens[0]?.slots[0]).toMatchObject({
      recipeId: 'bake-croissant',
      startedAt: NOW,
    });
  });
});
