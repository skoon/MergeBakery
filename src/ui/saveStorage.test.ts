/**
 * Tests for reading and writing the save in browser storage (T4.5).
 */

import { describe, it, expect, vi } from 'vitest';
import {
  SAVE_KEY,
  peekSavedSeasonId,
  readSave,
  writeSave,
  type KeyValueStorage,
} from './saveStorage';
import { serializeSave } from '../core/save';
import { testData } from '../core/testing';
import { createNewGame } from '../core/newGame';
import type { GameState } from '../core/types';

/** An in-memory KeyValueStorage backed by a Map, for tests. */
class MemoryStorage implements KeyValueStorage {
  readonly map = new Map<string, string>();

  getItem(key: string): string | null {
    return this.map.has(key) ? (this.map.get(key) ?? null) : null;
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

/** A KeyValueStorage where both methods throw, like a full or disabled storage. */
class ThrowingStorage implements KeyValueStorage {
  getItem(): string | null {
    throw new Error('storage disabled');
  }

  setItem(): void {
    throw new Error('storage full');
  }
}

describe('SAVE_KEY', () => {
  it('is the expected storage key', () => {
    expect(SAVE_KEY).toBe('rise-and-shine-save');
  });
});

describe('writeSave', () => {
  it('writes serializeSave(state, now) to SAVE_KEY', () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const storage = new MemoryStorage();
    const state = createNewGame(testData, 1, 0);

    const ok = writeSave(storage, state, 5000);

    expect(ok).toBe(true);
    expect(storage.map.get(SAVE_KEY)).toBe(serializeSave(state, 5000));
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('returns false and logs when storage throws', () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const storage = new ThrowingStorage();
    const state = createNewGame(testData, 1, 0);

    const ok = writeSave(storage, state, 5000);

    expect(ok).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});

describe('readSave', () => {
  it('returns null when there is no save', () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const storage = new MemoryStorage();

    const result = readSave(storage, testData, 1000);

    expect(result).toBeNull();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('reads back a good save', () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const storage = new MemoryStorage();
    const state = createNewGame(testData, 1, 0);
    writeSave(storage, state, 5000);

    const result = readSave(storage, testData, 9000);

    expect(result).not.toBeNull();
    expect(result?.state).toEqual(state);
    expect(result?.savedAt).toBe(5000);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('backs up a corrupt save under a -corrupt- key, logs, and returns null', () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, 'not valid json');

    const result = readSave(storage, testData, 1234);

    expect(result).toBeNull();
    expect(storage.map.get(`${SAVE_KEY}-corrupt-1234`)).toBe('not valid json');
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(String(consoleErrorSpy.mock.calls[0]?.[0])).toMatch(/corrupt/i);
    consoleErrorSpy.mockRestore();
  });

  it('returns null and logs when storage throws on read', () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const storage = new ThrowingStorage();

    const result = readSave(storage, testData, 1000);

    expect(result).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});

describe('season content swept while loading (T14.6)', () => {
  const autumnSave = (): GameState => ({
    ...createNewGame(testData, 1, 0),
    pantry: {
      ...createNewGame(testData, 1, 0).pantry,
      items: [{ itemId: 'autumn-pie', cobwebbed: false, generator: null }],
    },
    season: {
      seasonId: 'autumn',
      joinedAt: 1,
      startedAt: 1,
      endsAt: 9e12,
      points: 10,
      claimedMilestones: [],
      custom: null,
    },
  });

  it('backs up the save before sweeping, and returns the sweep', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const storage = new MemoryStorage();
    writeSave(storage, autumnSave(), 5000);
    const text = storage.map.get(SAVE_KEY);

    const result = readSave(storage, testData, 7000);

    expect(result?.swept).toEqual({
      seasonId: 'autumn',
      coins: testData.economy.seasons.orphanItemCoins,
      ended: true,
    });
    expect(result?.state.season).toBeNull();
    expect(storage.map.get(`${SAVE_KEY}-preseason-7000`)).toBe(text);
    expect(storage.map.get(SAVE_KEY)).toBe(text);
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it('writes no backup when nothing is swept', () => {
    const storage = new MemoryStorage();
    writeSave(storage, createNewGame(testData, 1, 0), 5000);

    expect(readSave(storage, testData, 7000)?.swept).toBeNull();
    expect([...storage.map.keys()]).toEqual([SAVE_KEY]);
  });
});

describe('peekSavedSeasonId', () => {
  const withSeason = (seasonId: string): string =>
    serializeSave(
      {
        ...createNewGame(testData, 1, 0),
        season: {
          seasonId,
          joinedAt: 1,
          startedAt: null,
          endsAt: 2,
          points: 0,
          claimedMilestones: [],
          custom: null,
        },
      },
      3,
    );

  it.each<[string, string | null, string | null]>([
    ['a joined season', withSeason('autumn'), 'autumn'],
    ['no joined season', serializeSave(createNewGame(testData, 1, 0), 3), null],
    ['no save', null, null],
    ['a save that isn’t JSON', 'not json', null],
    ['JSON null', 'null', null],
    ['a version 3 save, before seasons', '{"version":3,"state":{}}', null],
    [
      'a seasonId that isn’t a string',
      '{"state":{"season":{"seasonId":7}}}',
      null,
    ],
  ])('reads %s', (_name, text, expected) => {
    const storage = new MemoryStorage();
    if (text !== null) storage.setItem(SAVE_KEY, text);
    expect(peekSavedSeasonId(storage)).toBe(expected);
  });

  it('returns null and logs when storage throws', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(peekSavedSeasonId(new ThrowingStorage())).toBeNull();
    expect(error).toHaveBeenCalledOnce();
    error.mockRestore();
  });
});
