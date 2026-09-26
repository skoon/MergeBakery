/**
 * Tests for the counter strip model (T3.9).
 */

import { describe, expect, it } from 'vitest';
import type { Order } from '../core/types';
import { stateWith, testData } from '../core/testing';
import { counterCards } from './counterModel';

describe('counterCards', () => {
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
    expect(card?.portraitKey).toBe('portrait-gus');
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
});
