/**
 * Save compatibility audit (T12.2): a fixture per past version loads into the
 * current format, a rich current-version state survives a round trip, and
 * saves from the future are refused.
 */

import { describe, expect, it } from 'vitest';
import { dispatch } from './dispatch';
import { createNewGame } from './newGame';
import { SAVE_VERSION, deserializeSave, serializeSave } from './save';
import { testData } from './testing';
import type { GameState } from './types';

/** Fields added after each save version, so a fixture can be cut back to it. */
const ADDED_AFTER: Readonly<Record<number, readonly string[]>> = {
  1: ['event', 'nextEventAt', 'eventResult', 'trophies', 'reputation', 'staff'],
  2: ['reputation', 'staff'],
};

/** What a save of `version` looked like: the current save with later fields removed. */
function legacySave(state: GameState, version: number): string {
  const file = JSON.parse(serializeSave(state, 4242)) as {
    version: number;
    state: Record<string, unknown>;
  };
  for (const key of ADDED_AFTER[version] ?? []) delete file.state[key];
  file.version = version;
  return JSON.stringify(file);
}

const fresh = createNewGame(testData, 11, 1_000);

describe('loading a save from every past version', () => {
  for (const version of [1, 2]) {
    it(`version ${version.toString()} loads as the current version with the new fields empty`, () => {
      const loaded = deserializeSave(testData, legacySave(fresh, version));
      if (!loaded.ok) throw new Error(loaded.error);
      expect(loaded.save.version).toBe(SAVE_VERSION);
      expect(loaded.save.savedAt).toBe(4242);
      expect(loaded.save.state).toEqual(fresh);
    });
  }

  it('a version 1 save played on afterwards keeps working through dispatch', () => {
    const loaded = deserializeSave(testData, legacySave(fresh, 1));
    if (!loaded.ok) throw new Error(loaded.error);
    const r = dispatch(testData, loaded.save.state, {
      type: 'tick',
      now: 10_000,
    });
    expect(r.ok).toBe(true);
  });
});

describe('the current version', () => {
  it('round-trips a state using every later addition', () => {
    const rich: GameState = {
      ...fresh,
      orders: [
        {
          id: 1,
          customerId: 'walkin-hiker',
          wants: ['sprinkles'],
          reward: { coins: 5, stars: 0, xp: 0 },
          eventPoints: 10,
        },
        {
          id: 2,
          customerId: 'walkin-hiker',
          wants: ['layer-cake'],
          reward: { coins: 600, stars: 5, xp: 20 },
          catering: { expiresAt: 9e12, upgradeChancePercent: 15 },
        },
        {
          id: 3,
          customerId: 'walkin-hiker',
          wants: ['cookie', 'cookie', 'cookie', 'cookie', 'cookie'],
          reward: { coins: 400, stars: 0, xp: 5, reputation: 5 },
          wholesale: { expiresAt: 9e12 },
        },
      ],
      nextOrderId: 4,
      event: {
        eventId: 'bake-off',
        startedAt: 1,
        endsAt: 9e12,
        points: 40,
        claimedMilestones: [0],
      },
      nextEventAt: null,
      eventResult: { eventId: 'bake-off', won: true, points: 90, coins: 12 },
      trophies: ['bake-off', 'flour-shortage'],
      reputation: 120,
      staff: [
        { staffId: 'sam', assignedChain: 'flour-mill', lastActedAt: 5 },
        { staffId: 'trevor', assignedChain: null, lastActedAt: 5 },
        {
          staffId: 'auto-oven',
          assignedChain: null,
          assignedRecipe: 'bake-cookie',
          lastActedAt: 5,
        },
      ],
      discovered: [...fresh.discovered, 'sprinkles', 'layer-cake'],
    };
    const loaded = deserializeSave(testData, serializeSave(rich, 7));
    if (!loaded.ok) throw new Error(loaded.error);
    expect(loaded.save.state).toEqual(rich);
  });

  it('refuses a save from a newer version, and one with no version', () => {
    const future = JSON.stringify({
      version: SAVE_VERSION + 1,
      savedAt: 1,
      state: fresh,
    });
    expect(deserializeSave(testData, future).ok).toBe(false);
    expect(deserializeSave(testData, JSON.stringify({ state: fresh })).ok).toBe(
      false,
    );
  });

  it('loads a save whose running event has since been removed from the data, then drops it', () => {
    const orphaned: GameState = {
      ...fresh,
      event: {
        eventId: 'retired-event',
        startedAt: 1,
        endsAt: 9e12,
        points: 3,
        claimedMilestones: [],
      },
    };
    const loaded = deserializeSave(testData, serializeSave(orphaned, 1));
    if (!loaded.ok) throw new Error(loaded.error);
    const r = dispatch(testData, loaded.save.state, {
      type: 'tick',
      now: 5000,
    });
    expect(r.ok && r.state.event).toBeNull();
  });
});
