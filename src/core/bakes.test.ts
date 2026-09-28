/**
 * Tests for baking functions (T4.2).
 */

import { describe, it, expect } from 'vitest';
import type { BakeSlotRef } from './types';
import { bakeStatus, collectBake, rushCost, rushBake } from './bakes';
import { stateWith, testData } from './testing';

describe('bakeStatus', () => {
  it('returns empty for an empty slot', () => {
    const state = stateWith({});
    const slot: BakeSlotRef = { oven: 0, slot: 0 };

    const status = bakeStatus(state, slot, 1000);

    expect(status.kind).toBe('empty');
  });

  it('returns baking with progress 0.5 halfway through', () => {
    const state = stateWith(
      {},
      {
        kitchen: {
          ovens: [
            {
              ovenId: 'toaster-oven',
              slots: [
                { recipeId: 'bake-croissant', startedAt: 0, endsAt: 300000 },
              ],
            },
          ],
        },
      },
    );
    const slot: BakeSlotRef = { oven: 0, slot: 0 };

    const status = bakeStatus(state, slot, 150000);

    expect(status.kind).toBe('baking');
    if (status.kind === 'baking') {
      expect(status.recipeId).toBe('bake-croissant');
      expect(status.progress).toBe(0.5);
      expect(status.msLeft).toBe(150000);
    }
  });

  it('returns done exactly at endsAt', () => {
    const state = stateWith(
      {},
      {
        kitchen: {
          ovens: [
            {
              ovenId: 'toaster-oven',
              slots: [
                { recipeId: 'bake-croissant', startedAt: 0, endsAt: 300000 },
              ],
            },
          ],
        },
      },
    );
    const slot: BakeSlotRef = { oven: 0, slot: 0 };

    const status = bakeStatus(state, slot, 300000);

    expect(status.kind).toBe('done');
    if (status.kind === 'done') {
      expect(status.recipeId).toBe('bake-croissant');
    }
  });
});

