/**
 * Tests for the counter strip model (T3.9).
 */

import { describe, expect, it } from 'vitest';
import type { Order } from '../core/types';
import { stateWith, testData } from '../core/testing';
import { counterCards } from './counterModel';

describe('counterCards', () => {
  it('shows a wholesale batch as one icon with a count, topped up from the Pantry', () => {
    const batch: Order = {
      id: 3,
      customerId: 'gus',
      wants: Array.from({ length: 6 }, () => 'apple'),
      reward: { coins: 50, stars: 0, xp: 0, reputation: 12 },
      wholesale: { expiresAt: 7000 },
    };
    const apple = { itemId: 'apple', cobwebbed: false, generator: null };
    const short = stateWith(
      { 0: 'apple', 1: 'apple', 2: 'apple' },
      { orders: [batch], pantry: { capacity: 4, items: [apple] } },
    );
    const [card] = counterCards(testData, short);
    expect(card?.wants).toHaveLength(1);
    expect(card?.batch).toEqual({ have: 4, need: 6 });
    expect(card?.fillable).toBe(false);
    expect(card?.timed).toEqual({ label: 'Wholesale', expiresAt: 7000 });
    const full = stateWith(
      { 0: 'apple', 1: 'apple', 2: 'apple', 3: 'apple' },
      { orders: [batch], pantry: { capacity: 4, items: [apple, apple] } },
    );
    expect(counterCards(testData, full)[0]?.fillable).toBe(true);
    expect(counterCards(testData, full)[0]?.wants[0]?.ready).toBe(true);
  });

  it('carries when a catering order expires, and only on catering orders', () => {
    const regular: Order = {
      id: 1,
      customerId: 'gus',
      wants: ['apple'],
      reward: { coins: 10, stars: 1, xp: 2 },
    };
    const catering: Order = {
      ...regular,
      id: 2,
      catering: { expiresAt: 9000, upgradeChancePercent: 25 },
    };
    const cards = counterCards(
      testData,
      stateWith({}, { orders: [regular, catering] }),
    );
    expect(cards[0]).not.toHaveProperty('timed');
    expect(cards[1]?.timed).toEqual({ label: 'Catering', expiresAt: 9000 });
  });

  it('carries the points of an event order, and leaves them off a regular one', () => {
    const regular: Order = {
      id: 1,
      customerId: 'gus',
      wants: ['apple'],
      reward: { coins: 10, stars: 1, xp: 2 },
    };
    const event: Order = { ...regular, id: 2, eventPoints: 20 };
    const cards = counterCards(
      testData,
      stateWith({}, { orders: [regular, event] }),
    );
    expect(cards[0]).not.toHaveProperty('eventPoints');
    expect(cards[1]?.eventPoints).toBe(20);
  });

  it('returns no cards when there are no orders', () => {
    const state = stateWith({}, { orders: [] });

    expect(counterCards(testData, state)).toEqual([]);
  });

  it('marks a partly ready order as not fillable', () => {
    const order: Order = {
      id: 1,
      customerId: 'gus',
      wants: ['apple', 'butter-block'],
      reward: { coins: 10, stars: 1, xp: 2 },
    };
    const state = stateWith({ 0: 'apple' }, { orders: [order] });

    const [card] = counterCards(testData, state);
    expect(card).toBeDefined();
    expect(card?.orderId).toBe(1);
    expect(card?.customerName).toBe('Gus the Fisherman');
    // A regular shows their neutral expression portrait.
    expect(card?.portraitKey).toBe('portrait-gus-neutral');
    expect(card?.coins).toBe(10);
    expect(card?.stars).toBe(1);
    expect(card?.wants).toEqual([
      { itemId: 'apple', name: 'Apple', spriteKey: 'apple', ready: true },
      {
        itemId: 'butter-block',
        name: 'Butter block',
        spriteKey: 'butter-block',
        ready: false,
      },
    ]);
    expect(card?.fillable).toBe(false);
  });

  it('marks a fully ready order as fillable', () => {
    const order: Order = {
      id: 2,
      customerId: 'edith',
      wants: ['apple', 'butter-block'],
      reward: { coins: 20, stars: 2, xp: 4 },
    };
    const state = stateWith(
      { 0: 'apple', 1: 'butter-block' },
      { orders: [order] },
    );

    const [card] = counterCards(testData, state);
    expect(card?.wants.every((w) => w.ready)).toBe(true);
    expect(card?.fillable).toBe(true);
  });

  it('marks only the first of two wanted copies ready when only one is on the board', () => {
    const order: Order = {
      id: 3,
      customerId: 'dex',
      wants: ['apple', 'apple'],
      reward: { coins: 5, stars: 1, xp: 1 },
    };
    const state = stateWith({ 0: 'apple' }, { orders: [order] });

    const [card] = counterCards(testData, state);
    expect(card?.wants.map((w) => w.ready)).toEqual([true, false]);
    expect(card?.fillable).toBe(false);
  });

  it('does not count cobwebbed items toward readiness', () => {
    const order: Order = {
      id: 4,
      customerId: 'mina',
      wants: ['apple'],
      reward: { coins: 5, stars: 1, xp: 1 },
    };
    const state = stateWith(
      { 0: { itemId: 'apple', cobwebbed: true } },
      { orders: [order] },
    );

    const [card] = counterCards(testData, state);
    expect(card?.wants).toEqual([
      { itemId: 'apple', name: 'Apple', spriteKey: 'apple', ready: false },
    ]);
    expect(card?.fillable).toBe(false);
  });

  it('shows a walk-in their single portrait', () => {
    const order: Order = {
      id: 2,
      customerId: 'walkin-hiker',
      wants: ['apple'],
      reward: { coins: 4, stars: 1, xp: 1 },
    };
    const state = stateWith({}, { orders: [order] });

    expect(counterCards(testData, state)[0]?.portraitKey).toBe(
      'portrait-walkin-hiker',
    );
  });
});
