/**
 * Tests for the dev-only state helpers.
 */

import { describe, it, expect } from 'vitest';
import { giveItems, rewindState } from './devTools';
import { testData, stateWith } from '../core/testing';
import { getCell } from '../core/board';
import { resolveOffline } from '../core/offline';
import type { BoardItem, GameState } from '../core/types';

const MINUTE = 60_000;

function itemsOnBoard(state: GameState): string[] {
  return state.board.cells.flatMap((c) =>
    c.kind === 'item' ? [c.item.itemId] : [],
  );
}

describe('giveItems', () => {
  it('puts each item on the board', () => {
    const next = giveItems(testData, stateWith({}), [
      'dough-ball',
      'butter-block',
    ]);

    expect(itemsOnBoard(next).sort()).toEqual(['butter-block', 'dough-ball']);
  });

  it('gives a generator full charges', () => {
    const next = giveItems(testData, stateWith({}), ['flour-mill-2']);
    const cell = next.board.cells.find((c) => c.kind === 'item');

    expect(cell?.kind === 'item' && cell.item.generator).toEqual({
      charges: testData.generators.get('flour-mill-2')?.charges,
      cooldownEndsAt: null,
    });
  });

  it('throws on an unknown item', () => {
    expect(() => giveItems(testData, stateWith({}), ['not-an-item'])).toThrow(
      /unknown item/,
    );
  });

  it('throws when the board has no room', () => {
    const state = stateWith({});
    const empties = state.board.cells.filter((c) => c.kind === 'empty').length;
    const tooMany = Array.from({ length: empties + 1 }, () => 'egg');

    expect(() => giveItems(testData, state, tooMany)).toThrow(/board is full/);
  });
});

describe('rewindState', () => {
  const T0 = 10_000_000;

  function busyState(): GameState {
    const mill: BoardItem = {
      itemId: 'flour-mill-1',
      cobwebbed: false,
      generator: { charges: 0, cooldownEndsAt: T0 + 5 * MINUTE },
    };
    const base = stateWith({ 0: 'flour-mill-1' });
    return {
      ...base,
      board: {
        ...base.board,
        cells: base.board.cells.map((c, i) =>
          i === 0 ? { kind: 'item', item: mill } : c,
        ),
      },
      pantry: { ...base.pantry, items: [mill] },
      energy: { value: 10, updatedAt: T0 },
      kitchen: {
        ovens: [
          {
            ovenId: 'toaster-oven',
            slots: [
              {
                recipeId: 'bake-croissant',
                startedAt: T0,
                endsAt: T0 + 5 * MINUTE,
              },
            ],
          },
        ],
      },
      nextOrderAt: T0 + MINUTE,
      lastSale: {
        item: { itemId: 'egg', cobwebbed: false, generator: null },
        cell: 3,
        coins: 1,
        soldAt: T0,
      },
    };
  }

  it('moves every timestamp back by the same amount', () => {
    const next = rewindState(busyState(), 90 * MINUTE);
    const back = T0 - 90 * MINUTE;
    const cell = getCell(next.board, 0);

    expect(next.energy.updatedAt).toBe(back);
    expect(cell.kind === 'item' && cell.item.generator?.cooldownEndsAt).toBe(
      back + 5 * MINUTE,
    );
    expect(next.pantry.items[0]?.generator?.cooldownEndsAt).toBe(
      back + 5 * MINUTE,
    );
    expect(next.kitchen.ovens[0]?.slots[0]).toMatchObject({
      startedAt: back,
      endsAt: back + 5 * MINUTE,
    });
    expect(next.nextOrderAt).toBe(back + MINUTE);
    expect(next.lastSale?.soldAt).toBe(back);
  });

  it('loads the same as a save really made that long ago', () => {
    const away = 90 * MINUTE;

    // Really saved at T0 and loaded `away` later...
    const real = resolveOffline(testData, busyState(), T0, T0 + away);
    // ...versus rewound by `away` and loaded at the moment it was taken.
    const faked = resolveOffline(
      testData,
      rewindState(busyState(), away),
      T0 - away,
      T0,
    );

    expect(faked.summary).toEqual(real.summary);
    expect(faked.summary).toMatchObject({
      awayMs: away,
      bakesFinished: ['bake-croissant'],
      generatorsRecharged: 2,
    });
  });
});
