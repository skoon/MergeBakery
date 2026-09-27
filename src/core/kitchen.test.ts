/**
 * Tests for kitchen.ts (T4.1).
 */

import { describe, it, expect } from 'vitest';
import type { Bake } from './types';
import { getBake, setBake, bakeDurationMs, loadRecipe } from './kitchen';
import { stateWith, testData } from './testing';

describe('kitchen', () => {
  describe('getBake', () => {
    it('returns null for an empty slot', () => {
      const state = stateWith({});
      const bake = getBake(state, { oven: 0, slot: 0 });
      expect(bake).toBeNull();
    });

    it('returns the bake when a slot is occupied', () => {
      const state = stateWith({});
      const testBake: Bake = {
        recipeId: 'bake-croissant',
        startedAt: 1000,
        endsAt: 301000,
      };
      const stateWithBake = setBake(state, { oven: 0, slot: 0 }, testBake);
      const retrieved = getBake(stateWithBake, { oven: 0, slot: 0 });
      expect(retrieved).toEqual(testBake);
    });

    it('throws RangeError for an invalid oven index', () => {
      const state = stateWith({});
      expect(() => getBake(state, { oven: 999, slot: 0 })).toThrow(RangeError);
    });

    it('throws RangeError for an invalid slot index', () => {
      const state = stateWith({});
      expect(() => getBake(state, { oven: 0, slot: 999 })).toThrow(RangeError);
    });
  });

  describe('setBake', () => {
    it('sets a bake in an empty slot', () => {
      const state = stateWith({});
      const testBake: Bake = {
        recipeId: 'bake-croissant',
        startedAt: 1000,
        endsAt: 301000,
      };
      const newState = setBake(state, { oven: 0, slot: 0 }, testBake);
      expect(getBake(newState, { oven: 0, slot: 0 })).toEqual(testBake);
    });

    it('replaces a bake in an occupied slot', () => {
      const state = stateWith({});
      const bake1: Bake = {
        recipeId: 'bake-croissant',
        startedAt: 1000,
        endsAt: 301000,
      };
      const bake2: Bake = {
        recipeId: 'bake-cookie',
        startedAt: 2000,
        endsAt: 62000,
      };
      const state1 = setBake(state, { oven: 0, slot: 0 }, bake1);
      const state2 = setBake(state1, { oven: 0, slot: 0 }, bake2);
      expect(getBake(state2, { oven: 0, slot: 0 })).toEqual(bake2);
    });

    it('does not mutate the input state', () => {
      const state = stateWith({});
      const testBake: Bake = {
        recipeId: 'bake-croissant',
        startedAt: 1000,
        endsAt: 301000,
      };
      const originalOvens = state.kitchen.ovens;
      setBake(state, { oven: 0, slot: 0 }, testBake);
      expect(state.kitchen.ovens).toBe(originalOvens);
      expect(getBake(state, { oven: 0, slot: 0 })).toBeNull();
    });

    it('throws RangeError for an invalid oven index', () => {
      const state = stateWith({});
      const testBake: Bake = {
        recipeId: 'bake-croissant',
        startedAt: 1000,
        endsAt: 301000,
      };
      expect(() => setBake(state, { oven: 999, slot: 0 }, testBake)).toThrow(
        RangeError,
      );
    });

    it('throws RangeError for an invalid slot index', () => {
      const state = stateWith({});
      const testBake: Bake = {
        recipeId: 'bake-croissant',
        startedAt: 1000,
        endsAt: 301000,
      };
      expect(() => setBake(state, { oven: 0, slot: 999 }, testBake)).toThrow(
        RangeError,
      );
    });
  });

  describe('bakeDurationMs', () => {
    it('calculates duration for a Croissant in a Toaster Oven', () => {
      const duration = bakeDurationMs(
        testData,
        'bake-croissant',
        'toaster-oven',
      );
      expect(duration).toBe(300000); // 300 * 1000 * 1.0
    });

    it('applies the Brick Oven 0.8 multiplier', () => {
      const duration = bakeDurationMs(testData, 'bake-croissant', 'brick-oven');
      expect(duration).toBe(240000); // 300 * 1000 * 0.8
    });

    it('rounds to whole milliseconds', () => {
      const duration = bakeDurationMs(testData, 'bake-cupcake', 'brick-oven');
      expect(duration).toBe(720000); // 900 * 1000 * 0.8 = 720000
      expect(Number.isInteger(duration)).toBe(true);
    });

    it('throws for an unknown recipe id', () => {
      expect(() =>
        bakeDurationMs(testData, 'unknown-recipe', 'toaster-oven'),
      ).toThrow();
    });

    it('throws for an unknown oven id', () => {
      expect(() =>
        bakeDurationMs(testData, 'bake-croissant', 'unknown-oven'),
      ).toThrow();
    });
  });

  describe('loadRecipe', () => {
    it('successfully loads a Croissant with both cells emptied', () => {
      const now = 1000000;
      const state = stateWith({
        0: 'dough-ball',
        1: 'butter-block',
      });

      const result = loadRecipe(
        testData,
        state,
        { oven: 0, slot: 0 },
        'bake-croissant',
        [0, 1],
        now,
      );

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('Expected ok: true');

      // Check cells are emptied
      const cell0 = result.state.board.cells[0];
      const cell1 = result.state.board.cells[1];
      expect(cell0).toEqual({ kind: 'empty' });
      expect(cell1).toEqual({ kind: 'empty' });

      // Check bake was set
      const bake = getBake(result.state, { oven: 0, slot: 0 });
      expect(bake).not.toBeNull();
      if (bake === null) throw new Error('Expected bake to be set');
      expect(bake.recipeId).toBe('bake-croissant');
      expect(bake.startedAt).toBe(now);
      expect(bake.endsAt).toBe(now + 300000);

      // Check event
      expect(result.events).toHaveLength(1);
      expect(result.events[0]).toEqual({
        type: 'bakeStarted',
        slot: { oven: 0, slot: 0 },
        recipeId: 'bake-croissant',
      });
    });

    it('applies the Brick Oven 0.8 multiplier', () => {
      const now = 1000000;
      const state = stateWith(
        {
          0: 'dough-ball',
          1: 'butter-block',
        },
        {
          kitchen: {
            ovens: [
              {
                ovenId: 'brick-oven',
                slots: [null, null],
              },
            ],
          },
        },
      );

      const result = loadRecipe(
        testData,
        state,
        { oven: 0, slot: 0 },
        'bake-croissant',
        [0, 1],
        now,
      );

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('Expected ok: true');

      const bake = getBake(result.state, { oven: 0, slot: 0 });
      expect(bake).not.toBeNull();
      if (bake === null) throw new Error('Expected bake to be set');
      expect(bake.endsAt).toBe(now + 240000); // 300 * 1000 * 0.8
    });

    it('rejects with slotBusy when the slot is occupied', () => {
      const now = 1000000;
      const state = stateWith({
        0: 'dough-ball',
        1: 'butter-block',
      });

      // Set a bake in the slot
      const stateWithBake = setBake(
        state,
        { oven: 0, slot: 0 },
        {
          recipeId: 'bake-cookie',
          startedAt: 500000,
          endsAt: 560000,
        },
      );

      const result = loadRecipe(
        testData,
        stateWithBake,
        { oven: 0, slot: 0 },
        'bake-croissant',
        [0, 1],
        now,
      );

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('Expected ok: false');
      expect(result.reason).toBe('slotBusy');
    });

    it('rejects with missingItems when a cell is empty', () => {
      const now = 1000000;
      const state = stateWith({
        0: 'dough-ball',
        // cell 1 is empty
      });

      const result = loadRecipe(
        testData,
        state,
        { oven: 0, slot: 0 },
        'bake-croissant',
        [0, 1],
        now,
      );

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('Expected ok: false');
      expect(result.reason).toBe('missingItems');
    });

    it('rejects with missingItems when a cell is locked', () => {
      const now = 1000000;
      const state = stateWith({
        0: 'dough-ball',
        1: 'crate',
      });

      const result = loadRecipe(
        testData,
        state,
        { oven: 0, slot: 0 },
        'bake-croissant',
        [0, 1],
        now,
      );

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('Expected ok: false');
      expect(result.reason).toBe('missingItems');
    });

    it('rejects with missingItems when a cell has the wrong item', () => {
      const now = 1000000;
      const state = stateWith({
        0: 'dough-ball',
        1: 'flour-bag', // wrong item
      });

      const result = loadRecipe(
        testData,
        state,
        { oven: 0, slot: 0 },
        'bake-croissant',
        [0, 1],
        now,
      );

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('Expected ok: false');
      expect(result.reason).toBe('missingItems');
    });

    it('rejects with missingItems when a cell has a cobwebbed item', () => {
      const now = 1000000;
      const state = stateWith({
        0: 'dough-ball',
        1: { itemId: 'butter-block', cobwebbed: true },
      });

      const result = loadRecipe(
        testData,
        state,
        { oven: 0, slot: 0 },
        'bake-croissant',
        [0, 1],
        now,
      );

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('Expected ok: false');
      expect(result.reason).toBe('missingItems');
    });

    it('throws for an unknown recipe id', () => {
      const now = 1000000;
      const state = stateWith({
        0: 'dough-ball',
        1: 'butter-block',
      });

      expect(() =>
        loadRecipe(
          testData,
          state,
          { oven: 0, slot: 0 },
          'unknown-recipe',
          [0, 1],
          now,
        ),
      ).toThrow();
    });

    it('throws for a bad slot', () => {
      const now = 1000000;
      const state = stateWith({
        0: 'dough-ball',
        1: 'butter-block',
      });

      expect(() =>
        loadRecipe(
          testData,
          state,
          { oven: 999, slot: 0 },
          'bake-croissant',
          [0, 1],
          now,
        ),
      ).toThrow();
    });

    it('throws for a wrong-length cells array', () => {
      const now = 1000000;
      const state = stateWith({
        0: 'dough-ball',
        1: 'butter-block',
      });

      expect(() =>
        loadRecipe(
          testData,
          state,
          { oven: 0, slot: 0 },
          'bake-croissant',
          [0], // Wrong length
          now,
        ),
      ).toThrow();
    });

    it('throws for a repeated cell in the cells array', () => {
      const now = 1000000;
      const state = stateWith({
        0: 'dough-ball',
        1: 'butter-block',
      });

      expect(() =>
        loadRecipe(
          testData,
          state,
          { oven: 0, slot: 0 },
          'bake-croissant',
          [0, 0], // Repeated cell
          now,
        ),
      ).toThrow();
    });

    it('does not mutate the input state on success', () => {
      const now = 1000000;
      const state = stateWith({
        0: 'dough-ball',
        1: 'butter-block',
      });

      const originalBoard = state.board;
      const originalKitchen = state.kitchen;

      const result = loadRecipe(
        testData,
        state,
        { oven: 0, slot: 0 },
        'bake-croissant',
        [0, 1],
        now,
      );

      expect(state.board).toBe(originalBoard);
      expect(state.kitchen).toBe(originalKitchen);
      expect(result.ok).toBe(true);
    });

    it('does not mutate the input state on rejection', () => {
      const now = 1000000;
      const state = stateWith({
        0: 'dough-ball',
        // cell 1 is empty
      });

      const originalBoard = state.board;
      const originalKitchen = state.kitchen;

      const result = loadRecipe(
        testData,
        state,
        { oven: 0, slot: 0 },
        'bake-croissant',
        [0, 1],
        now,
      );

      expect(state.board).toBe(originalBoard);
      expect(state.kitchen).toBe(originalKitchen);
      expect(result.ok).toBe(false);
    });
  });
});
