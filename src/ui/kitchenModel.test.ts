/**
 * Tests for the Kitchen view model (T4.4).
 */

import { describe, it, expect } from 'vitest';
import {
  formatDuration,
  kitchenModel,
  recipeAvailable,
  recipeForDrop,
} from './kitchenModel';
import { testData, stateWith } from '../core/testing';
import type { Bake, GameState, OvenState, Recipe } from '../core/types';

const MINUTE = 60_000;

/** bake-croissant: dough-ball + butter-block, 300 s in a Toaster Oven. */
const CROISSANT_MS = 5 * MINUTE;

function toaster(slots: (Bake | null)[]): OvenState {
  return { ovenId: 'toaster-oven', slots };
}

function withOvens(
  ovens: OvenState[],
  cells: Parameters<typeof stateWith>[0] = {},
): GameState {
  return stateWith(cells, { kitchen: { ovens } });
}

const halfBakedCroissant: Bake = {
  recipeId: 'bake-croissant',
  startedAt: 0,
  endsAt: CROISSANT_MS,
};

describe('formatDuration', () => {
  it('formats under a minute', () => {
    expect(formatDuration(59_000)).toBe('0:59');
  });

  it('formats whole minutes', () => {
    expect(formatDuration(5 * MINUTE)).toBe('5:00');
  });

  it('switches to h:mm:ss at an hour', () => {
    expect(formatDuration((60 * 60 + 2 * 60 + 3) * 1000)).toBe('1:02:03');
  });

  it('rounds seconds up', () => {
    expect(formatDuration(1_500)).toBe('0:02');
    expect(formatDuration(59_001)).toBe('1:00');
  });
});

describe('kitchenModel', () => {
  it('describes an idle kitchen', () => {
    // The Chapter 1 starting generators.
    const model = kitchenModel(
      testData,
      withOvens([toaster([null])], { 0: 'flour-mill-1', 1: 'dairy-fridge-1' }),
      0,
    );

    expect(model.ovens).toHaveLength(1);
    expect(model.ovens[0]?.name).toBe('Toaster Oven');
    expect(model.ovens[0]?.spriteKey).toBe('toaster-oven');
    expect(model.ovens[0]?.slots[0]?.status).toEqual({ kind: 'empty' });
    expect(model.freeSlot).toEqual({ oven: 0, slot: 0 });
    expect(model.ringProgress).toBeNull();
    expect(model.doneCount).toBe(0);
    expect(model.upgrade).toBeNull();
    expect(model.recipes.map((r) => r.recipeId)).toEqual(['bake-croissant']);
  });

  it('shows a croissant halfway baked', () => {
    const state: GameState = {
      ...withOvens([toaster([halfBakedCroissant])]),
      gems: 100,
    };
    const model = kitchenModel(testData, state, CROISSANT_MS / 2);
    const slot = model.ovens[0]?.slots[0];

    expect(model.ringProgress).toBe(0.5);
    expect(slot?.recipeName).toBe('Croissant');
    expect(slot?.timeLeft).toBe('2:30');
    // 2.5 min left rounds up to 3 whole minutes.
    expect(slot?.rushCost).toBe(3 * testData.economy.rushGemsPerMinute);
    expect(slot?.canAffordRush).toBe(true);
    expect(model.freeSlot).toBeNull();
  });

  it('marks a rush unaffordable without enough gems', () => {
    const state: GameState = {
      ...withOvens([toaster([halfBakedCroissant])]),
      gems: 0,
    };
    const slot = kitchenModel(testData, state, CROISSANT_MS / 2).ovens[0]
      ?.slots[0];

    expect(slot?.canAffordRush).toBe(false);
  });

  it('counts a finished bake', () => {
    const model = kitchenModel(
      testData,
      withOvens([toaster([halfBakedCroissant])]),
      CROISSANT_MS,
    );

    expect(model.doneCount).toBe(1);
    expect(model.ringProgress).toBeNull();
    expect(model.ovens[0]?.slots[0]?.status.kind).toBe('done');
    expect(model.ovens[0]?.slots[0]?.timeLeft).toBeNull();
    expect(model.ovens[0]?.slots[0]?.rushCost).toBeNull();
  });

  it('gives cells in recipe order for a recipe whose inputs are all on the board', () => {
    const state = withOvens([toaster([null])], {
      2: 'butter-block',
      5: 'dough-ball',
    });
    const croissant = kitchenModel(testData, state, 0).recipes.find(
      (r) => r.recipeId === 'bake-croissant',
    );

    expect(croissant?.cells).toEqual([5, 2]);
    expect(croissant?.inputs.map((i) => i.ready)).toEqual([true, true]);
    expect(croissant?.bakeTime).toBe('5:00');
  });

  it('gives null cells and per-input readiness when an input is missing', () => {
    // The Sugar Tin makes the cookie available; the sugar bowl isn't made yet.
    const state = withOvens([toaster([null])], {
      0: 'flour-bag',
      1: 'egg',
      2: 'sugar-tin-1',
    });
    const cookie = kitchenModel(testData, state, 0).recipes.find(
      (r) => r.recipeId === 'bake-cookie',
    );

    expect(cookie?.cells).toBeNull();
    // flour-bag, sugar-bowl, egg
    expect(cookie?.inputs.map((i) => i.ready)).toEqual([true, false, true]);
  });

  it('has no free slot when every slot is busy', () => {
    const model = kitchenModel(
      testData,
      withOvens([toaster([halfBakedCroissant]), toaster([halfBakedCroissant])]),
      0,
    );

    expect(model.freeSlot).toBeNull();
  });

  it('offers an upgrade for two Toaster Ovens', () => {
    const model = kitchenModel(
      testData,
      withOvens([toaster([null]), toaster([null])]),
      0,
    );

    expect(model.upgrade).toEqual({ from: 1, to: 0, nextName: 'Brick Oven' });
  });
});

