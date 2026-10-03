/**
 * Tests for the UI store (T2.8).
 */

import { describe, expect, it, vi } from 'vitest';
import { createStore } from './store';
import type {
  Action,
  ActionResult,
  Dispatch,
  GameData,
  GameEvent,
  GameState,
} from '../core/types';

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
    shop: new Map(),
    events: new Map(),
  };
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    board: { cols: 1, rows: 1, cells: [{ kind: 'empty' }] },
    pantry: { capacity: 4, items: [] },
    energy: { value: 100, updatedAt: 0 },
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
    event: null,
    nextEventAt: null,
    eventResult: null,
    trophies: [],
    ...overrides,
  };
}

/** A Dispatch that always returns the given result, recording the action it received. */
function makeFakeDispatch(result: ActionResult): {
  dispatch: Dispatch;
  calls: Action[];
} {
  const calls: Action[] = [];
  const dispatch: Dispatch = (_data, _state, action) => {
    calls.push(action);
    return result;
  };
  return { dispatch, calls };
}

describe('createStore', () => {
  it('adds now = clock() to the dispatched action', () => {
    const data = makeGameData();
    const initial = makeState();
    const { dispatch, calls } = makeFakeDispatch({
      ok: true,
      state: initial,
      events: [],
    });
    const clock = vi.fn(() => 12345);
    const store = createStore(data, initial, dispatch, clock);

    store.dispatch({ type: 'tick' });

    expect(clock).toHaveBeenCalledTimes(1);
    expect(calls).toEqual([{ type: 'tick', now: 12345 }]);
  });

  it("keeps the state on a rejection, and doesn't notify listeners", () => {
    const data = makeGameData();
    const initial = makeState();
    const rejection: ActionResult = { ok: false, reason: 'locked' };
    const { dispatch } = makeFakeDispatch(rejection);
    const store = createStore(data, initial, dispatch, () => 0);

    const listener = vi.fn();
    store.subscribe(listener);

    const result = store.dispatch({ type: 'drop', from: 0, to: 0 });

    expect(result).toBe(rejection);
    expect(store.getState()).toBe(initial);
    expect(listener).not.toHaveBeenCalled();
  });

  it('does not notify when the returned state is unchanged and there are no events', () => {
    const data = makeGameData();
    const initial = makeState();
    // The fake dispatch returns the exact same state object with no events.
    const { dispatch } = makeFakeDispatch({
      ok: true,
      state: initial,
      events: [],
    });
    const store = createStore(data, initial, dispatch, () => 0);

    const listener = vi.fn();
    store.subscribe(listener);

    store.dispatch({ type: 'tick' });

    expect(store.getState()).toBe(initial);
    expect(listener).not.toHaveBeenCalled();
  });

  it('notifies when the state object changed, even with no events', () => {
    const data = makeGameData();
    const initial = makeState();
    const next = makeState({ coins: 5 });
    const { dispatch } = makeFakeDispatch({
      ok: true,
      state: next,
      events: [],
    });
    const store = createStore(data, initial, dispatch, () => 0);

    const listener = vi.fn();
    store.subscribe(listener);

    store.dispatch({ type: 'tick' });

    expect(store.getState()).toBe(next);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(next, []);
  });

  it('notifies when events are non-empty, even if the state object is unchanged', () => {
    const data = makeGameData();
    const initial = makeState();
    const events: GameEvent[] = [
      {
        type: 'collected',
        itemId: 'coin-pouch',
        reward: { energy: 0, coins: 1 },
      },
    ];
    const { dispatch } = makeFakeDispatch({ ok: true, state: initial, events });
    const store = createStore(data, initial, dispatch, () => 0);

    const listener = vi.fn();
    store.subscribe(listener);

    store.dispatch({ type: 'tick' });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(initial, events);
  });

  it('calls listeners in subscription order', () => {
    const data = makeGameData();
    const initial = makeState();
    const next = makeState({ coins: 1 });
    const { dispatch } = makeFakeDispatch({
      ok: true,
      state: next,
      events: [],
    });
    const store = createStore(data, initial, dispatch, () => 0);

    const order: string[] = [];
    store.subscribe(() => order.push('first'));
    store.subscribe(() => order.push('second'));
    store.subscribe(() => order.push('third'));

    store.dispatch({ type: 'tick' });

    expect(order).toEqual(['first', 'second', 'third']);
  });

  it('stops notifying a listener after it unsubscribes', () => {
    const data = makeGameData();
    const initial = makeState();
    const next = makeState({ coins: 1 });
    const { dispatch } = makeFakeDispatch({
      ok: true,
      state: next,
      events: [],
    });
    const store = createStore(data, initial, dispatch, () => 0);

    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();

    store.dispatch({ type: 'tick' });

    expect(listener).not.toHaveBeenCalled();
  });

  it('only unsubscribes the listener that was returned, leaving others notified', () => {
    const data = makeGameData();
    const initial = makeState();
    const next = makeState({ coins: 1 });
    const { dispatch } = makeFakeDispatch({
      ok: true,
      state: next,
      events: [],
    });
    const store = createStore(data, initial, dispatch, () => 0);

    const kept = vi.fn();
    const removed = vi.fn();
    const unsubscribeRemoved = store.subscribe(removed);
    store.subscribe(kept);
    unsubscribeRemoved();

    store.dispatch({ type: 'tick' });

    expect(removed).not.toHaveBeenCalled();
    expect(kept).toHaveBeenCalledTimes(1);
  });

  it('exposes the data it was created with', () => {
    const data = makeGameData();
    const initial = makeState();
    const { dispatch } = makeFakeDispatch({
      ok: true,
      state: initial,
      events: [],
    });
    const store = createStore(data, initial, dispatch, () => 0);

    expect(store.data).toBe(data);
  });
});
