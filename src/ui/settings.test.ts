/**
 * Tests for player settings (T4.9).
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  readSettings,
  writeSettings,
} from './settings';
import type { KeyValueStorage } from './saveStorage';

function memoryStorage(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

const throwingStorage: KeyValueStorage = {
  getItem: () => {
    throw new Error('storage disabled');
  },
  setItem: () => {
    throw new Error('storage full');
  },
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('readSettings', () => {
  it('returns the defaults when nothing is stored', () => {
    expect(readSettings(memoryStorage())).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS.notifications).toBe(false);
  });

  it('round trips through writeSettings', () => {
    const storage = memoryStorage();
    writeSettings(storage, { notifications: true });

    expect(readSettings(storage)).toEqual({ notifications: true });
  });

  it('falls back to the defaults for data that is not JSON', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const storage = memoryStorage();
    storage.data.set(SETTINGS_KEY, '{not json');

    expect(readSettings(storage)).toEqual(DEFAULT_SETTINGS);
    expect(error).toHaveBeenCalled();
  });

  it('falls back to the defaults for the wrong shape', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const storage = memoryStorage();
    storage.data.set(SETTINGS_KEY, JSON.stringify({ notifications: 'yes' }));

    expect(readSettings(storage)).toEqual(DEFAULT_SETTINGS);
    expect(error).toHaveBeenCalled();
  });

  it('falls back to the defaults when storage throws', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(readSettings(throwingStorage)).toEqual(DEFAULT_SETTINGS);
    expect(error).toHaveBeenCalled();
  });

  it('returns a copy, so callers cannot change the defaults', () => {
    const settings = readSettings(memoryStorage());
    settings.notifications = true;

    expect(DEFAULT_SETTINGS.notifications).toBe(false);
  });
});

describe('writeSettings', () => {
  it('logs instead of throwing when storage throws', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      writeSettings(throwingStorage, { notifications: true });
    }).not.toThrow();
    expect(error).toHaveBeenCalled();
  });
});
