/**
 * Tests for season rule hooks (T14.5), with the autumn fixture pack and rules
 * objects passed straight to withSeasons.
 */

import { describe, expect, it } from 'vitest';
import fixture from '../seasons/fixtures/autumn.json';
import { parseSeasonPack, withSeasons } from '../seasons/pack';
import { setCell } from './board';
import { deliverOrder } from './deliver';
import { dispatch } from './dispatch';
import type { SeasonRules } from './seasonApi';
import { stateWith, testData, type CellSpec } from './testing';
import type {
  Action,
  ActionResult,
  ActiveSeason,
  GameData,
  GameEvent,
  GameState,
  Order,
  OrderReward,
  WeightedEntry,
} from './types';

const HOUR = 3_600_000;
const START = Date.UTC(2026, 10, 12);
const END = Date.UTC(2026, 11, 1);
const NOW = START + 86_400_000;

const pack = parseSeasonPack(testData, fixture);

type Hooks = Omit<SeasonRules, 'apiVersion'>;

function withRules(hooks: Hooks, base: GameData = testData): GameData {
  return withSeasons(base, [
    {
      pack,
      startsAt: START,
      endsAt: END,
      rules: { apiVersion: 1, ...hooks },
    },
  ]);
}

/** testData with rare drops always or never rolled. */
function rareChance(chancePercent: number): GameData {
  return { ...testData, rareDrops: { ...testData.rareDrops, chancePercent } };
}

type Done = Extract<ActionResult, { ok: true }>;

function ok(result: ActionResult): Done {
  if (!result.ok) throw new Error(`expected ok, got "${result.reason}"`);
  return result;
}

function season(change: Partial<ActiveSeason> = {}): ActiveSeason {
  return {
    seasonId: 'autumn',
    joinedAt: START,
    startedAt: START,
    endsAt: END,
    points: 0,
    claimedMilestones: [],
    custom: null,
    ...change,
  };
}

/** A game past the tutorial with no regular orders due; the season runs unless overridden. */
function game(
  cells: Readonly<Record<number, CellSpec>> = {},
  overrides: Partial<GameState> = {},
): GameState {
  return stateWith(cells, {
    tutorialStep: 'done',
    nextOrderAt: null,
    season: season(),
    ...overrides,
  });
}

/** Sets the generator at `cell` to `charges` charges. */
function charged(state: GameState, cell: number, charges: number): GameState {
  const c = state.board.cells[cell];
  if (c?.kind !== 'item') throw new Error(`no item at ${cell.toString()}`);
  return {
    ...state,
    board: setCell(state.board, cell, {
      kind: 'item',
      item: { ...c.item, generator: { charges, cooldownEndsAt: null } },
    }),
  };
}

const ORDER: Order = {
  id: 77,
  customerId:
    [...testData.customers.values()].find((c) => c.kind === 'walkIn')?.id ?? '',
  wants: ['egg'],
  reward: { coins: 10, stars: 1, xp: 5 },
};

/** A flour mill on its last charge at 0, an egg at 1, and an order for the egg. */
function shop(overrides: Partial<GameState> = {}): GameState {
  const state = game({ 0: 'flour-mill-1', 1: 'egg' }, overrides);
  return { ...charged(state, 0, 1), orders: [ORDER] };
}

function act(d: GameData, state: GameState, action: Action): Done {
  return ok(dispatch(d, state, action));
}

/** Rules whose every hook records its name and changes nothing. */
function recorder(): { calls: string[]; hooks: Hooks } {
  const calls: string[] = [];
  return {
    calls,
    hooks: {
      onTick: (_ctx, state) => {
        calls.push('onTick');
        return { ok: true, state, events: [] };
      },
      afterAction: (_ctx, state, action) => {
        calls.push(`afterAction:${action.type}`);
        return { ok: true, state, events: [] };
      },
      extraSpawns: () => {
        calls.push('extraSpawns');
        return [];
      },
      cooldownMultiplier: () => {
        calls.push('cooldownMultiplier');
        return 1;
      },
      orderReward: (_ctx, _order, reward) => {
        calls.push('orderReward');
        return reward;
      },
    },
  };
}

/** A tick, a tap that empties the mill, and a delivery. */
function exercise(d: GameData, state: GameState, now: number): void {
  const ticked = act(d, state, { type: 'tick', now });
  const tapped = act(d, ticked.state, { type: 'tapGenerator', cell: 0, now });
  act(d, tapped.state, { type: 'deliverOrder', orderId: ORDER.id, now });
}

