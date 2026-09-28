/**
 * Player settings kept in browser storage (T4.9). T5.9 adds more here.
 *
 * Settings are separate from the save so that resetting a game (T5.9) doesn't
 * reset the player's preferences.
 */

import type { KeyValueStorage } from './saveStorage';

export const SETTINGS_KEY = 'rise-and-shine-settings';

export interface Settings {
  notifications: boolean;
}

export const DEFAULT_SETTINGS: Settings = { notifications: false };

function isSettings(value: unknown): value is Settings {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>)['notifications'] === 'boolean'
  );
}

/**
 * Missing → DEFAULT_SETTINGS. Unparseable or wrong shape → console.error and
 * DEFAULT_SETTINGS. Storage that throws → console.error and DEFAULT_SETTINGS.
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

  if (!isSettings(parsed)) {
    console.error('readSettings: settings have the wrong shape');
    return { ...DEFAULT_SETTINGS };
  }

  return { notifications: parsed.notifications };
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
