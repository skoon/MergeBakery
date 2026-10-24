/**
 * Tests for the Shop's "For your orders" rows (T13).
 */

import { describe, it, expect } from 'vitest';
import { buyOrderItem, orderShopItems, orderShopPrice } from './orderShop';
import { stateWith, testData } from './testing';
import { getCell } from './board';
import { middleCell } from './placement';
import type { GameState, ItemId, Order } from './types';

const customerId = [...testData.customers.keys()][0]!;

function order(id: number, wants: ItemId[]): Order {
  return {
    id,
    customerId,
    wants,
    reward: { coins: 10, stars: 1, xp: 1 },
  };
}

/** A board with one wheat stalk, two open orders, and plenty of coins. */
function shopState(overrides?: Partial<GameState>): GameState {
  return stateWith(
    { 0: 'wheat-stalk' },
    {
      coins: 5000,
      orders: [
        order(1, ['croissant', 'wheat-stalk']),
        order(2, ['croissant', 'cheese-wheel']),
      ],
      ...overrides,
    },
  );
}

describe('orderShopPrice', () => {
  it('is the sell value times the multiplier', () => {
    // croissant sells for 96
    expect(orderShopPrice(testData, 'croissant')).toBe(768);
  });

  it('never goes below the minimum price', () => {
    // berry sells for 1
    expect(orderShopPrice(testData, 'berry')).toBe(25);
  });
});

describe('orderShopItems', () => {
  it('lists what open orders still need beyond what the player has, in order', () => {
    expect(orderShopItems(testData, shopState())).toEqual([
      { itemId: 'croissant', missing: 2, price: 768 },
      { itemId: 'cheese-wheel', missing: 1, price: 512 },
    ]);
  });

  it('counts items in the Pantry as had', () => {
    const base = shopState();
    const state: GameState = {
      ...base,
      pantry: {
        ...base.pantry,
        items: [{ itemId: 'croissant', cobwebbed: false, generator: null }],
      },
    };
    expect(orderShopItems(testData, state)[0]).toEqual({
      itemId: 'croissant',
      missing: 1,
      price: 768,
    });
  });

  it('does not count cobwebbed items as had', () => {
    const state = stateWith(
      { 0: { itemId: 'wheat-stalk', cobwebbed: true } },
      { orders: [order(1, ['wheat-stalk'])] },
    );
    expect(orderShopItems(testData, state)).toEqual([
      { itemId: 'wheat-stalk', missing: 1, price: 25 },
    ]);
  });

  it('skips items outside ingredient and baked chains', () => {
    const state = stateWith({}, { orders: [order(1, ['flour-mill-1'])] });
    expect(orderShopItems(testData, state)).toEqual([]);
  });
});

describe('buyOrderItem', () => {
  it('spends the coins and places the item nearest the middle of the board', () => {
    const state = shopState();
    const result = buyOrderItem(testData, state, 'croissant');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const cell = middleCell(state);
    expect(result.state.coins).toBe(5000 - 768);
    expect(getCell(result.state.board, cell)).toEqual({
      kind: 'item',
      item: { itemId: 'croissant', cobwebbed: false, generator: null },
    });
    expect(result.events).toEqual([
      { type: 'spawned', itemId: 'croissant', cell, rare: false },
      { type: 'itemBought', itemId: 'croissant', coins: 768 },
    ]);
  });

  it('does not discover the item it buys', () => {
    const state = shopState();
    expect(state.discovered).not.toContain('cheese-wheel');

    const result = buyOrderItem(testData, state, 'cheese-wheel');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.discovered).toBe(state.discovered);
    expect(result.state.rewardedChains).toBe(state.rewardedChains);
    expect(result.events.some((e) => e.type === 'discovered')).toBe(false);
  });

  it('goes to the Pantry when the board is full', () => {
    const base = shopState();
    const full: GameState = {
      ...base,
      board: {
        ...base.board,
        cells: base.board.cells.map(() => ({
          kind: 'item' as const,
          item: { itemId: 'berry', cobwebbed: false, generator: null },
        })),
      },
    };
    const result = buyOrderItem(testData, full, 'croissant');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.pantry.items).toEqual([
      { itemId: 'croissant', cobwebbed: false, generator: null },
    ]);
    expect(result.events).toEqual([
      { type: 'itemBought', itemId: 'croissant', coins: 768 },
    ]);
  });

  it('rejects when there is no room on the board or in the Pantry', () => {
    const base = shopState();
    const berry = { itemId: 'berry', cobwebbed: false, generator: null };
    const full: GameState = {
      ...base,
      board: {
        ...base.board,
        cells: base.board.cells.map(() => ({
          kind: 'item' as const,
          item: berry,
        })),
      },
      pantry: {
        ...base.pantry,
        items: Array.from({ length: base.pantry.capacity }, () => berry),
      },
    };
    expect(buyOrderItem(testData, full, 'croissant')).toEqual({
      ok: false,
      reason: 'boardFull',
    });
  });

  it('rejects when the player cannot afford it', () => {
    const state = shopState({ coins: 767 });
    expect(buyOrderItem(testData, state, 'croissant')).toEqual({
      ok: false,
      reason: 'notEnoughCoins',
    });
  });

  it('rejects an item no open order still needs', () => {
    // The wheat stalk is wanted, but the player already has one.
    expect(buyOrderItem(testData, shopState(), 'wheat-stalk')).toEqual({
      ok: false,
      reason: 'prerequisitesMissing',
    });
  });

  it('throws on an unknown item id', () => {
    expect(() => buyOrderItem(testData, shopState(), 'nope')).toThrow();
  });
});
