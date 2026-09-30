/**
 * Player settings kept in browser storage (T4.9, T5.9).
 *
 * Settings are separate from the save so that starting the game over doesn't
 * reset the player's preferences.
 */

import type { KeyValueStorage } from './saveStorage';

export const SETTINGS_KEY = 'rise-and-shine-settings';

export type TextScale = 1 | 1.25 | 1.5;

export interface Settings {
  notifications: boolean;
  /** 0–1. */
  musicVolume: number;
  /** 0–1. */
  effectsVolume: number;
  /** On top of the system setting: reduced motion applies when either asks for it. */
  reducedMotion: boolean;
  tierNumbers: boolean;
  textScale: TextScale;
}

export const DEFAULT_SETTINGS: Settings = {
  notifications: false,
  musicVolume: 0.5,
  effectsVolume: 0.8,
  reducedMotion: false,
  tierNumbers: false,
  textScale: 1,
};

const TEXT_SCALES: readonly number[] = [1, 1.25, 1.5];

function boolOr(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function volumeOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && value >= 0 && value <= 1
    ? value
    : fallback;
}

/**
 * Field by field: each missing or invalid field takes its default, so settings
 * saved by T4.9 (only `notifications`) keep their value. Not JSON, or not an
 * object: console.error and the defaults. Storage that throws: console.error
 * and the defaults.
 */
export function readSettings(storage: KeyValueStorage): Settings {
  let text: string | null;
  try {
    text = storage.getItem(SETTINGS_KEY);
  } catch (error) {
    console.error('readSettings: storage.getItem threw', error);
    return { ...DEFAULT_SETTINGS };
  }

  if (text === null) {
    return { ...DEFAULT_SETTINGS };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    console.error('readSettings: settings are not valid JSON');
    return { ...DEFAULT_SETTINGS };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    console.error('readSettings: settings are not an object');
    return { ...DEFAULT_SETTINGS };
  }

  const raw = parsed as Record<string, unknown>;
  const d = DEFAULT_SETTINGS;
  return {
    notifications: boolOr(raw['notifications'], d.notifications),
    musicVolume: volumeOr(raw['musicVolume'], d.musicVolume),
    effectsVolume: volumeOr(raw['effectsVolume'], d.effectsVolume),
    reducedMotion: boolOr(raw['reducedMotion'], d.reducedMotion),
    tierNumbers: boolOr(raw['tierNumbers'], d.tierNumbers),
    textScale: TEXT_SCALES.includes(raw['textScale'] as number)
      ? (raw['textScale'] as TextScale)
      : d.textScale,
  };
}

/** console.error when storage throws. */
export function writeSettings(
  storage: KeyValueStorage,
  settings: Settings,
): void {
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('writeSettings: storage.setItem threw', error);
  }
}

export interface SettingsStore {
  get(): Settings;
  /** Merges the patch, writes it with writeSettings, and notifies subscribers. */
  update(patch: Partial<Settings>): void;
  subscribe(listener: (settings: Settings) => void): () => void;
}

export function createSettingsStore(storage: KeyValueStorage): SettingsStore {
  let current = readSettings(storage);
  const listeners = new Set<(settings: Settings) => void>();

  return {
    get: () => current,
    update(patch) {
      current = { ...current, ...patch };
      writeSettings(storage, current);
      for (const listener of [...listeners]) listener(current);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** True when the setting or the system (`prefers-reduced-motion`) asks for reduced motion. */
export function reducedMotion(
  settings: Settings,
  systemPrefersReduced: boolean,
): boolean {
  return settings.reducedMotion || systemPrefersReduced;
}