describe('when hooks run', () => {
  it('calls every hook while the season runs', () => {
    const { calls, hooks } = recorder();
    exercise(withRules(hooks), shop(), NOW);
    expect(calls).toEqual([
      'onTick',
      'extraSpawns',
      'cooldownMultiplier',
      'afterAction:tapGenerator',
      'orderReward',
      'afterAction:deliverOrder',
    ]);
  });

  it('calls none when the season isn’t joined', () => {
    const { calls, hooks } = recorder();
    exercise(withRules(hooks), shop({ season: null }), NOW);
    expect(calls).toEqual([]);
  });

  it('calls none while the season waits to start', () => {
    const { calls, hooks } = recorder();
    const waiting = shop({ season: season({ startedAt: null }) });
    // Keep it waiting: a running MegaBun event blocks the start.
    const blocked: GameState = {
      ...waiting,
      event: {
        eventId: 'bake-off',
        startedAt: NOW - HOUR,
        endsAt: NOW + HOUR,
        points: 0,
        claimedMilestones: [],
      },
    };
    exercise(withRules(hooks), blocked, NOW);
    expect(calls).toEqual([]);
  });

  it('calls none once the season has ended', () => {
    const { calls, hooks } = recorder();
    exercise(withRules(hooks), shop(), END);
    expect(calls).toEqual([]);
  });

  it('calls none when the pack has no rules', () => {
    const d = withSeasons(testData, [
      { pack, startsAt: START, endsAt: END, rules: null },
    ]);
    const before = shop();
    const tapped = act(d, before, { type: 'tapGenerator', cell: 0, now: NOW });
    const plain = act(
      testData,
      { ...before, season: null },
      {
        type: 'tapGenerator',
        cell: 0,
        now: NOW,
      },
    );
    expect({ ...tapped.state, season: null }).toEqual(plain.state);
  });

  it('gives each hook the running season, the time, and the action’s rng', () => {
    const seen: [string, number][] = [];
    const rolling = (roll: boolean): GameData => {
      const d = withRules({
        onTick: (ctx, state) => {
          seen.push([ctx.season.def.id, ctx.now]);
          expect(ctx.data).toBe(d);
          if (roll) ctx.rng.next();
          return { ok: true, state, events: [] };
        },
      });
      return d;
    };
    const still = act(rolling(false), game(), { type: 'tick', now: NOW });
    const rolled = act(rolling(true), game(), { type: 'tick', now: NOW });
    expect(seen).toEqual([
      ['autumn', NOW],
      ['autumn', NOW],
    ]);
    // What a hook draws is saved with the state.
    expect(rolled.state.rngState).not.toBe(still.state.rngState);
  });
});

describe('onTick', () => {
  const ghost: GameEvent = {
    type: 'seasonRule',
    seasonId: 'autumn',
    name: 'ghost',
    payload: null,
  };

  it('runs after the core tick, on the tick that starts the season', () => {
    const startedAt: (number | null)[] = [];
    const d = withRules({
      onTick: (_ctx, state) => {
        startedAt.push(state.season?.startedAt ?? null);
        return {
          ok: true,
          state: { ...state, coins: state.coins + 1 },
          events: [ghost],
        };
      },
    });
    const waiting = game({}, { season: season({ startedAt: null }) });
    const r = act(d, waiting, { type: 'tick', now: NOW });
    expect(startedAt).toEqual([NOW]);
    expect(r.events[0]?.type).toBe('seasonStarted');
    expect(r.events.at(-1)).toEqual(ghost);
    expect(r.state.coins).toBe(waiting.coins + 1);
  });

  it('doesn’t run on the tick that ends the season', () => {
    const { calls, hooks } = recorder();
    const r = act(withRules(hooks), game(), { type: 'tick', now: END });
    expect(r.events.at(-1)?.type).toBe('seasonEnded');
    expect(calls).toEqual([]);
  });

  it('keeps the same state object on an idle tick', () => {
    const { calls, hooks } = recorder();
    const d = withRules(hooks);
    const first = act(d, game(), { type: 'tick', now: NOW });
    const second = act(d, first.state, { type: 'tick', now: NOW + HOUR });
    expect(calls).toEqual(['onTick', 'onTick']);
    expect(second.state).toBe(first.state);
    expect(second.events).toEqual([]);
  });

  it('throws when it rejects the tick', () => {
    const d = withRules({ onTick: () => ({ ok: false, reason: 'boardFull' }) });
    expect(() => dispatch(d, game(), { type: 'tick', now: NOW })).toThrow(
      'season "autumn" onTick: rejected the tick ("boardFull")',
    );
  });
});

