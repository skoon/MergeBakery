/**
 * Tests for order generation and refilling (T3.6).
 */

import { describe, it, expect } from 'vitest';
import { createRng } from './rng';
import { stateWith, testData } from './testing';
import {
  orderCandidates,
  isProducible,
  nextTask,
  generateOrder,
  refillOrders,
} from './orders';
import type { CustomerKind, GameData, Order, RenovationTask } from './types';

// ─── Fixtures for nextTask / featured-item tests ────────────────────────────
//
// chapter1.json has no tasks yet, so nextTask and featured weighting are
// tested against a copy of testData whose chapter1 has tasks (per the brief).

const taskTemplate: RenovationTask = {
  id: 'task-a',
  name: 'Task A',
  starCost: 1,
  spot: { x: 0, y: 0 },
  prerequisites: [],
  unlocks: [],
  featuredItems: [],
  beforeSpriteKey: 'before-a',
  afterSpriteKey: 'after-a',
  sceneId: null,
};

const taskA: RenovationTask = { ...taskTemplate, id: 'task-a' };
const taskB: RenovationTask = {
  ...taskTemplate,
  id: 'task-b',
  prerequisites: ['task-a'],
};
const taskC: RenovationTask = {
  ...taskTemplate,
  id: 'task-c',
  prerequisites: ['task-b'],
};

const featuredTask: RenovationTask = {
  ...taskTemplate,
  id: 'featured-task',
  featuredItems: ['wheat-stalk'],
};

function dataWithTasks(tasks: readonly RenovationTask[]): GameData {
  const chapter1 = testData.chapters.get('chapter1');
  if (!chapter1) {
    throw new Error('test setup: chapter1 not found in testData');
  }
  const chapters = new Map(testData.chapters);
  chapters.set('chapter1', { ...chapter1, tasks });
  return { ...testData, chapters };
}

function kindOf(data: GameData, order: Order): CustomerKind {
  const customer = data.customers.get(order.customerId);
  if (!customer) {
    throw new Error(`test setup: unknown customer "${order.customerId}"`);
  }
  return customer.kind;
}

// ─── nextTask ────────────────────────────────────────────────────────────────

describe('nextTask', () => {
  const base = stateWith({});

  it('returns null when the chapter has no tasks', () => {
    expect(nextTask(dataWithTasks([]), base)).toBeNull();
  });

  it('returns the first task when none are complete', () => {
    const dataT = dataWithTasks([taskA, taskB, taskC]);
    const task = nextTask(dataT, { ...base, completedTasks: [] });
    expect(task?.id).toBe('task-a');
  });

  it('skips a completed task and returns the next whose prerequisites are met', () => {
    const dataT = dataWithTasks([taskA, taskB, taskC]);
    const task = nextTask(dataT, { ...base, completedTasks: ['task-a'] });
    expect(task?.id).toBe('task-b');
  });

  it('returns the first incomplete task even when a later task is complete', () => {
    const dataT = dataWithTasks([taskA, taskB, taskC]);
    const task = nextTask(dataT, { ...base, completedTasks: ['task-b'] });
    expect(task?.id).toBe('task-a');
  });

  it('returns null once every task is complete', () => {
    const dataT = dataWithTasks([taskA, taskB, taskC]);
    const task = nextTask(dataT, {
      ...base,
      completedTasks: ['task-a', 'task-b', 'task-c'],
    });
    expect(task).toBeNull();
  });

  it('throws for an unknown chapter id', () => {
    const dataT = dataWithTasks([taskA]);
    expect(() =>
      nextTask(dataT, { ...base, chapterId: 'no-such-chapter' }),
    ).toThrow(/unknown chapter id/);
  });
});

// ─── orderCandidates ─────────────────────────────────────────────────────────

