import { describe, expect, it } from 'vitest';
import { assignStaff, hireStaff } from './staff';
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
    const r = assignStaff(data, hired(), 't', 'flour-mill');
    if (!r.ok) throw new Error('expected ok');
    expect(r.state.staff[0]?.assignedChain).toBe('flour-mill');
    const back = assignStaff(data, r.state, 't', null);
    expect(back.ok && back.state.staff[0]?.assignedChain).toBeNull();
  });

  it('changes nothing when the assignment is the same', () => {
    const state = hired();
    const r = assignStaff(data, state, 't', null);
    expect(r.ok && r.state).toBe(state);
  });

  it('throws for someone not hired, a baker, or a chain with no generator', () => {
    expect(() => assignStaff(data, ready(), 't', null)).toThrow();
    expect(() => assignStaff(data, hired(), 'b', 'flour-mill')).toThrow();
    expect(() => assignStaff(data, hired(), 't', 'flour')).toThrow();
  });
});