describe('afterAction', () => {
  it('runs after a successful action, and its events follow the action’s', () => {
    const seen: { action: string; events: string[] }[] = [];
    const d = withRules({
      afterAction: (_ctx, state, action, events) => {
        seen.push({ action: action.type, events: events.map((e) => e.type) });
        return {
          ok: true,
          state: { ...state, coins: state.coins + 5 },
          events: [
            { type: 'seasonRule', seasonId: 'autumn', name: 'tap', payload: 1 },
          ],
        };
      },
    });
    const before = shop();
    const r = act(d, before, { type: 'tapGenerator', cell: 0, now: NOW });
    expect(seen).toEqual([{ action: 'tapGenerator', events: ['spawned'] }]);
    expect(r.events.map((e) => e.type)).toEqual(['spawned', 'seasonRule']);
    expect(r.state.coins).toBe(before.coins + 5);
  });

  it('isn’t called for a tick or a rejected action', () => {
    const { calls, hooks } = recorder();
    const d = withRules({ afterAction: hooks.afterAction });
    act(d, game(), { type: 'tick', now: NOW });
    expect(
      dispatch(d, game(), { type: 'tapGenerator', cell: 5, now: NOW }),
    ).toEqual({ ok: false, reason: 'emptyCell' });
    expect(calls).toEqual([]);
  });

  it('rejects the whole action when it rejects', () => {
    const d = withRules({
      afterAction: () => ({ ok: false, reason: 'noEnergy' }),
    });
    expect(
      dispatch(d, shop(), { type: 'tapGenerator', cell: 0, now: NOW }),
    ).toEqual({ ok: false, reason: 'noEnergy' });
  });

  it('runs after the join that starts the season', () => {
    const { calls, hooks } = recorder();
    const r = act(withRules(hooks), game({}, { season: null }), {
      type: 'joinSeason',
      seasonId: 'autumn',
      now: NOW,
    });
    expect(r.state.season?.startedAt).toBe(NOW);
    expect(calls).toEqual(['afterAction:joinSeason']);
  });
});

describe('extraSpawns', () => {
  const seed: WeightedEntry[] = [{ itemId: 'autumn-seed', weight: 1e9 }];

  it('mixes its entries into the tapped generator’s table', () => {
    const asked: string[] = [];
    const d = withRules(
      {
        extraSpawns: (_ctx, generatorItemId) => {
          asked.push(generatorItemId);
          return seed;
        },
      },
      rareChance(0),
    );
    const r = act(d, shop(), { type: 'tapGenerator', cell: 0, now: NOW });
    expect(asked).toEqual(['flour-mill-1']);
    expect(r.events[0]).toMatchObject({
      type: 'spawned',
      itemId: 'autumn-seed',
    });
  });

  it('changes nothing when it adds no entries', () => {
    const d = withRules({ extraSpawns: () => [] }, rareChance(0));
    const before = shop();
    const hooked = act(d, before, { type: 'tapGenerator', cell: 0, now: NOW });
    const plain = act(
      rareChance(0),
      { ...before, season: null },
      {
        type: 'tapGenerator',
        cell: 0,
        now: NOW,
      },
    );
    expect({ ...hooked.state, season: null }).toEqual(plain.state);
  });

  it('isn’t asked on a rare drop', () => {
    const { calls, hooks } = recorder();
    const d = withRules({ extraSpawns: hooks.extraSpawns }, rareChance(100));
    const r = act(d, shop(), { type: 'tapGenerator', cell: 0, now: NOW });
    expect(r.events[0]).toMatchObject({ type: 'spawned', rare: true });
    expect(calls).toEqual([]);
  });

  it('reaches staff taps', () => {
    const d = withRules({ extraSpawns: () => seed }, rareChance(0));
    const state = game(
      { 0: 'flour-mill-1' },
      {
        chapterId: 'chapter4',
        staff: [
          {
            staffId: 'sam',
            assignedChain: 'flour-mill',
            lastActedAt: NOW - 300_000,
          },
        ],
      },
    );
    const r = act(d, state, { type: 'tick', now: NOW });
    expect(r.events).toContainEqual(
      expect.objectContaining({ type: 'staffActed', itemId: 'autumn-seed' }),
    );
  });

  it.each<[string, WeightedEntry]>([
    ['unknown item id "nope"', { itemId: 'nope', weight: 1 }],
    ['weight 0 for "egg"', { itemId: 'egg', weight: 0 }],
    ['weight -1 for "egg"', { itemId: 'egg', weight: -1 }],
    ['weight NaN for "egg"', { itemId: 'egg', weight: NaN }],
    ['weight Infinity for "egg"', { itemId: 'egg', weight: Infinity }],
  ])('throws on %s', (problem, entry) => {
    const d = withRules({ extraSpawns: () => [entry] }, rareChance(0));
    expect(() =>
      dispatch(d, shop(), { type: 'tapGenerator', cell: 0, now: NOW }),
    ).toThrow(`season "autumn" extraSpawns: ${problem}`);
  });
});

