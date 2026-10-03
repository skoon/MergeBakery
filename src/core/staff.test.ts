import { describe, expect, it } from 'vitest';
import { assignStaff, hireStaff, tickStaff } from './staff';
import { staffBakeMultiplier, bakeDurationMs } from './kitchen';
import { createRng } from './rng';
import { stateWith, testData } from './testing';
import type { GameData, GameState, StaffDef } from './types';

const tapper: StaffDef = {
  id: 't',
  name: 'T',
  role: 'tapper',
  hireCost: 100,
  minReputation: 10,
  intervalSec: 300,
  maxCatchUp: 12,
  portraitKey: 'portrait-t',
  minChapter: 'chapter2',
};
const baker: StaffDef = {
  ...tapper,
  id: 'b',
  role: 'baker',
  bakeTimeMultiplier: 0.8,
};
const data: GameData = {
  ...testData,
  staff: new Map([
    ['t', tapper],
    ['b', baker],
  ]),
};
const ready = (over: Partial<GameState> = {}) =>
  stateWith({}, { chapterId: 'chapter2', coins: 500, reputation: 20, ...over });

describe('hireStaff', () => {
  it('spends the coins and records the hire with its time', () => {
    const r = hireStaff(data, ready(), 't', 7000);
    if (!r.ok) throw new Error('expected ok');
    expect(r.state.coins).toBe(400);
    expect(r.state.staff).toEqual([
      { staffId: 't', assignedChain: null, lastActedAt: 7000 },
    ]);
    expect(r.events).toEqual([{ type: 'staffHired', staffId: 't' }]);
  });

  it('rejects: too little coin, too little reputation, wrong chapter, a repeat', () => {
    expect(hireStaff(data, ready({ coins: 99 }), 't', 0)).toEqual({
      ok: false,
      reason: 'notEnoughCoins',
    });
    expect(hireStaff(data, ready({ reputation: 9 }), 't', 0)).toEqual({
      ok: false,
      reason: 'notEnoughReputation',
    });
    expect(hireStaff(data, ready({ chapterId: 'chapter1' }), 't', 0)).toEqual({
      ok: false,
      reason: 'prerequisitesMissing',
    });
    const hired = hireStaff(data, ready(), 't', 0);
    if (!hired.ok) throw new Error('expected ok');
    expect(hireStaff(data, hired.state, 't', 1)).toEqual({
      ok: false,
      reason: 'alreadyCompleted',
    });
  });

  it('throws for someone who is not in the data', () => {
    expect(() => hireStaff(data, ready(), 'nobody', 0)).toThrow();
  });
});

describe('assignStaff', () => {
  const hired = (): GameState => {
    const r = hireStaff(data, ready(), 't', 0);
    if (!r.ok) throw new Error('setup');
    const b = hireStaff(data, r.state, 'b', 0);
    if (!b.ok) throw new Error('setup');
    return b.state;
  };

  it('points a tapper at a generator chain and rests them with null', () => {
    const r = assignStaff(data, hired(), 't', 'flour-mill', 5000);
    if (!r.ok) throw new Error('expected ok');
    expect(r.state.staff[0]?.assignedChain).toBe('flour-mill');
    // The clock starts at the assignment, so idle time isn't banked.
    expect(r.state.staff[0]?.lastActedAt).toBe(5000);
    const back = assignStaff(data, r.state, 't', null, 6000);
    expect(back.ok && back.state.staff[0]?.assignedChain).toBeNull();
  });

  it('changes nothing when the assignment is the same', () => {
    const state = hired();
    const r = assignStaff(data, state, 't', null, 5000);
    expect(r.ok && r.state).toBe(state);
  });

  it('throws for someone not hired, a baker, or a chain with no generator', () => {
    expect(() => assignStaff(data, ready(), 't', null, 0)).toThrow();
    expect(() => assignStaff(data, hired(), 'b', 'flour-mill', 0)).toThrow();
    expect(() => assignStaff(data, hired(), 't', 'flour', 0)).toThrow();
  });
});

