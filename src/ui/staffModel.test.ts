import { describe, expect, it } from 'vitest';
import { staffModel } from './staffModel';
import { stateWith, testData } from '../core/testing';
import type { GameData, StaffDef } from '../core/types';

const person = (over: Partial<StaffDef>): StaffDef => ({
  id: 'sam',
  name: 'Sam',
  role: 'tapper',
  hireCost: 100,
  minReputation: 10,
  intervalSec: 300,
  maxCatchUp: 12,
  portraitKey: 'portrait-sam',
  minChapter: 'chapter2',
  ...over,
});
const data: GameData = {
  ...testData,
  staff: new Map([
    ['sam', person({})],
    [
      'pip',
      person({
        id: 'pip',
        name: 'Pip',
        role: 'baker',
        bakeTimeMultiplier: 0.8,
        intervalSec: undefined,
      }),
    ],
    ['late', person({ id: 'late', name: 'Late', minChapter: 'chapter3' })],
  ]),
};
const state = (over = {}) =>
  stateWith(
    { 0: 'flour-mill-1', 1: 'flour-mill-2', 2: 'contest-mixer-1' },
    { chapterId: 'chapter2', coins: 500, reputation: 20, ...over },
  );

describe('staffModel', () => {
  it('lists only people from chapters reached, with a blurb per role', () => {
    const m = staffModel(data, state());
    expect(m.rows.map((r) => r.staffId)).toEqual(['sam', 'pip']);
    expect(m.rows[0]?.blurb).toBe('Taps a generator every 5 min, no energy');
    expect(m.rows[1]?.blurb).toBe('Bakes 20% faster');
    expect(m.reputation).toBe(20);
  });

  it('says why a hire is blocked, else lets it through', () => {
    expect(
      staffModel(data, state({ reputation: 3 })).rows[0]?.hireBlocked,
    ).toBe('Needs 10 reputation');
    expect(staffModel(data, state({ coins: 40 })).rows[0]?.hireBlocked).toBe(
      'Needs 60 more coins',
    );
    expect(staffModel(data, state()).rows[0]?.hireBlocked).toBeNull();
  });

  it('offers a tapper each generator chain on the board once, never an event generator', () => {
    const m = staffModel(data, state());
    expect(m.rows[0]?.chainOptions).toEqual([
      { chainId: 'flour-mill', name: 'Flour Mill' },
    ]);
    expect(m.rows[1]?.chainOptions).toEqual([]);
  });

  it('shows a hired tapper as hired with their chain', () => {
    const s = state({
      staff: [{ staffId: 'sam', assignedChain: 'flour-mill', lastActedAt: 0 }],
    });
    const row = staffModel(data, s).rows[0];
    expect(row?.hired).toBe(true);
    expect(row?.assignedChain).toBe('flour-mill');
    expect(row?.hireBlocked).toBeNull();
  });

  it('gives an Auto-Oven the recipes the player can make', () => {
    const withOven: GameData = {
      ...data,
      staff: new Map([
        ...data.staff,
        [
          'oven',
          person({ id: 'oven', name: 'Oven', role: 'oven', intervalSec: 120 }),
        ],
      ]),
    };
    const row = staffModel(
      withOven,
      stateWith(
        { 0: 'flour-mill-1', 1: 'dairy-fridge-1' },
        { chapterId: 'chapter2' },
      ),
    ).rows.find((r) => r.staffId === 'oven');
    expect(row?.blurb).toBe('Collects and reloads a recipe every 2 min');
    expect(row?.chainOptions).toEqual([]);
    expect(row?.recipeOptions.map((r) => r.recipeId)).toEqual([
      'bake-croissant',
    ]);
    expect(row?.assignedRecipe).toBeNull();
  });
});
