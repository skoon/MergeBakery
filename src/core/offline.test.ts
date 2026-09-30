/**
 * Tests for catching up after time away (T4.8).
 */

import { describe, it, expect } from 'vitest';
import { resolveOffline, shouldShowAwayCard } from './offline';
import { testData, stateWith } from './testing';
import { getCell, setCell } from './board';
import type { BoardItem, GameState, OvenState } from './types';

const SAVED_AT = 1_000_000;
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** flour-mill-1, with a 300 s cooldown. */
const MILL = 'flour-mill-1';
const MILL_CHARGES = testData.generators.get(MILL)?.charges ?? NaN;

/** A state with a spent generator at cell 0, its cooldown ending at `cooldownEndsAt`. */
function stateWithCoolingMill(
  cooldownEndsAt: number,
  overrides?: Partial<GameState>,
): GameState {
  const state = stateWith(
    { 0: { itemId: MILL, cobwebbed: false } },
    { energy: { value: 0, updatedAt: SAVED_AT }, ...overrides },
  );

  const cell = getCell(state.board, 0);
  if (cell.kind !== 'item') throw new Error('expected an item at cell 0');

  return {
    ...state,
    board: setCell(state.board, 0, {
      kind: 'item',
      item: { ...cell.item, generator: { charges: 0, cooldownEndsAt } },
    }),
  };
}

function millCharges(state: GameState, cell = 0): number {
  const boardCell = getCell(state.board, cell);
  if (boardCell.kind !== 'item' || !boardCell.item.generator) {
    throw new Error('expected a generator');
  }
  return boardCell.item.generator.charges;
}

function ovenWith(slots: OvenState['slots']): OvenState {
  return { ovenId: 'toaster-oven', slots };
}

describe('resolveOffline: energy', () => {
  it('regains one energy per regen period over a minute away', () => {
    // regenSec is 120, so a single minute is not yet a whole period.
    const state = stateWithCoolingMill(SAVED_AT + 10 * MINUTE);
    const { summary } = resolveOffline(
      testData,
      state,
      SAVED_AT,
      SAVED_AT + MINUTE,
    );

    expect(summary.awayMs).toBe(MINUTE);
    expect(summary.energyGained).toBe(0);
  });

  it('regains energy over three hours away', () => {
    const state = stateWithCoolingMill(SAVED_AT + 10 * MINUTE);
    const { state: next, summary } = resolveOffline(
      testData,
      state,
      SAVED_AT,
      SAVED_AT + 3 * HOUR,
    );

    // 3 h / 120 s = 90 periods, from 0.
    expect(summary.energyGained).toBe(90);
    expect(next.energy.value).toBe(90);
  });

  it('caps energy at the economy cap over three days away', () => {
    const state = stateWithCoolingMill(SAVED_AT + 10 * MINUTE);
    const { state: next, summary } = resolveOffline(
      testData,
      state,
      SAVED_AT,
      SAVED_AT + 3 * DAY,
    );

    expect(next.energy.value).toBe(testData.economy.energy.cap);
    expect(summary.energyGained).toBe(testData.economy.energy.cap);
  });
});

describe('resolveOffline: generators', () => {
  it('recharges a board generator whose cooldown ended while away', () => {
    const state = stateWithCoolingMill(SAVED_AT + 5 * MINUTE);
    const { state: next, summary } = resolveOffline(
      testData,
      state,
      SAVED_AT,
      SAVED_AT + 3 * HOUR,
    );

    expect(summary.generatorsRecharged).toBe(1);
    expect(millCharges(next)).toBe(MILL_CHARGES);
    const cell = getCell(next.board, 0);
    if (cell.kind !== 'item') throw new Error('expected an item');
    expect(cell.item.generator?.cooldownEndsAt).toBeNull();
  });

  it('leaves a generator that is still cooling alone', () => {
    const state = stateWithCoolingMill(SAVED_AT + 3 * HOUR);
    const { state: next, summary } = resolveOffline(
      testData,
      state,
      SAVED_AT,
      SAVED_AT + MINUTE,
    );

    expect(summary.generatorsRecharged).toBe(0);
    expect(millCharges(next)).toBe(0);
  });

  it('recharges a generator sitting in the Pantry', () => {
    const pantryMill: BoardItem = {
      itemId: MILL,
      cobwebbed: false,
      generator: { charges: 0, cooldownEndsAt: SAVED_AT + 5 * MINUTE },
    };
    const base = stateWithCoolingMill(SAVED_AT + 3 * HOUR);
    const state: GameState = {
      ...base,
      pantry: { ...base.pantry, items: [pantryMill] },
    };

    const { state: next, summary } = resolveOffline(
      testData,
      state,
      SAVED_AT,
      SAVED_AT + HOUR,
    );

    // The board mill is still cooling; only the Pantry one recharged.
    expect(summary.generatorsRecharged).toBe(1);
    expect(next.pantry.items[0]?.generator).toEqual({
      charges: MILL_CHARGES,
      cooldownEndsAt: null,
    });
    expect(millCharges(next)).toBe(0);
  });
});

