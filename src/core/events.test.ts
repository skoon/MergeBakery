import { describe, expect, it } from 'vitest';
import { claimMilestone, dismissEventResult } from './events';
import { stateWith, testData } from './testing';
import type { EventDef, GameData, GameState } from './types';

const def: EventDef = {
  id: 'bakeOff',
  name: 'Bake-Off Showdown',
  minChapter: 'chapter2',
  durationSec: 259200,
  generatorItemId: 'flour-mill-1',
  pointsPerOrder: 10,
  milestones: [
    { points: 20, reward: { coins: 50, gems: 1 } },
    { points: 50, reward: { coins: 100, gems: 2 } },
  ],
  megabunCurve: [
    { atSec: 0, score: 0 },
    { atSec: 259200, score: 100 },
  ],
  trophyGems: 5,
};
const data: GameData = { ...testData, events: new Map([[def.id, def]]) };

function running(points: number, claimed: number[] = []): GameState {
  return stateWith(
    {},
    {
      event: {
        eventId: 'bakeOff',
        startedAt: 0,
        endsAt: def.durationSec * 1000,
        points,
        claimedMilestones: claimed,
      },
    },
  );
}

describe('claimMilestone', () => {
  it('rejects with no event running', () => {
    expect(claimMilestone(data, stateWith({}), 0)).toEqual({
      ok: false,
      reason: 'noActiveEvent',
    });
  });

  it('rejects a milestone not yet reached', () => {
    expect(claimMilestone(data, running(19), 0)).toEqual({
      ok: false,
      reason: 'milestoneNotReached',
    });
  });

  it('pays a reached milestone once', () => {
    const before = running(20);
    const r = claimMilestone(data, before, 0);
    if (!r.ok) throw new Error('expected ok');
    expect(r.state.coins).toBe(before.coins + 50);
    expect(r.state.gems).toBe(before.gems + 1);
    expect(r.state.event?.claimedMilestones).toEqual([0]);
    expect(claimMilestone(data, r.state, 0)).toEqual({
      ok: false,
      reason: 'alreadyCompleted',
    });
  });

  it('throws on an out-of-range index', () => {
    expect(() => claimMilestone(data, running(99), 5)).toThrow();
  });
});

describe('dismissEventResult', () => {
  it('clears the result', () => {
    const state = stateWith(
      {},
      { eventResult: { eventId: 'bakeOff', won: true, points: 60 } },
    );
    const r = dismissEventResult(state);
    if (!r.ok) throw new Error('expected ok');
    expect(r.state.eventResult).toBeNull();
  });

  it('keeps the same state when there is nothing to dismiss', () => {
    const state = stateWith({});
    const r = dismissEventResult(state);
    expect(r.ok && r.state).toBe(state);
  });
});