describe('cooldownMultiplier', () => {
  const millCooldownSec = testData.generators.get('flour-mill-1')?.cooldownSec;

  it('multiplies the cooldown with an event perk when a tap empties a generator', () => {
    const asked: string[] = [];
    const d = withRules({
      cooldownMultiplier: (_ctx, chainId) => {
        asked.push(chainId);
        return 2;
      },
    });
    const state = shop({ trophies: ['flour-shortage'] });
    const r = act(d, state, { type: 'tapGenerator', cell: 0, now: NOW });
    const mill = r.state.board.cells[0];
    expect(asked).toEqual(['flour-mill']);
    expect(mill?.kind === 'item' && mill.item.generator).toEqual({
      charges: 0,
      cooldownEndsAt: NOW + (millCooldownSec ?? 0) * 0.8 * 2 * 1000,
    });
  });

  it('isn’t asked while charges remain', () => {
    const { calls, hooks } = recorder();
    const d = withRules({ cooldownMultiplier: hooks.cooldownMultiplier });
    act(d, charged(shop(), 0, 2), { type: 'tapGenerator', cell: 0, now: NOW });
    expect(calls).toEqual([]);
  });

  it.each([0, -1, NaN, Infinity])('throws on %s', (multiplier) => {
    const d = withRules({ cooldownMultiplier: () => multiplier });
    expect(() =>
      dispatch(d, shop(), { type: 'tapGenerator', cell: 0, now: NOW }),
    ).toThrow(
      `season "autumn" cooldownMultiplier: ${String(multiplier)} for "flour-mill" isn't above 0`,
    );
  });
});

describe('orderReward', () => {
  it('changes what’s paid and what orderDelivered reports', () => {
    const seen: Order[] = [];
    const d = withRules({
      orderReward: (_ctx, order, reward) => {
        seen.push(order);
        return { ...reward, coins: reward.coins * 2, xp: 0 };
      },
    });
    const before = shop();
    const r = act(d, before, {
      type: 'deliverOrder',
      orderId: ORDER.id,
      now: NOW,
    });
    const paid = { coins: 20, stars: 1, xp: 0 };
    expect(seen).toEqual([ORDER]);
    expect(r.state.coins).toBe(before.coins + 20);
    expect(r.state.stars).toBe(before.stars + 1);
    expect(r.state.xp).toBe(before.xp);
    expect(r.events[0]).toEqual({
      type: 'orderDelivered',
      orderId: ORDER.id,
      reward: paid,
    });
  });

  it('leaves Season Points alone', () => {
    const d = withRules({
      orderReward: (_ctx, _order, reward) => ({ ...reward, coins: 0 }),
    });
    const before = shop();
    const seasonal = { ...before, orders: [{ ...ORDER, seasonPoints: 6 }] };
    const r = act(d, seasonal, {
      type: 'deliverOrder',
      orderId: ORDER.id,
      now: NOW,
    });
    expect(r.state.season?.points).toBe(6);
    expect(r.state.coins).toBe(before.coins);
  });

  it.each<[string, OrderReward]>([
    ['coins -1', { coins: -1, stars: 0, xp: 0 }],
    ['coins 1.5', { coins: 1.5, stars: 0, xp: 0 }],
    ['stars NaN', { coins: 0, stars: NaN, xp: 0 }],
    ['xp -2', { coins: 0, stars: 0, xp: -2 }],
    ['reputation 0.5', { coins: 0, stars: 0, xp: 0, reputation: 0.5 }],
  ])('throws on %s', (problem, reward) => {
    const d = withRules({ orderReward: () => reward });
    expect(() =>
      dispatch(d, shop(), {
        type: 'deliverOrder',
        orderId: ORDER.id,
        now: NOW,
      }),
    ).toThrow(
      `season "autumn" orderReward: ${problem} isn't a whole number of 0 or more`,
    );
  });

  it('throws when the hook would run but no rng was passed', () => {
    const d = withRules({ orderReward: (_ctx, _order, reward) => reward });
    expect(() => deliverOrder(d, shop(), ORDER.id, NOW)).toThrow(
      'season "autumn" orderReward: no rng was passed to deliverOrder',
    );
    expect(() => deliverOrder(testData, shop(), ORDER.id, NOW)).not.toThrow();
  });
});

describe('the dev freeze', () => {
  it('makes a hook that mutates its state throw', () => {
    const d = withRules({
      afterAction: (_ctx, state) => {
        (state as { coins: number }).coins = 1;
        return { ok: true, state, events: [] };
      },
    });
    expect(() =>
      dispatch(d, shop(), { type: 'tapGenerator', cell: 0, now: NOW }),
    ).toThrow(TypeError);
  });

  it('freezes the order and reward given to orderReward', () => {
    const d = withRules({
      orderReward: (_ctx, order, reward) => {
        (order.wants as string[]).push('egg');
        return reward;
      },
    });
    expect(() =>
      dispatch(d, shop(), {
        type: 'deliverOrder',
        orderId: ORDER.id,
        now: NOW,
      }),
    ).toThrow(TypeError);
  });
});