describe('resolveOffline: bakes', () => {
  it('lists a bake that finished inside the window and not one that finished before savedAt', () => {
    const base = stateWithCoolingMill(SAVED_AT + 10 * MINUTE);
    const state: GameState = {
      ...base,
      kitchen: {
        ...base.kitchen,
        ovens: [
          ovenWith([
            {
              recipeId: 'bake-cookie',
              startedAt: SAVED_AT - 2 * HOUR,
              endsAt: SAVED_AT - HOUR,
            },
          ]),
          ovenWith([
            {
              recipeId: 'bake-croissant',
              startedAt: SAVED_AT - MINUTE,
              endsAt: SAVED_AT + 30 * MINUTE,
            },
          ]),
          ovenWith([
            {
              recipeId: 'bake-cupcake',
              startedAt: SAVED_AT,
              endsAt: SAVED_AT + 10 * HOUR,
            },
          ]),
        ],
      },
    };

    const { summary } = resolveOffline(
      testData,
      state,
      SAVED_AT,
      SAVED_AT + 3 * HOUR,
    );

    // cookie finished before savedAt; cupcake is still baking.
    expect(summary.bakesFinished).toEqual(['bake-croissant']);
  });

  it('leaves the bakes themselves untouched, since done comes from endsAt', () => {
    const base = stateWithCoolingMill(SAVED_AT + 10 * MINUTE);
    const bake = {
      recipeId: 'bake-cookie',
      startedAt: SAVED_AT,
      endsAt: SAVED_AT + MINUTE,
    };
    const state: GameState = {
      ...base,
      kitchen: { ...base.kitchen, ovens: [ovenWith([bake])] },
    };

    const { state: next } = resolveOffline(
      testData,
      state,
      SAVED_AT,
      SAVED_AT + 3 * HOUR,
    );

    expect(next.kitchen.ovens[0]?.slots[0]).toEqual(bake);
  });
});

describe('resolveOffline: clock going backwards', () => {
  it('changes nothing and reports an all-zero summary', () => {
    const state = stateWithCoolingMill(SAVED_AT + 5 * MINUTE);

    const { state: next, summary } = resolveOffline(
      testData,
      state,
      SAVED_AT,
      SAVED_AT - HOUR,
    );

    expect(next).toBe(state);
    expect(summary).toEqual({
      awayMs: 0,
      energyGained: 0,
      bakesFinished: [],
      generatorsRecharged: 0,
    });
  });
});

describe('shouldShowAwayCard', () => {
  it('is false for a short absence, even with something to report', () => {
    expect(
      shouldShowAwayCard({
        awayMs: 30_000,
        energyGained: 5,
        bakesFinished: ['bake-cookie'],
        generatorsRecharged: 1,
      }),
    ).toBe(false);
  });

  it('is false for a long absence with nothing to report', () => {
    expect(
      shouldShowAwayCard({
        awayMs: 3 * DAY,
        energyGained: 0,
        bakesFinished: [],
        generatorsRecharged: 0,
      }),
    ).toBe(false);
  });

  it('is true for a long absence with anything to report', () => {
    const base = {
      awayMs: 3 * HOUR,
      energyGained: 0,
      bakesFinished: [] as string[],
      generatorsRecharged: 0,
    };

    expect(shouldShowAwayCard({ ...base, energyGained: 1 })).toBe(true);
    expect(
      shouldShowAwayCard({ ...base, bakesFinished: ['bake-cookie'] }),
    ).toBe(true);
    expect(shouldShowAwayCard({ ...base, generatorsRecharged: 1 })).toBe(true);
  });

  it('is true at exactly one minute away', () => {
    expect(
      shouldShowAwayCard({
        awayMs: MINUTE,
        energyGained: 1,
        bakesFinished: [],
        generatorsRecharged: 0,
      }),
    ).toBe(true);
  });
});
