import { describe, expect, it } from 'vitest';
import { eventModel, eventResultLines, formatTimeLeft } from './eventModel';
import { stateWith, testData } from '../core/testing';
import type { EventDef, GameData } from '../core/types';

const def: EventDef = {
  id: 'bakeOff',
  name: 'Bake-Off Showdown',
  minChapter: 'chapter1',
  durationSec: 1000,
  gapAfterSec: 10,
  generatorItemId: 'flour-mill-1',
  pointsPerOrder: 10,
  orders: { maxOpen: 1, minItems: 1, maxItems: 1, maxTier: 1 },
  milestones: [
    { points: 20, reward: { coins: 50, gems: 1 } },
    { points: 60, reward: { coins: 0, gems: 3 } },
  ],
  megabunCurve: [
    { atSec: 0, score: 0 },
    { atSec: 1000, score: 100 },
  ],
  trophyGems: 5,
};
const data: GameData = { ...testData, events: new Map([[def.id, def]]) };
const at = (points: number, claimed: number[] = []) =>
  stateWith(
    {},
    {
      event: {
        eventId: 'bakeOff',
        startedAt: 0,
        endsAt: 1_000_000,
        points,
        claimedMilestones: claimed,
      },
    },
  );

describe('formatTimeLeft', () => {
  it('uses days, hours or minutes', () => {
    expect(formatTimeLeft(2 * 86_400_000 + 4 * 3_600_000)).toBe('2 d 4 h');
    expect(formatTimeLeft(3 * 3_600_000 + 12 * 60_000)).toBe('3 h 12 min');
    expect(formatTimeLeft(61_000)).toBe('2 min');
    expect(formatTimeLeft(-5)).toBe('0 min');
  });
});

describe('eventModel', () => {
  it('is null with no event', () => {
    expect(eventModel(data, stateWith({}), 0)).toBeNull();
  });

  it('compares the player with MegaBun on one scale', () => {
    const m = eventModel(data, at(25), 500_000);
    expect(m?.megabun).toBe(50);
    expect(m?.target).toBe(100);
    expect(m?.ahead).toBe(false);
    expect(m?.playerProgress).toBeCloseTo(0.25);
    expect(m?.megabunProgress).toBeCloseTo(0.5);
    expect(eventModel(data, at(60), 500_000)?.ahead).toBe(true);
  });

  it('marks milestones claimed, ready or locked', () => {
    const m = eventModel(data, at(60, [0]), 0);
    expect(m?.milestones.map((x) => x.status)).toEqual(['claimed', 'ready']);
    expect(m?.milestones[0]?.rewardText).toBe('50 coins, 1 gems');
    expect(m?.claimable).toBe(1);
    expect(eventModel(data, at(0), 0)?.milestones.map((x) => x.status)).toEqual(
      ['locked', 'locked'],
    );
  });
});

describe('eventResultLines', () => {
  it('is null with no result', () => {
    expect(eventResultLines(data, stateWith({}))).toBeNull();
  });

  it('words a win and a loss differently', () => {
    const won = eventResultLines(
      data,
      stateWith(
        {},
        {
          eventResult: { eventId: 'bakeOff', won: true, points: 90, coins: 12 },
        },
      ),
    );
    expect(won?.title).toContain('you won');
    expect(won?.lines).toContain('Event items sold for 12 coins');
    const lost = eventResultLines(
      data,
      stateWith(
        {},
        {
          eventResult: { eventId: 'bakeOff', won: false, points: 5, coins: 0 },
        },
      ),
    );
    expect(lost?.title).toContain('is over');
    expect(lost?.lines.at(-1)).toContain('MegaBun took this one');
  });
});
