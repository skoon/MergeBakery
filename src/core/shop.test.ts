/**
 * Tests for the Shop (T7.8).
 */

import { describe, it, expect } from 'vitest';
import { buyShopItem, shopItemsFor } from './shop';
import { stateWith, testData, type CellSpec } from './testing';
import type { BoardItem, GameData, GameState, ShopItem } from './types';

const MILL: ShopItem = {
  id: 'mill',
  name: 'Flour Mill',
  kind: 'generator',
  itemId: 'flour-mill-1',
  price: 400,
  fromChapter: 'chapter1',
};
const SNACK: ShopItem = {
  id: 'snack',
  name: 'Energy snack',
  kind: 'energy',
  energy: 25,
  price: 150,
  fromChapter: 'chapter1',
};
const LATER: ShopItem = { ...MILL, id: 'later', fromChapter: 'chapter2' };

/** Real data with a second chapter and these three rows. */
const data: GameData = {
  ...testData,
  chapters: new Map([
    ...testData.chapters,
    [
      'chapter2',
      { ...testData.chapters.get('chapter1')!, id: 'chapter2', tasks: [] },
    ],
  ]),
  shop: new Map([MILL, SNACK, LATER].map((row) => [row.id, row])),
};

const EGG: BoardItem = { itemId: 'egg', cobwebbed: false, generator: null };

function fullBoard(): Record<number, CellSpec> {
  const cells: Record<number, CellSpec> = {};
  for (let i = 0; i < 63; i++) cells[i] = 'egg';
  return cells;
}

describe('shopItemsFor', () => {
  it('hides rows from chapters not yet reached', () => {
    expect(shopItemsFor(data, stateWith({})).map((r) => r.id)).toEqual([
      'mill',
      'snack',
    ]);
    expect(
      shopItemsFor(data, stateWith({}, { chapterId: 'chapter2' })).map(
        (r) => r.id,
      ),
    ).toEqual(['mill', 'snack', 'later']);
  });
});

describe('buyShopItem', () => {
  it('spends the coins and places a charged generator', () => {
    const state = stateWith({}, { coins: 1000 });

    const result = buyShopItem(data, state, 'mill', 0);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.coins).toBe(600);
    const placed = result.state.board.cells.find((c) => c.kind === 'item');
    expect(placed?.kind === 'item' && placed.item.itemId).toBe('flour-mill-1');
    expect(result.events[0]?.type).toBe('spawned');
    expect(result.events.at(-1)).toEqual({
      type: 'purchased',
      shopItemId: 'mill',
      coins: 400,
    });
  });

  it('adds energy, even above the cap', () => {
    const state = stateWith(
      {},
      { coins: 1000, energy: { value: 90, updatedAt: 0 } },
    );

    const result = buyShopItem(data, state, 'snack', 0);

    expect(result.ok && result.state.energy.value).toBe(115);
    expect(result.ok && result.state.coins).toBe(850);
  });

  it("rejects 'notEnoughCoins'", () => {
    expect(buyShopItem(data, stateWith({}, { coins: 399 }), 'mill', 0)).toEqual(
      {
        ok: false,
        reason: 'notEnoughCoins',
      },
    );
  });

  it("rejects a row from a chapter not yet reached with 'prerequisitesMissing'", () => {
    expect(
      buyShopItem(data, stateWith({}, { coins: 9999 }), 'later', 0),
    ).toEqual({
      ok: false,
      reason: 'prerequisitesMissing',
    });
  });

  it('sends a generator to the Pantry when the board is full', () => {
    const state = stateWith(fullBoard(), { coins: 1000 });

    const result = buyShopItem(data, state, 'mill', 0);

    expect(result.ok && result.state.pantry.items.map((i) => i.itemId)).toEqual(
      ['flour-mill-1'],
    );
  });

  it("rejects 'boardFull' without spending when the board and Pantry are full", () => {
    const base = stateWith(fullBoard(), { coins: 1000 });
    const state: GameState = {
      ...base,
      pantry: {
        ...base.pantry,
        items: Array.from({ length: base.pantry.capacity }, () => EGG),
      },
    };

    expect(buyShopItem(data, state, 'mill', 0)).toEqual({
      ok: false,
      reason: 'boardFull',
    });
  });

  it('throws for an unknown row', () => {
    expect(() => buyShopItem(data, stateWith({}), 'nope', 0)).toThrow(
      /unknown shop item/,
    );
  });
});
