/**
 * Tests for the Kitchen view model (T4.4).
 */

import { describe, it, expect } from 'vitest';
import { formatDuration, kitchenModel, recipeForDrop } from './kitchenModel';
import { testData, stateWith } from '../core/testing';
import type { Bake, GameState, OvenState } from '../core/types';

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
    const model = kitchenModel(testData, withOvens([toaster([null])]), 0);

    expect(model.ovens).toHaveLength(1);
    expect(model.ovens[0]?.name).toBe('Toaster Oven');
    expect(model.ovens[0]?.slots[0]?.status).toEqual({ kind: 'empty' });
    expect(model.freeSlot).toEqual({ oven: 0, slot: 0 });
    expect(model.ringProgress).toBeNull();
    expect(model.doneCount).toBe(0);
    expect(model.upgrade).toBeNull();
    expect(model.recipes.map((r) => r.recipeId)).toEqual([
      'bake-cookie',
      'bake-croissant',
      'bake-cupcake',
    ]);
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
    const state = withOvens([toaster([null])], { 0: 'flour-bag', 1: 'egg' });
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
