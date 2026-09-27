/**
 * Reading and writing the save in browser storage (T4.5).
 *
 * Never crashes the game: every storage failure is caught, logged, and
 * turned into a `false`/`null` result instead of propagating.
 */

import type { GameData, GameState, Timestamp } from '../core/types';
import { deserializeSave, serializeSave, type SaveFile } from '../core/save';

export const SAVE_KEY = 'rise-and-shine-save';

/** The part of the Web Storage API used here; window.localStorage satisfies it. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * Writes serializeSave(state, now) to SAVE_KEY. If storage throws (full,
 * disabled), logs with console.error and returns false.
 */
export function writeSave(
  storage: KeyValueStorage,
  state: GameState,
  now: Timestamp,
): boolean {
  const text = serializeSave(state, now);
  try {
    storage.setItem(SAVE_KEY, text);
    return true;
  } catch (error) {
    console.error('writeSave: storage.setItem threw', error);
    return false;
  }
}

/**
 * Reads SAVE_KEY. No save: null. A save that fails deserializeSave: copied
 * as-is to `${SAVE_KEY}-corrupt-${now}`, logged with console.error including
 * the error, and null returned so the caller starts a new game. Storage that
 * throws on read: console.error, null.
 */
export function readSave(
  storage: KeyValueStorage,
  data: GameData,
  now: Timestamp,
): SaveFile | null {
  let text: string | null;
  try {
    text = storage.getItem(SAVE_KEY);
  } catch (error) {
    console.error('readSave: storage.getItem threw', error);
    return null;
  }

  if (text === null) {
    return null;
  }

  const result = deserializeSave(data, text);
  if (result.ok) {
    return result.save;
  }

  console.error(`readSave: corrupt save (${result.error})`);
  try {
    storage.setItem(`${SAVE_KEY}-corrupt-${now}`, text);
  } catch (error) {
    console.error('readSave: failed to back up corrupt save', error);
  }
  return null;
}