describe('orderCandidates', () => {
  const state = stateWith({});

  it('includes discovered ingredient/baked items within maxTier', () => {
    const walkIn = orderCandidates(testData, state, 'walkIn');
    expect(new Set(walkIn.map((i) => i.id))).toEqual(
      new Set(['wheat-stalk', 'milk-splash', 'wheat-bundle', 'milk-bottle']),
    );

    const regular = orderCandidates(testData, state, 'regular');
    expect(new Set(regular.map((i) => i.id))).toEqual(
      new Set(['wheat-stalk', 'milk-splash', 'wheat-bundle', 'milk-bottle']),
    );
  });

  it('excludes generator-chain items even though they are discovered', () => {
    const walkIn = orderCandidates(testData, state, 'walkIn');
    expect(walkIn.some((i) => i.id === 'flour-mill-1')).toBe(false);
    expect(walkIn.some((i) => i.id === 'dairy-fridge-1')).toBe(false);
  });

  it('excludes undiscovered items', () => {
    const walkIn = orderCandidates(testData, state, 'walkIn');
    expect(walkIn.some((i) => i.id === 'flour-scoop')).toBe(false);
  });

  it('excludes items above the kind maxTier', () => {
    // sourdough-boule is flour tier 8, above the regular maxTier.
    const maxTier = testData.economy.orders.regular.maxTier;
    expect(testData.items.get('sourdough-boule')?.tier).toBeGreaterThan(
      maxTier,
    );
    const withHighTier = {
      ...state,
      discovered: [...state.discovered, 'sourdough-boule'],
    };
    const regular = orderCandidates(testData, withHighTier, 'regular');
    expect(regular.some((i) => i.id === 'sourdough-boule')).toBe(false);
  });
});

// ─── isProducible ────────────────────────────────────────────────────────────

describe('isProducible', () => {
  it('is true for a discovered ingredient with a matching generator on the board', () => {
    const state = stateWith({ 0: 'flour-mill-1' });
    expect(isProducible(testData, state, 'wheat-stalk')).toBe(true);
    // Same chain as wheat-stalk, so it counts too even though it isn't itself
    // in the spawn table by exact id in every case.
    expect(isProducible(testData, state, 'wheat-bundle')).toBe(true);
  });

  it('is false when the only matching generator is cobwebbed', () => {
    const state = stateWith({
      0: { itemId: 'flour-mill-1', cobwebbed: true },
    });
    expect(isProducible(testData, state, 'wheat-stalk')).toBe(false);
  });

  it('is true for a matching generator sitting in the Pantry', () => {
    const state = stateWith(
      {},
      {
        pantry: {
          capacity: 4,
          items: [
            {
              itemId: 'dairy-fridge-1',
              cobwebbed: false,
              generator: { charges: 12, cooldownEndsAt: null },
            },
          ],
        },
      },
    );
    expect(isProducible(testData, state, 'milk-splash')).toBe(true);
  });

  it('is false when no generator produces that chain', () => {
    const state = stateWith({ 0: 'flour-mill-1' });
    expect(isProducible(testData, state, 'milk-splash')).toBe(false);
  });

  it('is false for an undiscovered item', () => {
    const state = stateWith({ 0: 'flour-mill-1' });
    expect(isProducible(testData, state, 'flour-scoop')).toBe(false);
  });

  it('is false for a baked-chain item even if discovered', () => {
    const state = stateWith({ 0: 'flour-mill-1' }, { discovered: ['cookie'] });
    expect(isProducible(testData, state, 'cookie')).toBe(false);
  });

  it('throws on an unknown item id', () => {
    const state = stateWith({});
    expect(() => isProducible(testData, state, 'no-such-item')).toThrow(
      /unknown item id/,
    );
  });
});

// ─── generateOrder ───────────────────────────────────────────────────────────

