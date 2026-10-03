/**
 * Tests for save migrations (T4.6).
 */

import { describe, it, expect } from 'vitest';
import {
  MIGRATIONS,
  migrate,
  type Migration,
  type SaveObject,
} from './migrate';

/**
 * The example v1 → v2 migration: `state.coins` becomes `state.coinCount`.
 * Test-only; the real v1 → v2 migration is in MIGRATIONS.
 */
const renameCoins: Migration = (save) => {
  const state = save['state'] as Record<string, unknown>;
  const { coins, ...rest } = state;
  return { ...save, state: { ...rest, coinCount: coins } };
};

/** A second step, so a chain can be tested: v2 → v3 adds a field. */
const addStars: Migration = (save) => {
  const state = save['state'] as Record<string, unknown>;
  return { ...save, state: { ...state, stars: 0 } };
};

function v1Save(): SaveObject {
  return { version: 1, savedAt: 1000, state: { coins: 50, gems: 10 } };
}

describe('MIGRATIONS', () => {
  it('has one step per version up to SAVE_VERSION', () => {
    expect(Object.keys(MIGRATIONS)).toEqual(['1', '2']);
  });

  it('v2 → v3 adds reputation and staff and keeps the rest', () => {
    const out = migrate({ version: 2, savedAt: 1, state: { coins: 5 } }, 3);
    expect(out['version']).toBe(3);
    expect(out['state']).toEqual({ coins: 5, reputation: 0, staff: [] });
  });

  it('v1 → v2 adds the event fields and keeps the rest', () => {
    const out = migrate(v1Save(), 2);
    expect(out['version']).toBe(2);
    expect(out['state']).toEqual({
      coins: 50,
      gems: 10,
      event: null,
      nextEventAt: null,
      eventResult: null,
      trophies: [],
    });
  });
});

describe('migrate', () => {
  it('applies the example v1 to v2 migration', () => {
    const result = migrate(v1Save(), 2, { 1: renameCoins });

    expect(result).toEqual({
      version: 2,
      savedAt: 1000,
      state: { coinCount: 50, gems: 10 },
    });
  });

  it('applies a two-step chain from v1 to v3', () => {
    const result = migrate(v1Save(), 3, { 1: renameCoins, 2: addStars });

    expect(result).toEqual({
      version: 3,
      savedAt: 1000,
      state: { coinCount: 50, gems: 10, stars: 0 },
    });
  });

  it('sets the version after each step, so a migration sees the version it upgrades from', () => {
    const seen: number[] = [];
    const record: Migration = (save) => {
      seen.push(save['version'] as number);
      return save;
    };

    migrate(v1Save(), 3, { 1: record, 2: record });

    expect(seen).toEqual([1, 2]);
  });

  it('returns an already-current save unchanged', () => {
    const save = v1Save();
    const result = migrate(save, 1, { 1: renameCoins });

    expect(result).toBe(save);
  });

  it('does not mutate the save it is given', () => {
    const save = v1Save();
    migrate(save, 2, { 1: renameCoins });

    expect(save).toEqual({
      version: 1,
      savedAt: 1000,
      state: { coins: 50, gems: 10 },
    });
  });

  it('throws when a migration the chain needs is missing', () => {
    expect(() => migrate(v1Save(), 3, { 1: renameCoins })).toThrow(
      /no migration from version 2 to 3/,
    );
  });

  it('throws when the save is newer than the target version', () => {
    const save: SaveObject = { ...v1Save(), version: 4 };

    expect(() => migrate(save, 2)).toThrow(/newer/);
  });

  it('throws when the version is not a whole number', () => {
    expect(() => migrate({ ...v1Save(), version: 1.5 }, 2)).toThrow(
      /whole number/,
    );
  });

  it('throws when the version is missing or not a number', () => {
    expect(() => migrate({ savedAt: 1 }, 1)).toThrow(/whole number/);
    expect(() => migrate({ version: '1', savedAt: 1 }, 1)).toThrow(
      /whole number/,
    );
  });

  it('defaults to MIGRATIONS, which covers a current save', () => {
    const save = v1Save();

    expect(migrate(save, 1)).toBe(save);
  });
});
