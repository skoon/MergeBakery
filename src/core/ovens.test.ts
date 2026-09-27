/**
 * Tests for ovens.ts (T4.3).
 */

import { describe, it, expect } from 'vitest';
import type { Bake, OvenState } from './types';
import { nextOven, mergeOvens } from './ovens';
import { stateWith, testData } from './testing';

describe('ovens', () => {
  describe('nextOven', () => {
    it('returns the Brick Oven for the Toaster Oven', () => {
      const oven = nextOven(testData, 'toaster-oven');
      expect(oven).toEqual(testData.ovens.get('brick-oven'));
    });

    it('returns the Deck Oven for the Brick Oven', () => {
      const oven = nextOven(testData, 'brick-oven');
      expect(oven).toEqual(testData.ovens.get('deck-oven'));
    });

    it('returns null for the Deck Oven, the top tier', () => {
      const oven = nextOven(testData, 'deck-oven');
      expect(oven).toBeNull();
    });

    it('throws for an unknown oven id', () => {
      expect(() => nextOven(testData, 'unknown-oven')).toThrow();
    });
  });

  describe('mergeOvens', () => {
    it('merges two empty Toaster Ovens into a Brick Oven with 2 empty slots', () => {
      const ovens: OvenState[] = [
        { ovenId: 'toaster-oven', slots: [null] },
        { ovenId: 'toaster-oven', slots: [null] },
      ];
      const state = stateWith({}, { kitchen: { ovens } });

      const result = mergeOvens(testData, state, 0, 1);

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('Expected ok: true');

      expect(result.state.kitchen.ovens).toHaveLength(1);
      expect(result.state.kitchen.ovens[0]).toEqual({
        ovenId: 'brick-oven',
        slots: [null, null],
      });
      expect(result.events).toEqual([
        { type: 'ovenUpgraded', oven: 0, ovenId: 'brick-oven' },
      ]);
    });

    it('keeps running bakes' + "' endsAt and orders slots as to's bakes then from's", () => {
      const toBake: Bake = {
        recipeId: 'bake-croissant',
        startedAt: 1000,
        endsAt: 301000,
      };
      const fromBake: Bake = {
        recipeId: 'bake-cookie',
        startedAt: 2000,
        endsAt: 62000,
      };
      const ovens: OvenState[] = [
        { ovenId: 'toaster-oven', slots: [toBake] },
        { ovenId: 'toaster-oven', slots: [fromBake] },
      ];
      const state = stateWith({}, { kitchen: { ovens } });

      const result = mergeOvens(testData, state, 1, 0);

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('Expected ok: true');

      const upgraded = result.state.kitchen.ovens[0];
      expect(upgraded).toEqual({
        ovenId: 'brick-oven',
        slots: [toBake, fromBake],
      });
      // Both bakes keep their original startedAt/endsAt exactly.
      expect(upgraded?.slots[0]).toEqual(toBake);
      expect(upgraded?.slots[1]).toEqual(fromBake);
    });

    it('gives the merged oven a new empty slot alongside a still-running bake', () => {
      const runningBake: Bake = {
        recipeId: 'bake-croissant',
        startedAt: 1000,
        endsAt: 301000,
      };
      const ovens: OvenState[] = [
        { ovenId: 'toaster-oven', slots: [runningBake] },
        { ovenId: 'toaster-oven', slots: [null] },
      ];
      const state = stateWith({}, { kitchen: { ovens } });

      const result = mergeOvens(testData, state, 1, 0);

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('Expected ok: true');

      const upgraded = result.state.kitchen.ovens[0];
      expect(upgraded?.ovenId).toBe('brick-oven');
      expect(upgraded?.slots).toEqual([runningBake, null]);
    });

    it("rejects 'sameCell' when from === to", () => {
      const state = stateWith({});

      const result = mergeOvens(testData, state, 0, 0);

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('Expected ok: false');
      expect(result.reason).toBe('sameCell');
    });

    it("rejects 'ovensDontMatch' when the two ovens are different", () => {
      const ovens: OvenState[] = [
        { ovenId: 'toaster-oven', slots: [null] },
        { ovenId: 'brick-oven', slots: [null, null] },
      ];
      const state = stateWith({}, { kitchen: { ovens } });

      const result = mergeOvens(testData, state, 0, 1);

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('Expected ok: false');
      expect(result.reason).toBe('ovensDontMatch');
    });

    it("rejects 'ovenMaxTier' when merging two top-tier Deck Ovens", () => {
      const ovens: OvenState[] = [
        { ovenId: 'deck-oven', slots: [null, null, null] },
        { ovenId: 'deck-oven', slots: [null, null, null] },
      ];
      const state = stateWith({}, { kitchen: { ovens } });

      const result = mergeOvens(testData, state, 0, 1);

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('Expected ok: false');
      expect(result.reason).toBe('ovenMaxTier');
    });

    it("rejects 'slotBusy' when two Brick Ovens hold 4 bakes (more than the Deck Oven's 3 slots)", () => {
      const makeBake = (endsAt: number): Bake => ({
        recipeId: 'bake-croissant',
        startedAt: 0,
        endsAt,
      });
      const ovens: OvenState[] = [
        { ovenId: 'brick-oven', slots: [makeBake(300000), makeBake(-100)] }, // one running, one already finished
        { ovenId: 'brick-oven', slots: [makeBake(300000), makeBake(300000)] },
      ];
      const state = stateWith({}, { kitchen: { ovens } });

      const result = mergeOvens(testData, state, 1, 0);

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('Expected ok: false');
      expect(result.reason).toBe('slotBusy');
    });

    it('allows two Brick Ovens holding exactly 3 bakes to become a Deck Oven with 3 bakes', () => {
      const bakeA: Bake = {
        recipeId: 'bake-croissant',
        startedAt: 0,
        endsAt: 300000,
      };
      const bakeB: Bake = {
        recipeId: 'bake-cookie',
        startedAt: 0,
        endsAt: 60000,
      };
      const bakeC: Bake = {
        recipeId: 'bake-cupcake',
        startedAt: 0,
        endsAt: 900000,
      };
      const ovens: OvenState[] = [
        { ovenId: 'brick-oven', slots: [bakeA, bakeB] },
        { ovenId: 'brick-oven', slots: [bakeC, null] },
      ];
      const state = stateWith({}, { kitchen: { ovens } });

      const result = mergeOvens(testData, state, 1, 0);

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('Expected ok: true');

      const upgraded = result.state.kitchen.ovens[0];
      expect(upgraded).toEqual({
        ovenId: 'deck-oven',
        slots: [bakeA, bakeB, bakeC],
      });
    });

    it('returns the upgraded index after from is removed, when from comes before to', () => {
      const ovens: OvenState[] = [
        { ovenId: 'toaster-oven', slots: [null] },
        { ovenId: 'toaster-oven', slots: [null] },
        { ovenId: 'toaster-oven', slots: [null] },
      ];
      const state = stateWith({}, { kitchen: { ovens } });

      const result = mergeOvens(testData, state, 0, 2);

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('Expected ok: true');

      expect(result.state.kitchen.ovens).toHaveLength(2);
      expect(result.events).toEqual([
        { type: 'ovenUpgraded', oven: 1, ovenId: 'brick-oven' },
      ]);
      expect(result.state.kitchen.ovens[1]).toEqual({
        ovenId: 'brick-oven',
        slots: [null, null],
      });
    });

    it('returns the upgraded index after from is removed, when from comes after to', () => {
      const ovens: OvenState[] = [
        { ovenId: 'toaster-oven', slots: [null] },
        { ovenId: 'toaster-oven', slots: [null] },
        { ovenId: 'toaster-oven', slots: [null] },
      ];
      const state = stateWith({}, { kitchen: { ovens } });

      const result = mergeOvens(testData, state, 2, 0);

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('Expected ok: true');

      expect(result.state.kitchen.ovens).toHaveLength(2);
      expect(result.events).toEqual([
        { type: 'ovenUpgraded', oven: 0, ovenId: 'brick-oven' },
      ]);
      expect(result.state.kitchen.ovens[0]).toEqual({
        ovenId: 'brick-oven',
        slots: [null, null],
      });
    });

    it('throws RangeError for a bad from index', () => {
      const state = stateWith({});
      expect(() => mergeOvens(testData, state, 99, 0)).toThrow(RangeError);
    });

    it('throws RangeError for a bad to index', () => {
      const state = stateWith({});
      expect(() => mergeOvens(testData, state, 0, 99)).toThrow(RangeError);
    });

    it('does not mutate the input state on success', () => {
      const ovens: OvenState[] = [
        { ovenId: 'toaster-oven', slots: [null] },
        { ovenId: 'toaster-oven', slots: [null] },
      ];
      const state = stateWith({}, { kitchen: { ovens } });
      const originalKitchen = state.kitchen;

      const result = mergeOvens(testData, state, 0, 1);

      expect(state.kitchen).toBe(originalKitchen);
      expect(result.ok).toBe(true);
    });

    it('does not mutate the input state on rejection', () => {
      const state = stateWith({});
      const originalKitchen = state.kitchen;

      const result = mergeOvens(testData, state, 0, 0);

      expect(state.kitchen).toBe(originalKitchen);
      expect(result.ok).toBe(false);
    });
  });
});