describe('generateOrder', () => {
  // Both starting generators present and uncobwebbed, so every discovered
  // ingredient candidate stays producible and no order is ever unfillable.
  const producibleState = stateWith({ 0: 'flour-mill-1', 1: 'dairy-fridge-1' });

  it('produces valid, correctly rewarded, deterministic orders over 500 seeds', () => {
    for (let seed = 1; seed <= 500; seed++) {
      const orderA = generateOrder(testData, producibleState, createRng(seed));
      const orderB = generateOrder(testData, producibleState, createRng(seed));

      // Same seed gives the same order.
      expect(orderB).toEqual(orderA);

      expect(orderA.id).toBe(producibleState.nextOrderId);

      const kind = kindOf(testData, orderA);
      const rules =
        kind === 'regular'
          ? testData.economy.orders.regular
          : testData.economy.orders.walkIn;

      // Item count in bounds.
      expect(orderA.wants.length).toBeGreaterThanOrEqual(rules.minItems);
      expect(orderA.wants.length).toBeLessThanOrEqual(rules.maxItems);

      let sellSum = 0;
      let tierSum = 0;
      for (const itemId of orderA.wants) {
        expect(producibleState.discovered).toContain(itemId);

        const item = testData.items.get(itemId);
        expect(item).toBeDefined();
        if (!item) continue;

        const chain = testData.chains.get(item.chainId);
        expect(chain).toBeDefined();
        if (!chain) continue;

        expect(['ingredient', 'baked']).toContain(chain.kind);
        expect(item.tier).toBeLessThanOrEqual(rules.maxTier);

        sellSum += item.sellValue;
        tierSum += item.tier;
      }

      // Reward matches the formula.
      expect(orderA.reward.coins).toBe(
        Math.round(sellSum * rules.coinMultiplier),
      );
      expect(orderA.reward.xp).toBe(tierSum * rules.xpPerTier);
      expect(orderA.reward.stars).toBe(
        rules.starsByItemCount[orderA.wants.length - 1],
      );
    }
  });

  it('throws when no candidates remain', () => {
    const noDiscoveries = { ...producibleState, discovered: [] };
    expect(() => generateOrder(testData, noDiscoveries, createRng(1))).toThrow(
      /no candidates remain/,
    );
  });

  it('throws when there are no walk-in customers to fall back to', () => {
    const noWalkIns = new Map(
      Array.from(testData.customers.values())
        .filter((c) => c.kind !== 'walkIn')
        .map((c) => [c.id, c] as const),
    );
    const dataNoWalkIns: GameData = { ...testData, customers: noWalkIns };
    // unlockedCustomers is empty by default, so the regular pool is also empty.
    const state = stateWith({});

    expect(() => generateOrder(dataNoWalkIns, state, createRng(1))).toThrow(
      /no walk-in customers/,
    );
  });

  it('favors items the next renovation task features', () => {
    const dataFeatured = dataWithTasks([featuredTask]);
    const counts: Record<string, number> = {};

    for (let seed = 1; seed <= 500; seed++) {
      const order = generateOrder(
        dataFeatured,
        producibleState,
        createRng(seed),
      );
      for (const itemId of order.wants) {
        counts[itemId] = (counts[itemId] ?? 0) + 1;
      }
    }

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const featuredShare = (counts['wheat-stalk'] ?? 0) / total;

    // Candidates are wheat-stalk (weight 3), milk-splash, wheat-bundle,
    // milk-bottle (weight 1 each): expected share is 3/6 = 50%.
    expect(featuredShare).toBeGreaterThan(0.3);
    expect(featuredShare).toBeLessThan(0.7);

    for (const itemId of ['milk-splash', 'wheat-bundle', 'milk-bottle']) {
      expect((counts[itemId] ?? 0) / total).toBeLessThan(featuredShare);
    }
  });

  it("favors a customer's favorite items", () => {
    const state = {
      ...producibleState,
      unlockedCustomers: ['gus'],
      discovered: [...producibleState.discovered, 'cheese-wedge'], // gus's favorite, dairy tier 6
    };
    // Force every eligible draw to pick the regular so the sample isolates
    // favorite weighting instead of being diluted by walk-in draws.
    const dataForcedRegular: GameData = {
      ...testData,
      economy: {
        ...testData.economy,
        // No low-tier bias: this test is about favourites alone.
        orders: {
          ...testData.economy.orders,
          regularChancePercent: 100,
          lowTierBias: 0,
        },
      },
    };

    const counts: Record<string, number> = {};
    for (let seed = 1; seed <= 500; seed++) {
      const order = generateOrder(dataForcedRegular, state, createRng(seed));
      expect(order.customerId).toBe('gus');
      for (const itemId of order.wants) {
        counts[itemId] = (counts[itemId] ?? 0) + 1;
      }
    }

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const favoriteShare = (counts['cheese-wedge'] ?? 0) / total;

    // Candidates: cheese-wedge (weight 3), wheat-stalk, milk-splash,
    // wheat-bundle, milk-bottle (weight 1 each): expected share 3/7 ≈ 43%.
    expect(favoriteShare).toBeGreaterThan(0.25);
    expect(favoriteShare).toBeLessThan(0.65);

    for (const itemId of [
      'wheat-stalk',
      'milk-splash',
      'wheat-bundle',
      'milk-bottle',
    ]) {
      expect((counts[itemId] ?? 0) / total).toBeLessThan(favoriteShare);
    }
  });

  it('favours low tiers more as lowTierBias grows', () => {
    // A regular (maxTier 7) can ask for the tier 6 cheese wedge; walk-ins can't.
    const state = {
      ...producibleState,
      unlockedCustomers: ['gus'],
      discovered: [...producibleState.discovered, 'cheese-wedge'],
    };
    const lowShare = (bias: number): number => {
      const biased: GameData = {
        ...testData,
        economy: {
          ...testData.economy,
          orders: {
            ...testData.economy.orders,
            regularChancePercent: 100,
            lowTierBias: bias,
          },
        },
      };
      let low = 0;
      let total = 0;
      for (let seed = 1; seed <= 400; seed++) {
        for (const id of generateOrder(biased, state, createRng(seed)).wants) {
          total++;
          if ((testData.items.get(id)?.tier ?? 9) <= 2) low++;
        }
      }
      return low / total;
    };
    expect(lowShare(2)).toBeGreaterThan(lowShare(0));
  });

  it('picks regulars about regularChancePercent of the time when one is unlocked', () => {
    const state = { ...producibleState, unlockedCustomers: ['gus'] };
    const trials = 1000;
    let regularCount = 0;

    for (let seed = 1; seed <= trials; seed++) {
      const order = generateOrder(testData, state, createRng(seed));
      if (kindOf(testData, order) === 'regular') {
        regularCount++;
      }
    }

    const percent = (regularCount / trials) * 100;
    // regularChancePercent is 40 in economy.json; allow a generous margin.
    expect(percent).toBeGreaterThan(25);
    expect(percent).toBeLessThan(55);
  });

  it('never picks a regular when none are unlocked', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const order = generateOrder(testData, producibleState, createRng(seed));
      expect(kindOf(testData, order)).toBe('walkIn');
    }
  });
});

