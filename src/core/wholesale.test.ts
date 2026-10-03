import { describe, expect, it } from 'vitest';
import { deliverOrder } from './deliver';
import { generateWholesaleOrder, refillOrders } from './orders';
import { createRng } from './rng';
import { stateWith, testData } from './testing';
import type { GameData, GameState, Order, WholesaleRules } from './types';

const rules: WholesaleRules = {
  minChapter: 'chapter1',
  chancePercent: 100,
  minItems: 5,
  maxItems: 10,
  minTier: 1,
  maxTier: 2,
  coinMultiplier: 2,
  reputationPerItem: 2,
  xpPerTier: 1,
  windowSec: 86400,
};
const withRules = (w: WholesaleRules | undefined): GameData => ({
  ...testData,
  economy: {
    ...testData.economy,
    orders: { ...testData.economy.orders, ...(w && { wholesale: w }) },
  },
});
const data = withRules(rules);
const rng = () => createRng(5);
const base = (over: Partial<GameState> = {}): GameState => ({
  ...stateWith({ 0: 'flour-mill-1', 1: 'dairy-fridge-1' }),
  ...over,
});

describe('generateWholesaleOrder', () => {
  it('asks for 5 to 10 of one item, paying coins and reputation', () => {
    const order = generateWholesaleOrder(data, base(), rng(), 1000);
    if (!order) throw new Error('expected an order');
    expect(order.wants.length).toBeGreaterThanOrEqual(5);
    expect(order.wants.length).toBeLessThanOrEqual(10);
    expect(new Set(order.wants).size).toBe(1);
    const item = testData.items.get(order.wants[0] ?? '');
    expect(item?.tier).toBeLessThanOrEqual(2);
    expect(order.reward).toEqual({
      coins: Math.round((item?.sellValue ?? 0) * order.wants.length * 2),
      stars: 0,
      xp: (item?.tier ?? 0) * order.wants.length,
      reputation: 2 * order.wants.length,
    });
    expect(order.wholesale).toEqual({ expiresAt: 1000 + 86_400_000 });
  });

  it('is off without rules, before its chapter, on a zero chance, and while one is open', () => {
    expect(generateWholesaleOrder(testData, base(), rng(), 0)).toBeNull();
    expect(
      generateWholesaleOrder(
        withRules({ ...rules, minChapter: 'chapter2' }),
        base(),
        rng(),
        0,
      ),
    ).toBeNull();
    expect(
      generateWholesaleOrder(
        withRules({ ...rules, chancePercent: 0 }),
        base(),
        rng(),
        0,
      ),
    ).toBeNull();
    const open: Order = {
      id: 9,
      customerId: 'walkin-hiker',
      wants: ['wheat-stalk'],
      reward: { coins: 1, stars: 0, xp: 0 },
      wholesale: { expiresAt: 5e9 },
    };
    expect(
      generateWholesaleOrder(data, base({ orders: [open] }), rng(), 0),
    ).toBeNull();
  });
});

describe('wholesale in the order queue', () => {
  it('expires with its own event and refills the slot', () => {
    const old: Order = {
      id: 9,
      customerId: 'walkin-hiker',
      wants: ['wheat-stalk', 'wheat-stalk'],
      reward: { coins: 1, stars: 0, xp: 0 },
      wholesale: { expiresAt: 1000 },
    };
    const off = withRules({ ...rules, chancePercent: 0 });
    const r = refillOrders(
      off,
      base({ orders: [old], nextOrderAt: null }),
      rng(),
      1000,
    );
    if (!r.ok) throw new Error('expected ok');
    expect(r.events).toContainEqual({ type: 'wholesaleExpired', orderId: 9 });
    expect(r.state.orders.some((o) => o.id === 9)).toBe(false);
  });
});

describe('delivering a wholesale order', () => {
  const batch = (n: number): Order => ({
    id: 1,
    customerId: 'walkin-hiker',
    wants: Array.from({ length: n }, () => 'wheat-stalk'),
    reward: { coins: 50, stars: 0, xp: 0, reputation: 8 },
    wholesale: { expiresAt: 5e9 },
  });
  const stalk = { itemId: 'wheat-stalk', cobwebbed: false, generator: null };

  it('takes what the board lacks from the Pantry and adds reputation', () => {
    const state = stateWith(
      { 0: 'wheat-stalk', 1: 'wheat-stalk', 2: 'wheat-stalk' },
      {
        orders: [batch(5)],
        reputation: 3,
        pantry: { capacity: 4, items: [stalk, stalk] },
      },
    );
    const r = deliverOrder(data, state, 1, 0, rng());
    if (!r.ok) throw new Error('expected ok');
    expect(r.state.pantry.items).toEqual([]);
    expect(
      r.state.board.cells.slice(0, 3).every((c) => c.kind === 'empty'),
    ).toBe(true);
    expect(r.state.reputation).toBe(3 + 8);
    expect(r.state.coins).toBe(state.coins + 50);
  });

  it('still needs every item, board plus Pantry', () => {
    const state = stateWith(
      { 0: 'wheat-stalk', 1: 'wheat-stalk' },
      { orders: [batch(5)], pantry: { capacity: 4, items: [stalk] } },
    );
    expect(deliverOrder(data, state, 1, 0, rng())).toEqual({
      ok: false,
      reason: 'missingItems',
    });
  });

  it('leaves the Pantry alone for a regular order', () => {
    const regular: Order = { ...batch(2), wholesale: undefined };
    const state = stateWith(
      { 0: 'wheat-stalk' },
      { orders: [regular], pantry: { capacity: 4, items: [stalk] } },
    );
    expect(deliverOrder(data, state, 1, 0, rng())).toEqual({
      ok: false,
      reason: 'missingItems',
    });
  });
});