describe('collectBake', () => {
  it('collects onto the board near the middle', () => {
    const state = stateWith(
      {},
      {
        kitchen: {
          ovens: [
            {
              ovenId: 'toaster-oven',
              slots: [
                { recipeId: 'bake-croissant', startedAt: 0, endsAt: 300000 },
              ],
            },
          ],
        },
      },
    );
    const slot: BakeSlotRef = { oven: 0, slot: 0 };

    const result = collectBake(testData, state, slot, 300000);

    expect(result.ok).toBe(true);
    if (result.ok) {
      // Check that the slot is now empty
      const oven = result.state.kitchen.ovens[0];
      expect(oven).toBeDefined();
      if (oven) {
        const slotContent = oven.slots[0];
        expect(slotContent).toBeNull();
      }
      // Check that bakeCollected event was emitted
      const bakeCollectedEvent = result.events.find(
        (e) => e.type === 'bakeCollected',
      );
      expect(bakeCollectedEvent).toBeDefined();
      if (bakeCollectedEvent && bakeCollectedEvent.type === 'bakeCollected') {
        expect(bakeCollectedEvent.to).not.toBe('pantry');
        if (bakeCollectedEvent.to !== 'pantry') {
          expect(bakeCollectedEvent.to.cell).toBeDefined();
        }
      }
    }
  });

  it('collects into the Pantry when the board is full', () => {
    let state = stateWith({});
    const { cells } = state.board;
    const totalCells = cells.length;

    // Fill the board with dummy items
    const cellSpecs: Record<number, string> = {};
    for (let i = 0; i < totalCells; i++) {
      cellSpecs[i] = 'flour-1';
    }

    state = stateWith(cellSpecs, {
      kitchen: {
        ovens: [
          {
            ovenId: 'toaster-oven',
            slots: [
              { recipeId: 'bake-croissant', startedAt: 0, endsAt: 300000 },
            ],
          },
        ],
      },
      pantry: {
        capacity: 4,
        items: [],
      },
    });

    const slot: BakeSlotRef = { oven: 0, slot: 0 };
    const result = collectBake(testData, state, slot, 300000);

    expect(result.ok).toBe(true);
    if (result.ok) {
      // Check that the item is in the pantry
      const bakeCollectedEvent = result.events.find(
        (e) => e.type === 'bakeCollected',
      );
      expect(bakeCollectedEvent).toBeDefined();
      if (bakeCollectedEvent && bakeCollectedEvent.type === 'bakeCollected') {
        expect(bakeCollectedEvent.to).toBe('pantry');
      }
      // Verify the item was added to pantry
      expect(result.state.pantry.items.length).toBeGreaterThan(0);
    }
  });

  it('rejects boardFull when board and pantry are full', () => {
    let state = stateWith({});
    const { cells } = state.board;
    const totalCells = cells.length;

    // Fill the board with dummy items
    const cellSpecs: Record<number, string> = {};
    for (let i = 0; i < totalCells; i++) {
      cellSpecs[i] = 'flour-1';
    }

    state = stateWith(cellSpecs, {
      kitchen: {
        ovens: [
          {
            ovenId: 'toaster-oven',
            slots: [
              { recipeId: 'bake-croissant', startedAt: 0, endsAt: 300000 },
            ],
          },
        ],
      },
      pantry: {
        capacity: 4,
        items: [
          { itemId: 'flour-1', cobwebbed: false, generator: null },
          { itemId: 'flour-1', cobwebbed: false, generator: null },
          { itemId: 'flour-1', cobwebbed: false, generator: null },
          { itemId: 'flour-1', cobwebbed: false, generator: null },
        ],
      },
    });

    const slot: BakeSlotRef = { oven: 0, slot: 0 };
    const result = collectBake(testData, state, slot, 300000);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('boardFull');
    }
  });

  it('rejects bakeNotReady when collecting too early', () => {
    const state = stateWith(
      {},
      {
        kitchen: {
          ovens: [
            {
              ovenId: 'toaster-oven',
              slots: [
                { recipeId: 'bake-croissant', startedAt: 0, endsAt: 300000 },
              ],
            },
          ],
        },
      },
    );
    const slot: BakeSlotRef = { oven: 0, slot: 0 };

    const result = collectBake(testData, state, slot, 299999);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('bakeNotReady');
    }
  });

  it('rejects slotEmpty when slot is empty', () => {
    const state = stateWith({});
    const slot: BakeSlotRef = { oven: 0, slot: 0 };

    const result = collectBake(testData, state, slot, 1000);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('slotEmpty');
    }
  });

  it('emits discovered event for a first croissant', () => {
    const state = stateWith(
      {},
      {
        discovered: [],
        pendingDiscoveries: [],
        kitchen: {
          ovens: [
            {
              ovenId: 'toaster-oven',
              slots: [
                { recipeId: 'bake-croissant', startedAt: 0, endsAt: 300000 },
              ],
            },
          ],
        },
      },
    );
    const slot: BakeSlotRef = { oven: 0, slot: 0 };

    const result = collectBake(testData, state, slot, 300000);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const discoveredEvent = result.events.find(
        (e) => e.type === 'discovered',
      );
      expect(discoveredEvent).toBeDefined();
      if (discoveredEvent && discoveredEvent.type === 'discovered') {
        expect(discoveredEvent.itemId).toBeDefined();
        // Verify it was added to discovered list
        expect(result.state.discovered.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('rushCost', () => {
  it('costs 0 for a finished bake', () => {
    const state = stateWith(
      {},
      {
        kitchen: {
          ovens: [
            {
              ovenId: 'toaster-oven',
              slots: [
                { recipeId: 'bake-croissant', startedAt: 0, endsAt: 300000 },
              ],
            },
          ],
        },
      },
    );
    const slot: BakeSlotRef = { oven: 0, slot: 0 };

    const cost = rushCost(testData, state, slot, 300000);

    expect(cost).toBe(0);
  });

  it('rounds up: 1 ms left costs 1 minute', () => {
    const state = stateWith(
      {},
      {
        kitchen: {
          ovens: [
            {
              ovenId: 'toaster-oven',
              slots: [
                { recipeId: 'bake-croissant', startedAt: 0, endsAt: 300001 },
              ],
            },
          ],
        },
      },
    );
    const slot: BakeSlotRef = { oven: 0, slot: 0 };

    const cost = rushCost(testData, state, slot, 300000);

    // 1 ms left = 1/60000 minutes, ceil = 1 minute
    // 1 minute * rushGemsPerMinute (1) = 1
    expect(cost).toBe(1);
  });

  it('throws RangeError for empty slot', () => {
    const state = stateWith({});
    const slot: BakeSlotRef = { oven: 0, slot: 0 };

    expect(() => {
      rushCost(testData, state, slot, 1000);
    }).toThrow(RangeError);
  });
});

describe('rushBake', () => {
  it('rejects with slotEmpty when slot is empty', () => {
    const state = stateWith({});
    const slot: BakeSlotRef = { oven: 0, slot: 0 };

    const result = rushBake(testData, state, slot, 1000);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('slotEmpty');
    }
  });

  it('returns ok with same state for a finished bake', () => {
    const state = stateWith(
      {},
      {
        kitchen: {
          ovens: [
            {
              ovenId: 'toaster-oven',
              slots: [
                { recipeId: 'bake-croissant', startedAt: 0, endsAt: 300000 },
              ],
            },
          ],
        },
        gems: 100,
      },
    );
    const slot: BakeSlotRef = { oven: 0, slot: 0 };

    const result = rushBake(testData, state, slot, 300000);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.gems).toBe(100);
      expect(result.events.length).toBe(0);
    }
  });

  it('rejects notEnoughGems when gems < rushCost', () => {
    const state = stateWith(
      {},
      {
        kitchen: {
          ovens: [
            {
              ovenId: 'toaster-oven',
              slots: [
                { recipeId: 'bake-croissant', startedAt: 0, endsAt: 300000 },
              ],
            },
          ],
        },
        gems: 0,
      },
    );
    const slot: BakeSlotRef = { oven: 0, slot: 0 };

    const result = rushBake(testData, state, slot, 299999);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('notEnoughGems');
    }
  });

  it('rushes with enough gems', () => {
    const state = stateWith(
      {},
      {
        kitchen: {
          ovens: [
            {
              ovenId: 'toaster-oven',
              slots: [
                { recipeId: 'bake-croissant', startedAt: 0, endsAt: 300000 },
              ],
            },
          ],
        },
        gems: 100,
      },
    );
    const slot: BakeSlotRef = { oven: 0, slot: 0 };

    const result = rushBake(testData, state, slot, 299999);

    expect(result.ok).toBe(true);
    if (result.ok) {
      // Should have spent 1 gem
      expect(result.state.gems).toBe(99);
      // Bake should be finished
      const oven = result.state.kitchen.ovens[0];
      expect(oven).toBeDefined();
      if (oven) {
        const bake = oven.slots[0];
        expect(bake?.endsAt).toBe(299999);
      }
    }
  });
});
