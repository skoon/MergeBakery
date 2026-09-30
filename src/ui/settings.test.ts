/**
 * Tests for player settings (T4.9, T5.9).
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  createSettingsStore,
  readSettings,
  reducedMotion,
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
    expect(DEFAULT_SETTINGS).toEqual({
      notifications: false,
      musicVolume: 0.5,
      effectsVolume: 0.8,
      reducedMotion: false,
      tierNumbers: false,
      textScale: 1,
    });
  });

  it('round trips through writeSettings', () => {
    const storage = memoryStorage();
    const settings = {
      notifications: true,
      musicVolume: 0.1,
      effectsVolume: 0.3,
      reducedMotion: true,
      tierNumbers: true,
      textScale: 1.5,
    } as const;
    writeSettings(storage, settings);

    expect(readSettings(storage)).toEqual(settings);
  });

  it('keeps a T4.9 setting and defaults the rest', () => {
    const storage = memoryStorage();
    storage.data.set(SETTINGS_KEY, JSON.stringify({ notifications: true }));

    expect(readSettings(storage)).toEqual({
      ...DEFAULT_SETTINGS,
      notifications: true,
    });
  });

  it('defaults only the fields that are invalid', () => {
    const storage = memoryStorage();
    storage.data.set(
      SETTINGS_KEY,
      JSON.stringify({ musicVolume: 2, textScale: 3, tierNumbers: true }),
    );

    expect(readSettings(storage)).toEqual({
      ...DEFAULT_SETTINGS,
      tierNumbers: true,
    });
  });

  it('falls back to the defaults for data that is not JSON or not an object', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const storage = memoryStorage();

    storage.data.set(SETTINGS_KEY, '{not json');
    expect(readSettings(storage)).toEqual(DEFAULT_SETTINGS);
    storage.data.set(SETTINGS_KEY, '[1, 2]');
    expect(readSettings(storage)).toEqual(DEFAULT_SETTINGS);
    expect(error).toHaveBeenCalledTimes(2);
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
      writeSettings(throwingStorage, DEFAULT_SETTINGS);
    }).not.toThrow();
    expect(error).toHaveBeenCalled();
  });
});

describe('createSettingsStore', () => {
  it('merges an update, writes it and notifies', () => {
    const storage = memoryStorage();
    const settings = createSettingsStore(storage);
    const listener = vi.fn();
    settings.subscribe(listener);

    settings.update({ tierNumbers: true });

    expect(settings.get()).toEqual({ ...DEFAULT_SETTINGS, tierNumbers: true });
    expect(readSettings(storage).tierNumbers).toBe(true);
    expect(listener).toHaveBeenCalledWith(settings.get());
  });

  it('stops notifying after unsubscribing', () => {
    const settings = createSettingsStore(memoryStorage());
    const listener = vi.fn();
    const unsubscribe = settings.subscribe(listener);

    unsubscribe();
    settings.update({ textScale: 1.25 });

    expect(listener).not.toHaveBeenCalled();
  });
});

describe('reducedMotion', () => {
  it('applies when either the setting or the system asks', () => {
    const off = DEFAULT_SETTINGS;
    const on = { ...DEFAULT_SETTINGS, reducedMotion: true };

    expect(reducedMotion(off, false)).toBe(false);
    expect(reducedMotion(off, true)).toBe(true);
    expect(reducedMotion(on, false)).toBe(true);
    expect(reducedMotion(on, true)).toBe(true);
  });
});