describe('recipeAvailable', () => {
  function recipe(id: string): Recipe {
    const found = testData.recipes.get(id);
    if (!found) throw new Error(`no recipe ${id}`);
    return found;
  }

  function availableIds(state: GameState): string[] {
    return Array.from(testData.recipes.values())
      .filter((r) => recipeAvailable(testData, state, r))
      .map((r) => r.id);
  }

  it('offers only the croissant with the Chapter 1 generators', () => {
    const state = stateWith({ 0: 'flour-mill-1', 1: 'dairy-fridge-1' });

    expect(availableIds(state)).toEqual(['bake-croissant']);
  });

  it('offers every recipe once the Hen Coop and Sugar Tin are owned', () => {
    const state = stateWith({
      0: 'flour-mill-1',
      1: 'dairy-fridge-1',
      2: 'hen-coop-1',
      3: 'sugar-tin-1',
    });

    expect(availableIds(state)).toEqual([
      'bake-cookie',
      'bake-croissant',
      'bake-cupcake',
    ]);
  });

  it('counts a generator kept in the Pantry', () => {
    const base = stateWith({ 0: 'flour-mill-1' });
    const state: GameState = {
      ...base,
      pantry: {
        ...base.pantry,
        items: [
          {
            itemId: 'dairy-fridge-1',
            cobwebbed: false,
            generator: { charges: 12, cooldownEndsAt: null },
          },
        ],
      },
    };

    expect(recipeAvailable(testData, state, recipe('bake-croissant'))).toBe(
      true,
    );
  });

  it('does not count a cobwebbed generator', () => {
    const state = stateWith({
      0: 'flour-mill-1',
      1: { itemId: 'dairy-fridge-1', cobwebbed: true },
    });

    expect(recipeAvailable(testData, state, recipe('bake-croissant'))).toBe(
      false,
    );
  });

  it('counts inputs already on the board without their generator', () => {
    const state = stateWith({ 0: 'flour-bag', 1: 'egg-pair', 2: 'cream-jug' });

    expect(recipeAvailable(testData, state, recipe('bake-cupcake'))).toBe(true);
  });
});

describe('recipeForDrop', () => {
  it('loads a croissant for a dropped dough ball with butter on the board', () => {
    const state = withOvens([toaster([null])], {
      3: 'dough-ball',
      7: 'butter-block',
    });

    expect(recipeForDrop(testData, state, 3)).toEqual({
      recipeId: 'bake-croissant',
      cells: [3, 7],
      slot: { oven: 0, slot: 0 },
    });
  });

  it('uses the dropped cell even when the same item sits at a lower index', () => {
    const state = withOvens([toaster([null])], {
      1: 'dough-ball',
      3: 'dough-ball',
      7: 'butter-block',
    });

    expect(recipeForDrop(testData, state, 3)?.cells).toEqual([3, 7]);
  });

  it('returns null without butter on the board', () => {
    const state = withOvens([toaster([null])], { 3: 'dough-ball' });

    expect(recipeForDrop(testData, state, 3)).toBeNull();
  });

  it('returns null when no slot is free', () => {
    const state = withOvens([toaster([halfBakedCroissant])], {
      3: 'dough-ball',
      7: 'butter-block',
    });

    expect(recipeForDrop(testData, state, 3)).toBeNull();
  });
});
