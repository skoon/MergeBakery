/**
 * Tests for reading and writing the save in browser storage (T4.5).
 */

import { describe, it, expect, vi } from 'vitest';
import {
  SAVE_KEY,
  readSave,
  writeSave,
  type KeyValueStorage,
} from './saveStorage';
import { serializeSave } from '../core/save';
import { testData } from '../core/testing';
import { createNewGame } from '../core/newGame';

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
