import { describe, expect, it } from 'vitest';
import { deliverOrder } from './deliver';
import { generateCateringOrder, refillOrders } from './orders';
import { createRng } from './rng';
import { stateWith, testData } from './testing';
import type { CateringRules, GameData, GameState, Order } from './types';

const rules: CateringRules = {
  minChapter: 'chapter1',
  chancePercent: 100,
  minTier: 3,
  maxTier: 4,
  windowSec: 86400,
  coinMultiplier: 6,
  stars: 5,
  xp: 20,
  upgradeChancePercent: 100,
};
const withRules = (c: CateringRules | undefined): GameData => ({
  ...testData,
  economy: {
    ...testData.economy,
    orders: { ...testData.economy.orders, ...(c && { catering: c }) },
  },
});
const data = withRules(rules);
const rng = () => createRng(3);
const base = (over: Partial<GameState> = {}) => {
  const state = stateWith({ 0: 'flour-mill-1', 1: 'dairy-fridge-1' });
  return {
    ...state,
    discovered: [...state.discovered, 'layer-cake'],
    ...over,
  };
};

describe('generateCateringOrder', () => {
  it('makes one high-tier baked item order with a day to fill it', () => {
    const order = generateCateringOrder(data, base(), rng(), 1000);
    expect(order?.wants).toEqual(['layer-cake']);
    expect(order?.reward).toEqual({
      coins: 112 * 6,
      stars: 5,
      xp: 20,
    });
    expect(order?.catering).toEqual({
      expiresAt: 1000 + 86_400_000,
      upgradeChancePercent: 100,
    });
  });

  it('is off without rules, before its chapter, and on a zero chance', () => {
    expect(generateCateringOrder(testData, base(), rng(), 0)).toBeNull();
    const later = withRules({ ...rules, minChapter: 'chapter2' });
    expect(generateCateringOrder(later, base(), rng(), 0)).toBeNull();
    const never = withRules({ ...rules, chancePercent: 0 });
    expect(generateCateringOrder(never, base(), rng(), 0)).toBeNull();
  });

  it('needs a discovered baked item in the tier range', () => {
    const noBaked = base({ discovered: ['wheat-stalk'] });
    expect(generateCateringOrder(data, noBaked, rng(), 0)).toBeNull();
  });

  it('offers one at a time', () => {
    const open: Order = {
      id: 9,
      customerId: 'walkin-hiker',
      wants: ['layer-cake'],
      reward: { coins: 1, stars: 5, xp: 1 },
      catering: { expiresAt: 5e9, upgradeChancePercent: 0 },
    };
    expect(
      generateCateringOrder(data, base({ orders: [open] }), rng(), 0),
    ).toBeNull();
  });
});

describe('refillOrders with catering', () => {
  it('can put a catering order in the queue', () => {
    const state = base({ nextOrderAt: 0, orders: [] });
    const r = refillOrders(data, state, rng(), 0);
    if (!r.ok) throw new Error('expected ok');
    expect(r.state.orders.filter((o) => o.catering)).toHaveLength(1);
    expect(r.state.orders).toHaveLength(data.economy.orders.maxOpen);
  });

  it('drops a catering order when its time is up and refills the slot', () => {
    const old: Order = {
      id: 9,
      customerId: 'walkin-hiker',
      wants: ['layer-cake'],
      reward: { coins: 1, stars: 5, xp: 1 },
      catering: { expiresAt: 1000, upgradeChancePercent: 0 },
    };
    const noCatering = withRules({ ...rules, chancePercent: 0 });
    const state = base({ orders: [old], nextOrderAt: null });
    const early = refillOrders(noCatering, state, rng(), 999);
    expect(early.ok && early.state.orders).toEqual([old]);
    const r = refillOrders(noCatering, state, rng(), 1000);
    if (!r.ok) throw new Error('expected ok');
    expect(r.events).toContainEqual({ type: 'cateringExpired', orderId: 9 });
    expect(r.state.orders.some((o) => o.id === 9)).toBe(false);
    expect(r.state.orders).toHaveLength(noCatering.economy.orders.maxOpen);
  });
});

describe('delivering a catering order', () => {
  const order = (chance: number): Order => ({
    id: 1,
    customerId: 'walkin-hiker',
    wants: ['layer-cake'],
    reward: { coins: 100, stars: 5, xp: 0 },
    catering: { expiresAt: 5e9, upgradeChancePercent: chance },
  });
  const board = (chance: number) =>
    stateWith(
      { 0: 'layer-cake', 1: 'flour-mill-1' },
      { orders: [order(chance)] },
    );

  it('upgrades a board generator a tier when the roll succeeds', () => {
    const r = deliverOrder(data, board(100), 1, 0, rng());
    if (!r.ok) throw new Error('expected ok');
    const upgraded = r.state.board.cells[1];
    expect(upgraded?.kind === 'item' && upgraded.item.itemId).toBe(
      'flour-mill-2',
    );
    expect(r.events).toContainEqual({
      type: 'generatorUpgraded',
      cell: 1,
      itemId: 'flour-mill-2',
    });
  });

  it('upgrades nothing on a zero chance, or without an rng', () => {
    const none = deliverOrder(data, board(0), 1, 0, rng());
    expect(
      none.ok && none.events.some((e) => e.type === 'generatorUpgraded'),
    ).toBe(false);
    const noRng = deliverOrder(data, board(100), 1, 0);
    expect(
      noRng.ok && noRng.events.some((e) => e.type === 'generatorUpgraded'),
    ).toBe(false);
  });

  it('does nothing extra for a regular order', () => {
    const regular: Order = { ...order(100), catering: undefined };
    const state = stateWith(
      { 0: 'layer-cake', 1: 'flour-mill-1' },
      { orders: [regular] },
    );
    const r = deliverOrder(data, state, 1, 0, rng());
    expect(r.ok && r.events.some((e) => e.type === 'generatorUpgraded')).toBe(
      false,
    );
  });
});