describe('tickStaff', () => {
  const hireAndAssign = (
    cells: Record<number, string>,
    over: Partial<GameState> = {},
  ) => {
    let state = stateWith(cells, {
      chapterId: 'chapter2',
      coins: 500,
      reputation: 20,
      ...over,
    });
    const h = hireStaff(data, state, 't', 0);
    if (!h.ok) throw new Error('setup');
    const a = assignStaff(data, h.state, 't', 'flour-mill', 0);
    if (!a.ok) throw new Error('setup');
    state = a.state;
    return state;
  };
  const rng = () => createRng(2);
  const items = (s: GameState) =>
    s.board.cells.filter((c) => c.kind === 'item').length;

  it('does nothing before an interval has passed, or without an assignment', () => {
    const state = hireAndAssign({ 0: 'flour-mill-1' });
    const early = tickStaff(data, state, rng(), 299_999);
    expect(early.ok && early.state).toBe(state);
    const hired = hireStaff(
      data,
      stateWith(
        { 0: 'flour-mill-1' },
        { chapterId: 'chapter2', coins: 500, reputation: 20 },
      ),
      't',
      0,
    );
    if (!hired.ok) throw new Error('setup');
    const idle = tickStaff(data, hired.state, rng(), 9_999_999);
    expect(idle.ok && idle.state).toBe(hired.state);
  });

  it('taps once per interval without spending energy, and keeps the beat', () => {
    const state = hireAndAssign({ 0: 'flour-mill-1' });
    const r = tickStaff(data, state, rng(), 300_000 + 5);
    if (!r.ok) throw new Error('expected ok');
    expect(items(r.state)).toBe(2);
    expect(r.state.energy).toEqual(state.energy);
    expect(r.state.staff[0]?.lastActedAt).toBe(300_000);
    expect(r.events.some((e) => e.type === 'staffActed')).toBe(true);
  });

  it('catches up after an absence, up to maxCatchUp, then starts fresh', () => {
    const state = hireAndAssign({ 0: 'flour-mill-1' });
    const r = tickStaff(data, state, rng(), 300_000 * 100);
    if (!r.ok) throw new Error('expected ok');
    expect(items(r.state)).toBe(1 + 12);
    expect(r.state.staff[0]?.lastActedAt).toBe(300_000 * 100);
  });

  it('works only its own chain, and loses a tap when no generator is ready', () => {
    const wrong = hireAndAssign({ 0: 'dairy-fridge-1' });
    const r = tickStaff(data, wrong, rng(), 300_000);
    if (!r.ok) throw new Error('expected ok');
    expect(items(r.state)).toBe(1);
    // The missed tap is spent, not banked.
    expect(r.state.staff[0]?.lastActedAt).toBe(300_000);
  });
});

describe('staffBakeMultiplier', () => {
  it('multiplies hired bakers in, and shortens a bake by it', () => {
    const none = stateWith({});
    expect(staffBakeMultiplier(data, none)).toBe(1);
    const withBaker = {
      ...none,
      staff: [{ staffId: 'b', assignedChain: null, lastActedAt: 0 }],
    };
    expect(staffBakeMultiplier(data, withBaker)).toBe(0.8);
    const plain = bakeDurationMs(data, 'bake-cookie', 'toaster-oven');
    expect(bakeDurationMs(data, 'bake-cookie', 'toaster-oven', withBaker)).toBe(
      Math.round(plain * 0.8),
    );
  });
});

describe('Auto-Oven', () => {
  const oven: StaffDef = {
    ...tapper,
    id: 'o',
    role: 'oven',
    intervalSec: 120,
    maxCatchUp: 6,
  };
  const ovenData: GameData = {
    ...data,
    staff: new Map([...data.staff, ['o', oven]]),
  };
  const rng = () => createRng(4);
  const working = (cells: Record<number, string>): GameState => {
    const base = stateWith(cells, {
      chapterId: 'chapter2',
      coins: 500,
      reputation: 20,
    });
    const h = hireStaff(ovenData, base, 'o', 0);
    if (!h.ok) throw new Error('setup');
    const b = assignStaff(ovenData, h.state, 'o', null, 0, 'bake-cookie');
    if (!b.ok) throw new Error('setup');
    return b.state;
  };
  const inputs = { 0: 'flour-bag', 1: 'sugar-bowl', 2: 'egg' };

  it('is assigned a recipe, not a chain, and rests with null', () => {
    const s = working({});
    expect(s.staff[0]?.assignedRecipe).toBe('bake-cookie');
    const r = assignStaff(ovenData, s, 'o', null, 5, null);
    expect(r.ok && r.state.staff[0]?.assignedRecipe).toBeNull();
    expect(() => assignStaff(ovenData, s, 'o', null, 5, 'nope')).toThrow();
  });

  it('starts its recipe when the inputs are on the board', () => {
    const r = tickStaff(ovenData, working(inputs), rng(), 120_000);
    if (!r.ok) throw new Error('expected ok');
    const bake = r.state.kitchen.ovens[0]?.slots.find((b) => b !== null);
    expect(bake?.recipeId).toBe('bake-cookie');
    expect(
      r.state.board.cells.slice(0, 3).every((c) => c.kind === 'empty'),
    ).toBe(true);
  });

  it('does nothing without the inputs, and not before its interval', () => {
    const none = working({ 0: 'flour-bag' });
    const r = tickStaff(ovenData, none, rng(), 120_000);
    expect(r.ok && r.state.kitchen).toEqual(none.kitchen);
    const early = working(inputs);
    const e = tickStaff(ovenData, early, rng(), 119_999);
    expect(e.ok && e.state).toBe(early);
  });

  it('collects a finished bake and reloads for the next, over a longer absence', () => {
    const first = tickStaff(
      ovenData,
      working({ ...inputs, 3: 'flour-bag', 4: 'sugar-bowl', 5: 'egg' }),
      rng(),
      120_000,
    );
    if (!first.ok) throw new Error('expected ok');
    // Much later: the cookie is done; collect it and start the second batch.
    const later = tickStaff(ovenData, first.state, rng(), 120_000 + 240_000);
    if (!later.ok) throw new Error('expected ok');
    const ids = later.state.board.cells.flatMap((c) =>
      c.kind === 'item' ? [c.item.itemId] : [],
    );
    expect(ids).toContain('cookie');
    expect(later.state.kitchen.ovens[0]?.slots.some((b) => b !== null)).toBe(
      true,
    );
  });
});
