import { describe, expect, it } from 'vitest';
import {
  claimMilestone,
  dismissEventResult,
  megabunScore,
  tickEvents,
} from './events';
import { createRng } from './rng';
import { tapGenerator } from './generators';
import { deliverOrder } from './deliver';
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
  // 0 keeps the schedule tests free of orders; the order tests below raise it.
  orders: { maxOpen: 0, minItems: 1, maxItems: 2, maxTier: 2 },
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
      { eventResult: { eventId: 'bakeOff', won: true, points: 60, coins: 0 } },
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
    expect(r.events[0]).toEqual({ type: 'eventStarted', eventId: 'bakeOff' });
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
      coins: 0,
    });
    // Both milestones (1 + 2 gems) were reached; no trophy gems.
    expect(r.state.gems).toBe(state.gems + 3);
    expect(r.state.trophies).toEqual([]);
    expect(r.state.nextEventAt).toBe(def.durationSec * 1000 + 14 * DAY);
  });

  it('pays reached milestones that were never claimed when the event ends', () => {
    const state = running(50, [0]);
    const r = tickEvents(data, state, rng(), def.durationSec * 1000);
    if (!r.ok) throw new Error('expected ok');
    // Milestone 1 (50 points) was reached and unclaimed; milestone 0 was claimed.
    expect(r.state.coins).toBe(state.coins + 100);
    expect(r.state.gems).toBe(state.gems + 2);
  });

  it('ends a won event: trophy gems and a trophy', () => {
    const state = running(100);
    const r = tickEvents(data, state, rng(), def.durationSec * 1000);
    if (!r.ok) throw new Error('expected ok');
    expect(r.state.eventResult?.won).toBe(true);
    expect(r.state.gems).toBe(state.gems + 3 + def.trophyGems);
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

describe('event items', () => {
  const evChain = {
    id: 'party',
    name: 'Party',
    kind: 'event' as const,
    color: '#fff',
    completionGems: 0,
  };
  const genChain = {
    id: 'party-gen',
    name: 'Party Maker',
    kind: 'generator' as const,
    color: '#fff',
    completionGems: 0,
  };
  const mk = (
    id: string,
    chainId: string,
    tier: number,
    sellValue: number,
  ) => ({
    id,
    name: id,
    chainId,
    tier,
    spriteKey: id,
    sellValue,
    note: null,
    collectReward: null,
  });
  const evData: GameData = {
    ...testData,
    chains: new Map([
      ...testData.chains,
      [evChain.id, evChain],
      [genChain.id, genChain],
    ]),
    items: new Map([
      ...testData.items,
      ['party-1', mk('party-1', 'party', 1, 3)],
      ['party-2', mk('party-2', 'party', 2, 6)],
      ['party-gen-1', mk('party-gen-1', 'party-gen', 1, 0)],
    ]),
    generators: new Map([
      ...testData.generators,
      [
        'party-gen-1',
        {
          itemId: 'party-gen-1',
          spawnTable: [{ itemId: 'party-1', weight: 100 }],
          charges: 3,
          cooldownSec: 60,
        },
      ],
    ]),
    events: new Map([
      [def.id, { ...def, generatorItemId: 'party-gen-1', trophyGems: 0 }],
    ]),
  };
  const end = def.durationSec * 1000;

  it('places the event generator when the event starts', () => {
    const state = stateWith({}, { nextEventAt: 0 });
    const r = tickEvents(evData, state, rng(), 0);
    if (!r.ok) throw new Error('expected ok');
    const placed = r.state.board.cells.filter(
      (c) => c.kind === 'item' && c.item.itemId === 'party-gen-1',
    );
    expect(placed).toHaveLength(1);
    expect(r.state.event).not.toBeNull();
  });

  it('waits for room instead of starting without its generator', () => {
    const full = stateWith(
      {},
      { nextEventAt: 0, pantry: { capacity: 0, items: [] } },
    );
    const cells = full.board.cells.map(() => ({
      kind: 'locked' as const,
      lock: 'crate' as const,
    }));
    const state = { ...full, board: { ...full.board, cells } };
    const r = tickEvents(evData, state, rng(), 0);
    expect(r.ok && r.state).toBe(state);
  });

  it('sells event items and removes the generator when the event ends', () => {
    const base = running(0);
    const state = stateWith(
      { 0: 'party-gen-1', 1: 'party-1', 2: 'party-2', 3: 'flour-1' },
      {
        event: base.event,
        coins: 10,
        pantry: {
          capacity: 4,
          items: [{ itemId: 'party-1', cobwebbed: false, generator: null }],
        },
      },
    );
    const r = tickEvents(evData, state, rng(), end);
    if (!r.ok) throw new Error('expected ok');
    const kinds = r.state.board.cells.map((c) =>
      c.kind === 'item' ? c.item.itemId : c.kind,
    );
    expect(kinds.slice(0, 4)).toEqual(['empty', 'empty', 'empty', 'flour-1']);
    expect(r.state.pantry.items).toEqual([]);
    expect(r.state.coins).toBe(10 + 3 + 6 + 3);
    expect(r.state.eventResult?.coins).toBe(12);
  });
});

describe('event orders', () => {
  const orderData: GameData = {
    ...data,
    events: new Map([
      [def.id, { ...def, orders: { ...def.orders, maxOpen: 2 } }],
    ]),
  };

  it('tops up to maxOpen event orders from the event chain, up to maxTier', () => {
    const r = tickEvents(orderData, running(0), rng(), 1000);
    if (!r.ok) throw new Error('expected ok');
    const eventOrders = r.state.orders.filter((o) => o.eventPoints);
    expect(eventOrders).toHaveLength(2);
    for (const o of eventOrders) {
      expect(o.eventPoints).toBe(10 * o.wants.length);
      for (const id of o.wants) {
        const item = testData.items.get(id);
        expect(item?.chainId).toBe('flour');
        expect(item?.tier).toBeLessThanOrEqual(2);
      }
    }
    expect(r.state.nextOrderId).toBe(running(0).nextOrderId + 2);
    // A second tick adds nothing.
    const again = tickEvents(orderData, r.state, rng(), 2000);
    expect(again.ok && again.state).toBe(r.state);
  });

  it('adds event points on delivery and keeps the order out of the regular slots', () => {
    const r = tickEvents(orderData, running(0), rng(), 1000);
    if (!r.ok) throw new Error('expected ok');
    const order = r.state.orders[0]!;
    const cells = Object.fromEntries(
      order.wants.map((id, i) => [i, id] as const),
    );
    const board = stateWith(cells).board;
    const d = deliverOrder(orderData, { ...r.state, board }, order.id, 1000);
    if (!d.ok) throw new Error('expected ok');
    expect(d.state.event?.points).toBe(order.eventPoints);
    expect(d.state.coins).toBe(r.state.coins + order.reward.coins);
  });

  it('drops event orders when the event ends', () => {
    const r = tickEvents(orderData, running(0), rng(), 1000);
    if (!r.ok) throw new Error('expected ok');
    const ended = tickEvents(orderData, r.state, rng(), def.durationSec * 1000);
    if (!ended.ok) throw new Error('expected ok');
    expect(ended.state.orders.filter((o) => o.eventPoints)).toEqual([]);
  });
});

describe('the real events', () => {
  for (const real of testData.events.values()) {
    const only: GameData = {
      ...testData,
      events: new Map([[real.id, real]]),
    };

    it(`${real.id} starts in its chapter with its generator and valid orders`, () => {
      const state = stateWith(
        {},
        { chapterId: real.minChapter, nextEventAt: 0 },
      );
      const r = tickEvents(only, state, rng(), 0);
      if (!r.ok) throw new Error('expected ok');
      expect(r.state.event?.eventId).toBe(real.id);
      const itemIds = r.state.board.cells.flatMap((c) =>
        c.kind === 'item' ? [c.item.itemId] : [],
      );
      expect(itemIds).toContain(real.generatorItemId);
      const eventOrders = r.state.orders.filter((o) => o.eventPoints);
      expect(eventOrders).toHaveLength(real.orders.maxOpen);
      for (const o of eventOrders) {
        expect(o.wants.length).toBeGreaterThanOrEqual(real.orders.minItems);
        expect(o.wants.length).toBeLessThanOrEqual(real.orders.maxItems);
        for (const id of o.wants) {
          const item = testData.items.get(id);
          expect(testData.chains.get(item?.chainId ?? '')?.kind).toBe('event');
          expect(item?.tier).toBeGreaterThanOrEqual(real.orders.minTier ?? 1);
          expect(item?.tier).toBeLessThanOrEqual(real.orders.maxTier);
        }
      }
    });
  }

  it('is not offered in Chapter 1', () => {
    const state = stateWith({}, { chapterId: 'chapter1' });
    const r = tickEvents(testData, state, rng(), 0);
    expect(r.ok && r.state.nextEventAt).toBeNull();
  });
});

describe('Flour Shortage', () => {
  const slow = testData.events.get('flour-shortage');
  const tap = (event: GameState['event']) => {
    const state = stateWith({ 0: 'flour-mill-1' }, { event });
    const cell = state.board.cells[0];
    if (cell?.kind !== 'item' || !cell.item.generator) throw new Error('setup');
    const spent: GameState = {
      ...state,
      board: {
        ...state.board,
        cells: state.board.cells.map((c, i) =>
          i === 0 && c.kind === 'item'
            ? {
                kind: 'item' as const,
                item: {
                  ...c.item,
                  generator: { charges: 1, cooldownEndsAt: null },
                },
              }
            : c,
        ),
      },
    };
    const r = tapGenerator(testData, spent, 0, rng(), 1000);
    if (!r.ok) throw new Error('expected ok');
    const after = r.state.board.cells[0];
    return after?.kind === 'item' ? after.item.generator?.cooldownEndsAt : null;
  };

  it('doubles the Flour Mill cooldown while it runs, and only then', () => {
    const base = testData.generators.get('flour-mill-1')?.cooldownSec ?? 0;
    const running = {
      eventId: 'flour-shortage',
      startedAt: 0,
      endsAt: 1e9,
      points: 0,
      claimedMilestones: [],
    };
    expect(slow?.slow?.cooldownMultiplier).toBe(2);
    expect(tap(null)).toBe(1000 + base * 1000);
    expect(tap(running)).toBe(1000 + base * 2000);
  });
});
