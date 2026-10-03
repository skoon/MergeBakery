/**
 * Tests for item discovery (T2.2).
 */

import { describe, it, expect } from 'vitest';
import { loadGameData } from './data';
import { createNewGame } from './newGame';
import { discover, dismissDiscovery } from './discovery';

describe('discover with real data', () => {
  const data = loadGameData();
  const initialState = createNewGame(data, 1, 0);

  it('ignores event generators and event items: no card, nothing recorded', () => {
    for (const id of ['contest-mixer-1', 'sprinkles', 'tiered-cake']) {
      const r = discover(data, initialState, id);
      expect(r.state).toBe(initialState);
      expect(r.events).toEqual([]);
    }
  });

  it('adds a new item to discovered and pendingDiscoveries', () => {
    // Pick an item not in the initial game state
    // Checking if there's an item not yet discovered
    const allItems = Array.from(data.items.values());
    const newItem = allItems.find(
      (item) => !initialState.discovered.includes(item.id),
    );

    if (!newItem) {
      throw new Error('no undiscovered items found in test data');
    }

    const result = discover(data, initialState, newItem.id);

    expect(result.state.discovered).toContain(newItem.id);
    expect(result.state.pendingDiscoveries).toContain(newItem.id);
    expect(result.events).toEqual([
      { type: 'discovered' as const, itemId: newItem.id },
    ]);
  });

  it('adds a new item exactly once', () => {
    const allItems = Array.from(data.items.values());
    const newItem = allItems.find(
      (item) => !initialState.discovered.includes(item.id),
    );

    if (!newItem) {
      throw new Error('no undiscovered items found in test data');
    }

    const result = discover(data, initialState, newItem.id);

    // Check it was added exactly once
    const count = result.state.discovered.filter(
      (id) => id === newItem.id,
    ).length;
    expect(count).toBe(1);
  });

  it('returns the same state object for a known item', () => {
    const knownItem = initialState.discovered[0];
    if (!knownItem) {
      throw new Error('no discovered items in initial state');
    }

    const result = discover(data, initialState, knownItem);

    expect(result.state).toBe(initialState);
    expect(result.events).toEqual([]);
  });

  it('does not mutate the input state', () => {
    const allItems = Array.from(data.items.values());
    const newItem = allItems.find(
      (item) => !initialState.discovered.includes(item.id),
    );

    if (!newItem) {
      throw new Error('no undiscovered items found in test data');
    }

    const discoveredBefore = initialState.discovered.length;
    const pendingBefore = initialState.pendingDiscoveries.length;

    discover(data, initialState, newItem.id);

    expect(initialState.discovered.length).toBe(discoveredBefore);
    expect(initialState.pendingDiscoveries.length).toBe(pendingBefore);
    expect(initialState.discovered).not.toContain(newItem.id);
  });

  it('throws on an unknown item id', () => {
    expect(() => discover(data, initialState, 'unknown-item')).toThrow(
      'unknown item id "unknown-item"',
    );
  });

  it('subsequent discoveries return new state objects', () => {
    const allItems = Array.from(data.items.values());
    const newItems = allItems.filter(
      (item) => !initialState.discovered.includes(item.id),
    );

    const [first, second] = newItems;
    if (!first || !second) {
      throw new Error(
        'need at least 2 undiscovered items to test multiple discoveries',
      );
    }

    let state = initialState;
    const result1 = discover(data, state, first.id);
    state = result1.state;

    const result2 = discover(data, state, second.id);
    const finalState = result2.state;

    expect(result1.state).not.toBe(initialState);
    expect(finalState).not.toBe(result1.state);
    expect(finalState.discovered).toHaveLength(
      initialState.discovered.length + 2,
    );
    expect(finalState.pendingDiscoveries).toHaveLength(
      initialState.pendingDiscoveries.length + 2,
    );
  });
});

describe('chain completion (T5.6)', () => {
  const data = loadGameData();
  const croissants = ['croissant', 'pain-au-chocolat', 'pastry-platter'];

  function stateKnowing(ids: string[], gems = 0) {
    return { ...createNewGame(data, 1, 0), discovered: ids, gems };
  }

  it('pays the chain gems once when its last item is discovered', () => {
    const state = stateKnowing(['croissant', 'pain-au-chocolat'], 5);

    const result = discover(data, state, 'pastry-platter');

    expect(result.state.gems).toBe(8); // croissant chain: completionGems 3
    expect(result.state.rewardedChains).toEqual(['croissant']);
    expect(result.events).toEqual([
      { type: 'discovered', itemId: 'pastry-platter' },
      { type: 'chainCompleted', chainId: 'croissant', gems: 3 },
    ]);
  });

  it('does not pay before the chain is complete', () => {
    const result = discover(
      data,
      stateKnowing(['croissant']),
      'pain-au-chocolat',
    );

    expect(result.state.gems).toBe(0);
    expect(result.state.rewardedChains).toEqual([]);
    expect(result.events).toHaveLength(1);
  });

  it('does not pay twice', () => {
    const state = {
      ...stateKnowing(['croissant', 'pain-au-chocolat']),
      rewardedChains: ['croissant'],
    };

    const result = discover(data, state, 'pastry-platter');

    expect(result.state.gems).toBe(0);
    expect(result.events).toHaveLength(1);
  });

  it('does not pay again on a rediscovery', () => {
    const result = discover(data, stateKnowing(croissants), 'croissant');

    expect(result.state.gems).toBe(0);
    expect(result.events).toEqual([]);
  });

  it('never pays or records a chain worth 0 gems', () => {
    // The energy jar is a one-item bonus chain with completionGems 0.
    const result = discover(data, stateKnowing([]), 'energy-jar');

    expect(result.state.gems).toBe(0);
    expect(result.state.rewardedChains).toEqual([]);
    expect(result.events).toEqual([
      { type: 'discovered', itemId: 'energy-jar' },
    ]);
  });
});

describe('dismissDiscovery (T5.7)', () => {
  const data = loadGameData();
  const base = createNewGame(data, 1, 0);

  it('removes a pending item', () => {
    const state = { ...base, pendingDiscoveries: ['egg'] };

    const result = dismissDiscovery(data, state, 'egg');

    expect(result.ok && result.state.pendingDiscoveries).toEqual([]);
  });

  it('keeps the other pending items in order', () => {
    const state = { ...base, pendingDiscoveries: ['egg', 'berry', 'caramel'] };

    const result = dismissDiscovery(data, state, 'berry');

    expect(result.ok && result.state.pendingDiscoveries).toEqual([
      'egg',
      'caramel',
    ]);
  });

  it('returns the same state object when the item is not pending', () => {
    const state = { ...base, pendingDiscoveries: ['egg'] };

    const result = dismissDiscovery(data, state, 'berry');

    expect(result).toEqual({ ok: true, state, events: [] });
    expect(result.ok && result.state).toBe(state);
  });

  it('throws on an unknown item', () => {
    expect(() => dismissDiscovery(data, base, 'mystery-meat')).toThrow();
  });
});
