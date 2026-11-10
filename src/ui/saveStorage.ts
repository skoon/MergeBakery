/**
 * Reading and writing the save in browser storage (T4.5).
 *
 * Never crashes the game: every storage failure is caught, logged, and
 * turned into a `false`/`null` result instead of propagating.
 */

import type { GameData, GameState, Timestamp } from '../core/types';
import { deserializeSave, serializeSave, type SaveFile } from '../core/save';
import type { SeasonSweep } from '../core/seasons';

export const SAVE_KEY = 'rise-and-shine-save';
/** Dev tools only (T14.8): the season `bakery.season(id)` forces open. */
export const DEV_SEASON_KEY = 'rise-and-shine-dev-season';

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

/** A save read back, with what loading swept out of its season (T14.6). */
export interface LoadedSave extends SaveFile {
  readonly swept: SeasonSweep | null;
}

/**
 * Reads SAVE_KEY. No save: null. A save that fails deserializeSave: copied
 * as-is to `${SAVE_KEY}-corrupt-${now}`, logged with console.error including
 * the error, and null returned so the caller starts a new game. Storage that
 * throws on read: console.error, null. A save that loaded only by sweeping
 * out season content is first copied as-is to `${SAVE_KEY}-preseason-${now}`,
 * so it can be restored by hand.
 */
export function readSave(
  storage: KeyValueStorage,
  data: GameData,
  now: Timestamp,
): LoadedSave | null {
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
    if (result.swept) {
      console.warn(
        `readSave: season "${result.swept.seasonId}" content swept; backed up the save first`,
      );
      backUp(storage, `${SAVE_KEY}-preseason-${now}`, text);
    }
    return { ...result.save, swept: result.swept };
  }

  console.error(`readSave: corrupt save (${result.error})`);
  backUp(storage, `${SAVE_KEY}-corrupt-${now}`, text);
  return null;
}

function backUp(storage: KeyValueStorage, key: string, text: string): void {
  try {
    storage.setItem(key, text);
  } catch (error) {
    console.error(`readSave: failed to back up the save to ${key}`, error);
  }
}

/**
 * The id of the season the stored save has joined, read from the raw JSON
 * before GameData exists, so the loader can fetch that season's pack (T14.6).
 * Null when there's no save, no joined season, or anything unreadable;
 * readSave reports a broken save later.
 */
export function peekSavedSeasonId(storage: KeyValueStorage): string | null {
  let text: string | null;
  try {
    text = storage.getItem(SAVE_KEY);
  } catch (error) {
    console.error('peekSavedSeasonId: storage.getItem threw', error);
    return null;
  }
  if (text === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  type Peek = { state?: { season?: { seasonId?: unknown } | null } } | null;
  const seasonId = (parsed as Peek)?.state?.season?.seasonId;
  return typeof seasonId === 'string' ? seasonId : null;
}
