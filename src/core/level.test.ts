import { describe, it, expect } from 'vitest';
import { levelForXp, addXp } from './level';
import { stateWith, testData } from './testing';
import { createNewGame } from './newGame';

describe('levelForXp', () => {
  it('returns level 1 at 0 xp', () => {
    expect(levelForXp(testData, 0)).toBe(1);
  });

  it('returns level 1 below the next threshold', () => {
    expect(levelForXp(testData, 19)).toBe(1);
  });

  it('returns level 2 at exactly the threshold', () => {
    expect(levelForXp(testData, 20)).toBe(2);
  });

  it('returns the appropriate level for intermediate xp', () => {
    expect(levelForXp(testData, 50)).toBe(2);
    expect(levelForXp(testData, 60)).toBe(3);
    expect(levelForXp(testData, 100)).toBe(3);
    expect(levelForXp(testData, 120)).toBe(4);
  });

  it('returns the highest level beyond the last defined level', () => {
    // Level 30 has xpTotal 8700
    expect(levelForXp(testData, 8700)).toBe(30);
    expect(levelForXp(testData, 10000)).toBe(30);
  });
});

describe('addXp', () => {
  it('returns the same state for zero amount', () => {
    const state = createNewGame(testData, 1, 0);
    const result = addXp(testData, state, 0, 1000);

    expect(result.state).toEqual(state);
    expect(result.events).toEqual([]);
  });

  it('throws on negative amount', () => {
    const state = createNewGame(testData, 1, 0);
    expect(() => addXp(testData, state, -1, 1000)).toThrow();
  });

  it('adds xp without level-up when below next level', () => {
    const state = stateWith({}, { xp: 0, level: 1, gems: 100 });
    const result = addXp(testData, state, 10, 1000);

    expect(result.state.xp).toBe(10);
    expect(result.state.level).toBe(1);
    expect(result.state.gems).toBe(100);
    expect(result.events).toEqual([]);
  });

  it('triggers level-up when reaching exactly the threshold', () => {
    const state = stateWith({}, { xp: 0, level: 1, gems: 100 });
    const result = addXp(testData, state, 20, 1000);

    expect(result.state.xp).toBe(20);
    expect(result.state.level).toBe(2);
    expect(result.state.gems).toBe(105); // 100 + 5 gems from level 2
    expect(result.events).toEqual([{ type: 'levelUp', level: 2, gems: 5 }]);
  });

  it('triggers multiple level-ups in order', () => {
    const state = stateWith({}, { xp: 0, level: 1, gems: 100 });
    const result = addXp(testData, state, 130, 1000); // Reaches levels 2, 3, 4

    expect(result.state.xp).toBe(130);
    expect(result.state.level).toBe(4);
    expect(result.state.gems).toBe(115); // 100 + 5 + 5 + 5
    expect(result.events).toEqual([
      { type: 'levelUp', level: 2, gems: 5 },
      { type: 'levelUp', level: 3, gems: 5 },
      { type: 'levelUp', level: 4, gems: 5 },
    ]);
  });

  it('refills energy to max when at lower level', () => {
    const state = stateWith(
      {},
      {
        xp: 0,
        level: 1,
        gems: 100,
        energy: { value: 30, updatedAt: 0 },
      },
    );
    const result = addXp(testData, state, 20, 2000);

    expect(result.state.energy.value).toBe(100); // Refilled to cap
    expect(result.state.energy.updatedAt).toBe(2000);
  });

  it('does not lower energy when above cap', () => {
    const state = stateWith(
      {},
      {
        xp: 0,
        level: 1,
        gems: 100,
        energy: { value: 150, updatedAt: 0 }, // Above cap (100)
      },
    );
    const result = addXp(testData, state, 20, 2000);

    expect(result.state.energy.value).toBe(150); // Kept at 150
    expect(result.state.energy.updatedAt).toBe(2000);
  });

  it('keeps energy above cap when refilling', () => {
    const state = stateWith(
      {},
      {
        xp: 0,
        level: 1,
        gems: 100,
        energy: { value: 120, updatedAt: 0 }, // Above cap
      },
    );
    const result = addXp(testData, state, 20, 2000);

    expect(result.state.energy.value).toBe(120); // max(120, 100) = 120
    expect(result.state.energy.updatedAt).toBe(2000);
  });

  it('handles level-up at max level', () => {
    const state = stateWith({}, { xp: 8700, level: 30, gems: 100 });
    const result = addXp(testData, state, 100, 1000);

    // No more levels beyond 30
    expect(result.state.level).toBe(30);
    expect(result.state.xp).toBe(8800);
    expect(result.state.gems).toBe(100); // No new gems
    expect(result.events).toEqual([]);
  });

  it('does not mutate input state', () => {
    const state = stateWith({}, { xp: 10, level: 1, gems: 100 });
    const originalXp = state.xp;
    const originalLevel = state.level;
    const originalGems = state.gems;

    addXp(testData, state, 20, 1000);

    expect(state.xp).toBe(originalXp);
    expect(state.level).toBe(originalLevel);
    expect(state.gems).toBe(originalGems);
  });

  it('does not mutate input state energy', () => {
    const state = stateWith(
      {},
      {
        xp: 0,
        level: 1,
        gems: 100,
        energy: { value: 50, updatedAt: 0 },
      },
    );
    const originalEnergy = state.energy;

    addXp(testData, state, 20, 1000);

    expect(state.energy).toBe(originalEnergy);
  });

  it('accumulates xp across multiple calls', () => {
    const state1 = stateWith({}, { xp: 0, level: 1, gems: 100 });
    const result1 = addXp(testData, state1, 10, 1000);

    const result2 = addXp(testData, result1.state, 10, 2000);

    expect(result2.state.xp).toBe(20);
    expect(result2.state.level).toBe(2);
    expect(result2.events).toEqual([{ type: 'levelUp', level: 2, gems: 5 }]);
  });

  it('handles xp that skips intermediate levels', () => {
    const state = stateWith({}, { xp: 0, level: 1, gems: 100 });
    const result = addXp(testData, state, 250, 1000); // Skips to beyond level 5

    expect(result.state.xp).toBe(250);
    expect(result.state.level).toBe(5);
    expect(result.state.gems).toBe(120); // 100 + 5*4
    expect(result.events).toHaveLength(4);
    expect(result.events[0]).toEqual({ type: 'levelUp', level: 2, gems: 5 });
    expect(result.events[3]).toEqual({ type: 'levelUp', level: 5, gems: 5 });
  });

  it('handles level-up from mid-level', () => {
    const state = stateWith({}, { xp: 50, level: 2, gems: 105 });
    const result = addXp(testData, state, 10, 1000); // Now at 60 XP

    expect(result.state.xp).toBe(60);
    expect(result.state.level).toBe(3);
    expect(result.state.gems).toBe(110);
    expect(result.events).toEqual([{ type: 'levelUp', level: 3, gems: 5 }]);
  });
});
