import { describe, expect, it } from 'vitest';
import {
  claimMilestone,
  dismissEventResult,
  megabunScore,
  tickEvents,
} from './events';
import { createRng } from './rng';
import { stateWith, testData } from './testing';
import type { EventDef, GameData, GameState } from './types';

const def: EventDef = {
  id: 'bakeOff',
  name: 'Bake-Off Showdown',
  minChapter: 'chapter1',
  durationSec: 259200,
  gapAfterSec: 1209600,
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

const DAY = 86_400_000;
const rng = () => createRng(1);

describe('megabunScore', () => {
  const d: EventDef = {
    ...def,
    durationSec: 100,
    megabunCurve: [
      { atSec: 0, score: 0 },
      { atSec: 50, score: 10 },
      { atSec: 100, score: 100 },
    ],
  };
  it('interpolates between points and holds after the last', () => {
    expect(megabunScore(d, 0)).toBe(0);
    expect(megabunScore(d, 25)).toBe(5);
    expect(megabunScore(d, 75)).toBe(55);
    expect(megabunScore(d, 500)).toBe(100);
  });
});

describe('tickEvents', () => {
  it('does nothing when no event is eligible', () => {
    const state = stateWith({});
    const r = tickEvents(testData, state, rng(), 0);
    expect(r.ok && r.state).toBe(state);
  });

  it('schedules the first event one gap after the player qualifies', () => {
    const state = stateWith({});
    const r = tickEvents(data, state, rng(), 1000);
    if (!r.ok) throw new Error('expected ok');
    expect(r.state.nextEventAt).toBe(1000 + def.gapAfterSec * 1000);
    expect(r.state.event).toBeNull();
  });

  it('does not offer an event before its chapter', () => {
    const later: GameData = {
      ...data,
      events: new Map([[def.id, { ...def, minChapter: 'chapter2' }]]),
    };
    const state = stateWith({}, { chapterId: 'chapter1' });
    const r = tickEvents(later, state, rng(), 0);
    expect(r.ok && r.state.nextEventAt).toBeNull();
  });

  it('starts the event when due, and not before', () => {
    const state = stateWith({}, { nextEventAt: 5000 });
    const early = tickEvents(data, state, rng(), 4999);
    expect(early.ok && early.state.event).toBeNull();
    const r = tickEvents(data, state, rng(), 5000);
    if (!r.ok) throw new Error('expected ok');
    expect(r.state.event).toEqual({
      eventId: 'bakeOff',
      startedAt: 5000,
      endsAt: 5000 + def.durationSec * 1000,
      points: 0,
      claimedMilestones: [],
    });
    expect(r.state.nextEventAt).toBeNull();
    expect(r.events).toEqual([{ type: 'eventStarted', eventId: 'bakeOff' }]);
  });

  it('never starts a second event while one runs', () => {
    const state = { ...running(0), nextEventAt: 0 };
    const r = tickEvents(data, state, rng(), 1000);
    expect(r.ok && r.state).toBe(state);
  });

  it('keeps the running event until its end time', () => {
    const state = running(0);
    const r = tickEvents(data, state, rng(), def.durationSec * 1000 - 1);
    expect(r.ok && r.state).toBe(state);
  });

  it('ends a lost event: no gems, no trophy, next one scheduled', () => {
    const state = running(99);
    const r = tickEvents(data, state, rng(), def.durationSec * 1000);
    if (!r.ok) throw new Error('expected ok');
    expect(r.state.event).toBeNull();
    expect(r.state.eventResult).toEqual({
      eventId: 'bakeOff',
      won: false,
      points: 99,
    });
    expect(r.state.gems).toBe(state.gems);
    expect(r.state.trophies).toEqual([]);
    expect(r.state.nextEventAt).toBe(def.durationSec * 1000 + 14 * DAY);
  });

  it('ends a won event: trophy gems and a trophy', () => {
    const state = running(100);
    const r = tickEvents(data, state, rng(), def.durationSec * 1000);
    if (!r.ok) throw new Error('expected ok');
    expect(r.state.eventResult?.won).toBe(true);
    expect(r.state.gems).toBe(state.gems + def.trophyGems);
    expect(r.state.trophies).toEqual(['bakeOff']);
    expect(r.events).toEqual([
      { type: 'eventEnded', eventId: 'bakeOff', won: true },
    ]);
  });

  it('ends and, if the next is already due, starts it on the same tick', () => {
    const state = running(0);
    const far = def.durationSec * 1000 + 30 * DAY;
    const r = tickEvents(data, state, rng(), far);
    if (!r.ok) throw new Error('expected ok');
    expect(r.state.eventResult?.won).toBe(false);
    expect(r.state.event?.startedAt).toBe(far);
  });
});
