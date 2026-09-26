/**
 * Tests for item discovery (T2.2).
 */

import { describe, it, expect } from 'vitest';
import { loadGameData } from './data';
import { createNewGame } from './newGame';
import { discover } from './discovery';

describe('discover with real data', () => {
  const data = loadGameData();
  const initialState = createNewGame(data, 1, 0);

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