// ─── refillOrders ────────────────────────────────────────────────────────────

describe('refillOrders', () => {
  const producibleState = stateWith({ 0: 'flour-mill-1', 1: 'dairy-fridge-1' });

  it('does nothing when not yet due', () => {
    const state = { ...producibleState, nextOrderAt: 10_000 };
    const result = refillOrders(testData, state, createRng(1), 0);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state).toBe(state);
    expect(result.events).toEqual([]);
  });

  it('does nothing when nextOrderAt is null', () => {
    const state = { ...producibleState, nextOrderAt: null };
    const result = refillOrders(testData, state, createRng(1), 0);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state).toBe(state);
    expect(result.events).toEqual([]);
  });

  it('fills from 0 open orders up to maxOpen with sequential ids and arrival events', () => {
    expect(producibleState.orders).toHaveLength(0);
    expect(producibleState.nextOrderAt).toBe(0);

    const result = refillOrders(testData, producibleState, createRng(1), 0);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const maxOpen = testData.economy.orders.maxOpen;
    expect(result.state.orders).toHaveLength(maxOpen);
    expect(result.state.nextOrderAt).toBeNull();
    expect(result.state.nextOrderId).toBe(
      producibleState.nextOrderId + maxOpen,
    );

    const expectedIds = Array.from(
      { length: maxOpen },
      (_, i) => producibleState.nextOrderId + i,
    );
    expect(result.state.orders.map((o) => o.id)).toEqual(expectedIds);
    expect(result.events).toEqual(
      expectedIds.map((id) => ({ type: 'orderArrived', orderId: id })),
    );
  });

  it('adds only enough orders to reach maxOpen starting from 3 open orders', () => {
    const filled = refillOrders(testData, producibleState, createRng(1), 0);
    if (!filled.ok) {
      throw new Error('test setup: initial refill failed');
    }

    const threeOpen = {
      ...filled.state,
      orders: filled.state.orders.slice(0, 3),
      nextOrderId: filled.state.nextOrderId - 1,
      nextOrderAt: 0,
    };

    const result = refillOrders(testData, threeOpen, createRng(2), 0);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.state.orders).toHaveLength(4);
    expect(result.events).toHaveLength(1);
    expect(result.state.nextOrderId).toBe(threeOpen.nextOrderId + 1);
    expect(result.state.nextOrderAt).toBeNull();
    expect(result.events[0]).toEqual({
      type: 'orderArrived',
      orderId: threeOpen.nextOrderId,
    });
  });

  it('leaves at least one open order fully producible after each refill, over 500 seeds', () => {
    for (let seed = 1; seed <= 500; seed++) {
      const result = refillOrders(
        testData,
        producibleState,
        createRng(seed),
        0,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) continue;

      const anyFullyProducible = result.state.orders.some((order) =>
        order.wants.every((id) => isProducible(testData, result.state, id)),
      );
      expect(anyFullyProducible).toBe(true);
    }
  });
});
