/**
 * Tests for seasons in core (T14.4), with the autumn fixture pack.
 */

import { describe, expect, it } from 'vitest';
import fixture from '../seasons/fixtures/autumn.json';
import { parseSeasonPack, withSeasons } from '../seasons/pack';
import { setCell } from './board';
import { deliverOrder } from './deliver';
import { dispatch } from './dispatch';
import { loadRecipe, setBake } from './kitchen';
import { createNewGame } from './newGame';
import { orderShopItems } from './orderShop';
import {
  generateCateringOrder,
  generateOrder,
  generateWholesaleOrder,
  isProducible,
  orderCandidates,
  refillOrders,
} from './orders';
import { createRng } from './rng';
import { deserializeSave, serializeSave } from './save';
import {
  claimSeasonMilestone,
  dismissSeasonResult,
  isSeasonalItem,
  joinSeason,
  runningSeason,
  sweepOrphanSeason,
  tickSeason,
} from './seasons';
import { assignStaff } from './staff';
import { stateWith, testData, type CellSpec } from './testing';
import type {
  Action,
  ActionResult,
  ActiveSeason,
  BoardItem,
  GameData,
  GameEvent,
  GameState,
  Order,
} from './types';

const HOUR = 3_600_000;
const DAY = 86_400_000;
const START = Date.UTC(2026, 10, 12);
const END = Date.UTC(2026, 11, 1);
const NOW = START + DAY;

const pack = parseSeasonPack(testData, fixture);
const data = withSeasons(testData, [
  { pack, startsAt: START, endsAt: END, rules: null },
]);
const rng = () => createRng(1);

const SEASONAL_ORDER_ITEMS = [
  'autumn-seed',
  'autumn-gourd',
  'autumn-big-gourd',
  'autumn-pie',
  'autumn-pie-pair',
];
const WALK_INS = [...testData.customers.values()]
  .filter((c) => c.kind === 'walkIn')
  .map((c) => c.id);

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

/** A game past the tutorial, with no regular orders due. */
function game(
  cells: Readonly<Record<number, CellSpec>> = {},
  overrides: Partial<GameState> = {},
): GameState {
  return stateWith(cells, {
    tutorialStep: 'done',
    nextOrderAt: null,
    ...overrides,
  });
}

function item(itemId: string): BoardItem {
  return { itemId, cobwebbed: false, generator: null };
}

/** The seasonal generator, fully charged (stateWith only knows base generators). */
function withPatch(state: GameState, cell: number): GameState {
  return {
    ...state,
    board: setCell(state.board, cell, {
      kind: 'item',
      item: {
        itemId: 'autumn-patch-1',
        cobwebbed: false,
        generator: { charges: 20, cooldownEndsAt: null },
      },
    }),
  };
}

function seasonalOrders(state: GameState): Order[] {
  return state.orders.filter((o) => o.seasonPoints !== undefined);
}

function boardItemIds(state: GameState): string[] {
  return state.board.cells.flatMap((c) =>
    c.kind === 'item' ? [c.item.itemId] : [],
  );
}

/** A board and Pantry with no room at all. */
function fullGame(): GameState {
  const cells = testData.newGame.cols * testData.newGame.rows;
  const state = game(
    Object.fromEntries(Array.from({ length: cells }, (_, i) => [i, 'egg'])),
  );
  return {
    ...state,
    pantry: {
      ...state.pantry,
      items: Array.from({ length: state.pantry.capacity }, () => item('egg')),
    },
  };
}

describe('joinSeason', () => {
  it('joins an open season, places its generator and opens its orders', () => {
    const r = ok(joinSeason(data, game(), 'autumn', rng(), NOW));
    expect(r.state.season).toEqual(season({ joinedAt: NOW, startedAt: NOW }));
    expect(boardItemIds(r.state)).toEqual(['autumn-patch-1']);
    expect(r.events.map((e) => e.type)).toEqual([
      'seasonJoined',
      'seasonStarted',
      'spawned',
      'discovered',
      'orderArrived',
      'orderArrived',
      'orderArrived',
    ]);
  });

  it('opens orders for the pack’s items that pay coins and Season Points only', () => {
    const { state } = ok(joinSeason(data, game(), 'autumn', rng(), NOW));
    const orders = seasonalOrders(state);
    expect(orders).toHaveLength(pack.def.orders.maxOpen);
    for (const order of orders) {
      expect(order.wants.length).toBeGreaterThanOrEqual(1);
      expect(order.wants.length).toBeLessThanOrEqual(2);
      for (const id of order.wants) expect(SEASONAL_ORDER_ITEMS).toContain(id);
      expect(WALK_INS).toContain(order.customerId);
      const value = order.wants.reduce(
        (n, id) => n + (data.items.get(id)?.sellValue ?? 0),
        0,
      );
      expect(order.reward).toEqual({ coins: value, stars: 0, xp: 0 });
      expect(order.seasonPoints).toBe(4 * order.wants.length);
    }
  });

  it('is open from the first instant of the window until its end', () => {
    expect(joinSeason(data, game(), 'autumn', rng(), START).ok).toBe(true);
    expect(joinSeason(data, game(), 'autumn', rng(), END - 1).ok).toBe(true);
    for (const now of [START - 1, END]) {
      expect(joinSeason(data, game(), 'autumn', rng(), now)).toEqual({
        ok: false,
        reason: 'seasonNotOpen',
      });
    }
  });

  it('refuses a season that isn’t loaded', () => {
    expect(joinSeason(data, game(), 'winter', rng(), NOW)).toEqual({
      ok: false,
      reason: 'seasonNotOpen',
    });
    expect(joinSeason(testData, game(), 'autumn', rng(), NOW)).toEqual({
      ok: false,
      reason: 'seasonNotOpen',
    });
  });

  it('refuses before the tutorial is done', () => {
    const state = game({}, { tutorialStep: 'firstOrder' });
    expect(joinSeason(data, state, 'autumn', rng(), NOW)).toEqual({
      ok: false,
      reason: 'seasonNotOpen',
    });
  });

  it('refuses while a season is joined', () => {
    const { state } = ok(joinSeason(data, game(), 'autumn', rng(), NOW));
    expect(joinSeason(data, state, 'autumn', rng(), NOW)).toEqual({
      ok: false,
      reason: 'alreadyCompleted',
    });
  });

  it('joins with no room, and the generator arrives on the first tick with room', () => {
    const joined = ok(joinSeason(data, fullGame(), 'autumn', rng(), NOW));
    expect(joined.state.season?.startedAt).toBeNull();
    expect(seasonalOrders(joined.state)).toEqual([]);
    expect(joined.events).toEqual([
      { type: 'seasonJoined', seasonId: 'autumn' },
    ]);

    const waiting = tickSeason(data, joined.state, rng(), NOW + 1000);
    expect(ok(waiting).state).toBe(joined.state);

    const room = {
      ...joined.state,
      board: setCell(joined.state.board, 10, { kind: 'empty' }),
    };
    const later = NOW + 2000;
    const started = ok(tickSeason(data, room, rng(), later));
    expect(started.state.season?.startedAt).toBe(later);
    expect(started.state.board.cells[10]).toMatchObject({
      kind: 'item',
      item: { itemId: 'autumn-patch-1' },
    });
    expect(seasonalOrders(started.state)).toHaveLength(3);
    expect(started.events[0]).toEqual({
      type: 'seasonStarted',
      seasonId: 'autumn',
    });
  });

  it('waits for a running MegaBun event, then starts on the tick it ends', () => {
    const eventEnds = NOW + DAY;
    const state = game(
      {},
      {
        chapterId: 'chapter2',
        event: {
          eventId: 'bake-off',
          startedAt: NOW - DAY,
          endsAt: eventEnds,
          points: 0,
          claimedMilestones: [],
        },
      },
    );
    const joined = ok(joinSeason(data, state, 'autumn', rng(), NOW));
    expect(joined.state.season?.startedAt).toBeNull();

    const during = ok(
      dispatch(data, joined.state, { type: 'tick', now: NOW + HOUR }),
    );
    expect(during.state.season?.startedAt).toBeNull();

    const after = ok(
      dispatch(data, during.state, { type: 'tick', now: eventEnds }),
    );
    const types = after.events.map((e) => e.type);
    expect(types).toContain('eventEnded');
    expect(types).toContain('seasonStarted');
    expect(after.state.season?.startedAt).toBe(eventEnds);
    expect(seasonalOrders(after.state)).toHaveLength(3);
  });
});

describe('tickSeason', () => {
  it('keeps the same state when nothing changes', () => {
    const { state } = ok(joinSeason(data, game(), 'autumn', rng(), NOW));
    const r = ok(tickSeason(data, state, rng(), NOW + HOUR));
    expect(r.state).toBe(state);
    expect(r.events).toEqual([]);
    const none = game();
    expect(ok(tickSeason(data, none, rng(), NOW)).state).toBe(none);
  });

  it('tops seasonal orders back up', () => {
    const { state } = ok(joinSeason(data, game(), 'autumn', rng(), NOW));
    const fewer = { ...state, orders: state.orders.slice(1) };
    const r = ok(tickSeason(data, fewer, rng(), NOW + HOUR));
    expect(seasonalOrders(r.state)).toHaveLength(3);
    expect(r.events).toEqual([
      { type: 'orderArrived', orderId: state.nextOrderId },
    ]);
  });

  it('drops a season whose pack is no longer loaded', () => {
    const { state } = ok(joinSeason(data, game(), 'autumn', rng(), NOW));
    const regular: Order = {
      id: 99,
      customerId: WALK_INS[0] ?? '',
      wants: ['egg'],
      reward: { coins: 1, stars: 1, xp: 1 },
    };
    const withRegular = { ...state, orders: [...state.orders, regular] };
    const r = ok(tickSeason(testData, withRegular, rng(), NOW + HOUR));
    expect(r.state.season).toBeNull();
    expect(r.state.orders).toEqual([regular]);
    expect(r.events).toEqual([]);
  });
});

describe('seasonal orders beside regular ones', () => {
  it('don’t take a regular order’s slot', () => {
    const { state } = ok(
      joinSeason(data, game({ 0: 'flour-mill-1' }), 'autumn', rng(), NOW),
    );
    const r = ok(
      refillOrders(data, { ...state, nextOrderAt: NOW }, rng(), NOW),
    );
    expect(seasonalOrders(r.state)).toHaveLength(3);
    const regular = r.state.orders.filter((o) => o.seasonPoints === undefined);
    expect(regular).toHaveLength(data.economy.orders.maxOpen);
    for (const id of regular.flatMap((o) => o.wants)) {
      expect(isSeasonalItem(data, id)).toBe(false);
    }
  });

  it('add their points to the season when delivered', () => {
    const order: Order = {
      id: 50,
      customerId: WALK_INS[0] ?? '',
      wants: ['autumn-seed'],
      reward: { coins: 2, stars: 0, xp: 0 },
      seasonPoints: 4,
    };
    const before = game(
      { 0: 'autumn-seed' },
      { season: season({ points: 10 }), orders: [order] },
    );
    const r = ok(deliverOrder(data, before, 50, NOW));
    expect(r.state.season?.points).toBe(14);
    expect(r.state.coins).toBe(before.coins + 2);
    expect(r.state.stars).toBe(before.stars);
    expect(r.state.xp).toBe(before.xp);
  });

  it('don’t count as the open order the player can make', () => {
    // Only flour is producible; the seasonal order is too, but mustn't let
    // the next regular order ask for something the player can't make.
    const order: Order = {
      id: 50,
      customerId: WALK_INS[0] ?? '',
      wants: ['autumn-seed'],
      reward: { coins: 2, stars: 0, xp: 0 },
      seasonPoints: 4,
    };
    const base = game(
      { 0: 'flour-mill-1' },
      { season: season(), orders: [order] },
    );
    const state = withPatch(
      { ...base, discovered: [...base.discovered, 'autumn-seed'] },
      1,
    );
    expect(isProducible(data, state, 'autumn-seed')).toBe(true);
    for (let seed = 1; seed <= 40; seed++) {
      const regular = generateOrder(data, state, createRng(seed));
      for (const id of regular.wants) {
        expect(isProducible(data, state, id)).toBe(true);
      }
    }
  });
});

describe('seasonal items stay out of base-game orders and the Shop', () => {
  const everything = game(
    {},
    {
      discovered: [...data.items.keys()],
      chapterId: 'chapter5',
    },
  );

  it('are never order candidates', () => {
    for (const kind of ['walkIn', 'regular'] as const) {
      const ids = orderCandidates(data, everything, kind).map((i) => i.id);
      expect(ids.length).toBeGreaterThan(0);
      expect(ids.filter((id) => isSeasonalItem(data, id))).toEqual([]);
    }
  });

  it('are never asked for by catering or wholesale', () => {
    const { catering, wholesale } = data.economy.orders;
    if (!catering || !wholesale) throw new Error('test data has both');
    const always: GameData = {
      ...data,
      economy: {
        ...data.economy,
        orders: {
          ...data.economy.orders,
          catering: { ...catering, chancePercent: 100, minTier: 1 },
          wholesale: { ...wholesale, chancePercent: 100 },
        },
      },
    };
    const onlySeasonal = withPatch(
      game(
        {},
        {
          chapterId: 'chapter5',
          season: season(),
          discovered: SEASONAL_ORDER_ITEMS,
        },
      ),
      0,
    );
    expect(isProducible(always, onlySeasonal, 'autumn-seed')).toBe(true);
    for (let seed = 1; seed <= 20; seed++) {
      expect(
        generateCateringOrder(always, onlySeasonal, createRng(seed), NOW),
      ).toBeNull();
      expect(
        generateWholesaleOrder(always, onlySeasonal, createRng(seed), NOW),
      ).toBeNull();
    }
  });

  it('are never sold by "For your orders"', () => {
    const state = game(
      {},
      {
        season: season(),
        orders: [
          {
            id: 1,
            customerId: WALK_INS[0] ?? '',
            wants: ['autumn-seed'],
            reward: { coins: 2, stars: 0, xp: 0 },
            seasonPoints: 4,
          },
          {
            id: 2,
            customerId: WALK_INS[0] ?? '',
            wants: ['egg'],
            reward: { coins: 2, stars: 1, xp: 1 },
          },
        ],
      },
    );
    expect(orderShopItems(data, state).map((row) => row.itemId)).toEqual([
      'egg',
    ]);
  });
});

describe('seasonal recipes and chains outside their season', () => {
  const inputs = { 0: 'autumn-big-gourd', 1: 'flour-bag', 2: 'butter-pat' };
  const load = (state: GameState) =>
    loadRecipe(
      data,
      state,
      { oven: 0, slot: 0 },
      'autumn-bake-pie',
      [0, 1, 2],
      NOW,
    );

  it('loads a seasonal recipe only while its season runs', () => {
    expect(load(game(inputs))).toEqual({
      ok: false,
      reason: 'noActiveSeason',
    });
    expect(load(game(inputs, { season: season({ startedAt: null }) }))).toEqual(
      { ok: false, reason: 'noActiveSeason' },
    );
    expect(ok(load(game(inputs, { season: season() }))).events).toEqual([
      {
        type: 'bakeStarted',
        slot: { oven: 0, slot: 0 },
        recipeId: 'autumn-bake-pie',
      },
    ]);
  });

  const hired = (state: GameState): GameState => ({
    ...state,
    staff: [
      { staffId: 'sam', assignedChain: null, lastActedAt: 0 },
      { staffId: 'auto-oven', assignedChain: null, lastActedAt: 0 },
    ],
  });

  it('gives the auto-oven a seasonal recipe only while its season runs', () => {
    expect(
      assignStaff(
        data,
        hired(game()),
        'auto-oven',
        null,
        NOW,
        'autumn-bake-pie',
      ),
    ).toEqual({ ok: false, reason: 'noActiveSeason' });
    const r = ok(
      assignStaff(
        data,
        hired(game({}, { season: season() })),
        'auto-oven',
        null,
        NOW,
        'autumn-bake-pie',
      ),
    );
    expect(r.state.staff[1]?.assignedRecipe).toBe('autumn-bake-pie');
    expect(
      ok(
        assignStaff(data, hired(game()), 'auto-oven', null, NOW, 'bake-cookie'),
      ).state.staff[1]?.assignedRecipe,
    ).toBe('bake-cookie');
  });

  it('gives a tapper the seasonal generator only while its season runs', () => {
    expect(
      assignStaff(data, hired(game()), 'sam', 'autumn-patch', NOW),
    ).toEqual({ ok: false, reason: 'noActiveSeason' });
    const r = ok(
      assignStaff(
        data,
        hired(game({}, { season: season() })),
        'sam',
        'autumn-patch',
        NOW,
      ),
    );
    expect(r.state.staff[0]?.assignedChain).toBe('autumn-patch');
  });
});

describe('claimSeasonMilestone', () => {
  const at = (points: number, claimed: number[] = []) =>
    game({}, { season: season({ points, claimedMilestones: claimed }) });

  it('rejects with no season joined', () => {
    expect(claimSeasonMilestone(data, game(), 0)).toEqual({
      ok: false,
      reason: 'noActiveSeason',
    });
  });

  it('rejects a milestone not yet reached', () => {
    expect(claimSeasonMilestone(data, at(19), 0)).toEqual({
      ok: false,
      reason: 'milestoneNotReached',
    });
  });

  it('pays a reached milestone once', () => {
    const before = at(60);
    const r = ok(claimSeasonMilestone(data, before, 1));
    expect(r.state.coins).toBe(before.coins + 100);
    expect(r.state.gems).toBe(before.gems + 5);
    expect(r.state.season?.claimedMilestones).toEqual([1]);
    expect(r.state.keepsakes).toEqual([]);
    expect(r.events).toEqual([
      {
        type: 'seasonMilestoneClaimed',
        seasonId: 'autumn',
        index: 1,
        reward: { coins: 100, gems: 5 },
      },
    ]);
    expect(claimSeasonMilestone(data, r.state, 1)).toEqual({
      ok: false,
      reason: 'alreadyCompleted',
    });
  });

  it('records a keepsake with the season’s year', () => {
    const r = ok(claimSeasonMilestone(data, at(120), 2));
    expect(r.state.keepsakes).toEqual([
      {
        id: 'autumn-wreath',
        seasonId: 'autumn',
        name: 'Harvest Wreath',
        spriteKey: 'autumn-wreath',
        year: 2026,
      },
    ]);
    expect(r.events.map((e) => e.type)).toEqual([
      'seasonMilestoneClaimed',
      'keepsakeEarned',
    ]);
    expect(r.events[1]).toEqual({
      type: 'keepsakeEarned',
      seasonId: 'autumn',
      keepsakeId: 'autumn-wreath',
    });
  });

  it('throws on an out-of-range index', () => {
    expect(() => claimSeasonMilestone(data, at(999), 3)).toThrow(
      /no milestone 3/,
    );
  });

  // [window start, window end, endsAt, year]. endsAt is local midnight after
  // the last day: 08:00 UTC in California, 15:00 UTC the day before in Tokyo.
  it.each([
    ['11-12', '11-30', Date.UTC(2026, 11, 1, 8), 2026],
    ['11-12', '11-30', Date.UTC(2026, 10, 30, 15), 2026],
    ['12-20', '01-06', Date.UTC(2027, 0, 7, 8), 2026],
    ['12-20', '01-06', Date.UTC(2027, 0, 6, 15), 2026],
    ['12-01', '12-31', Date.UTC(2027, 0, 1, 8), 2026],
    ['12-01', '12-31', Date.UTC(2026, 11, 31, 15), 2026],
    ['01-01', '01-05', Date.UTC(2027, 0, 6, 8), 2027],
    ['01-01', '01-05', Date.UTC(2027, 0, 5, 15), 2027],
    // Ended early by dev tools (T14.8): still that run's year.
    ['11-12', '11-30', Date.UTC(2026, 10, 9, 20), 2026],
    ['12-20', '01-06', Date.UTC(2026, 11, 22, 8), 2026],
  ])(
    'dates a keepsake from a %s to %s season ending at %d as %d',
    (start, end, endsAt, year) => {
      const dated = parseSeasonPack(testData, {
        ...fixture,
        window: { start, end },
      });
      const d = withSeasons(testData, [
        { pack: dated, startsAt: endsAt - 10 * DAY, endsAt, rules: null },
      ]);
      const state = game({}, { season: season({ points: 120, endsAt }) });
      const r = ok(claimSeasonMilestone(d, state, 2));
      expect(r.state.keepsakes[0]?.year).toBe(year);
    },
  );
});

describe('the end of a season', () => {
  const cookieBake = { recipeId: 'bake-cookie', startedAt: NOW, endsAt: NOW };
  const pieBake = { recipeId: 'autumn-bake-pie', startedAt: NOW, endsAt: NOW };
  const flourChain = testData.items.get('flour-mill-1')?.chainId ?? '';

  /** Seasonal things everywhere they can be, with milestone 0 claimed and 1 reached. */
  function ending(): GameState {
    const joined = ok(
      joinSeason(
        data,
        game({ 0: 'autumn-big-gourd', 1: 'egg' }),
        'autumn',
        rng(),
        NOW,
      ),
    ).state;
    const twoOvens: GameState = {
      ...joined,
      kitchen: {
        ovens: [
          { ovenId: 'toaster-oven', slots: [null] },
          { ovenId: 'brick-oven', slots: [null, null] },
        ],
      },
    };
    const baking = setBake(
      setBake(twoOvens, { oven: 0, slot: 0 }, pieBake),
      { oven: 1, slot: 1 },
      cookieBake,
    );
    return {
      ...baking,
      pantry: {
        ...baking.pantry,
        items: [item('autumn-pie'), item('butter-pat')],
      },
      orders: [
        ...baking.orders,
        {
          id: 99,
          customerId: WALK_INS[0] ?? '',
          wants: ['egg'],
          reward: { coins: 1, stars: 1, xp: 1 },
        },
      ],
      lastSale: { item: item('autumn-seed'), cell: 5, coins: 2, soldAt: NOW },
      discovered: [...baking.discovered, 'autumn-seed', 'autumn-gourd'],
      pendingDiscoveries: ['autumn-gourd', 'egg'],
      rewardedChains: ['autumn-gourd', flourChain],
      staff: [
        { staffId: 'sam', assignedChain: 'autumn-patch', lastActedAt: NOW },
        {
          staffId: 'auto-oven',
          assignedChain: null,
          assignedRecipe: 'autumn-bake-pie',
          lastActedAt: NOW,
        },
        { staffId: 'rosa', assignedChain: flourChain, lastActedAt: NOW },
      ],
      season: season({ joinedAt: NOW, points: 70, claimedMilestones: [0] }),
    };
  }

  it('waits until the window closes', () => {
    const state = ending();
    expect(ok(tickSeason(data, state, rng(), END - 1)).state).toBe(state);
  });

  it('sells every seasonal item on the board, in the Pantry and in the ovens', () => {
    const before = ending();
    const { state } = ok(tickSeason(data, before, rng(), END));
    expect(boardItemIds(state)).toEqual(['egg']);
    expect(state.pantry.items).toEqual([item('butter-pat')]);
    expect(state.kitchen.ovens.map((o) => o.slots)).toEqual([
      [null],
      [null, cookieBake],
    ]);
    // A big gourd (8) and two gourd pies (30 each); the generator pays nothing.
    expect(state.seasonResult).toEqual({
      seasonId: 'autumn',
      points: 70,
      coins: 68,
    });
    // Milestone 1 was reached but not claimed, so it pays now.
    expect(state.coins).toBe(before.coins + 68 + 100);
    expect(state.gems).toBe(before.gems + 5);
    expect(state.keepsakes).toEqual([]);
  });

  it('drops seasonal orders, discoveries, rewards, staff work and the last sale', () => {
    const { state } = ok(tickSeason(data, ending(), rng(), END));
    expect(state.orders.map((o) => o.id)).toEqual([99]);
    expect(state.lastSale).toBeNull();
    expect(state.discovered.filter((id) => isSeasonalItem(data, id))).toEqual(
      [],
    );
    expect(state.discovered.length).toBeGreaterThan(0);
    expect(state.pendingDiscoveries).toEqual(['egg']);
    expect(state.rewardedChains).toEqual([flourChain]);
    expect(state.staff).toEqual([
      { staffId: 'sam', assignedChain: null, lastActedAt: NOW },
      {
        staffId: 'auto-oven',
        assignedChain: null,
        assignedRecipe: null,
        lastActedAt: NOW,
      },
      { staffId: 'rosa', assignedChain: flourChain, lastActedAt: NOW },
    ]);
  });

  it('clears the season and leaves the result card', () => {
    const r = ok(tickSeason(data, ending(), rng(), END));
    expect(r.state.season).toBeNull();
    expect(r.events).toEqual([
      { type: 'seasonEnded', seasonId: 'autumn', points: 70 },
    ]);
  });

  it('keeps a base-game last sale', () => {
    const state = {
      ...ending(),
      lastSale: { item: item('egg'), cell: 5, coins: 2, soldAt: NOW },
    };
    const r = ok(tickSeason(data, state, rng(), END));
    expect(r.state.lastSale).toEqual(state.lastSale);
  });

  it('pays an unclaimed keepsake milestone with its keepsake', () => {
    const before = { ...ending(), season: season({ points: 130 }) };
    const r = ok(tickSeason(data, before, rng(), END));
    expect(r.state.coins).toBe(before.coins + 68 + 50 + 100);
    expect(r.state.gems).toBe(before.gems + 5 + 10);
    expect(r.state.keepsakes).toEqual([
      {
        id: 'autumn-wreath',
        seasonId: 'autumn',
        name: 'Harvest Wreath',
        spriteKey: 'autumn-wreath',
        year: 2026,
      },
    ]);
    expect(r.events).toEqual([
      {
        type: 'keepsakeEarned',
        seasonId: 'autumn',
        keepsakeId: 'autumn-wreath',
      },
      { type: 'seasonEnded', seasonId: 'autumn', points: 130 },
    ]);
  });

  it('ends a season that never started with 0 points', () => {
    const state = game({}, { season: season({ startedAt: null }) });
    const r = ok(tickSeason(data, state, rng(), END));
    expect(r.state.season).toBeNull();
    expect(r.state.seasonResult).toEqual({
      seasonId: 'autumn',
      points: 0,
      coins: 0,
    });
  });

  it('leaves a save that loads without the pack', () => {
    const before = ending();
    // Before the end, only the orphan sweep (T14.6) lets it load.
    const orphaned = deserializeSave(testData, serializeSave(before, END));
    expect(orphaned.ok && orphaned.swept?.ended).toBe(true);
    const { state } = ok(tickSeason(data, before, rng(), END));
    const loaded = deserializeSave(testData, serializeSave(state, END));
    if (!loaded.ok) throw new Error(loaded.error);
    expect(loaded.swept).toBeNull();
    expect(loaded.save.state).toEqual(state);
  });

  describe('sweepOrphanSeason (T14.6)', () => {
    const autumnIds = (ids: readonly string[]): string[] =>
      ids.filter((id) => id.startsWith('autumn-'));

    it('sweeps all of a season whose pack isn’t loaded, and ends it', () => {
      const before = ending();
      const { state, sweep } = sweepOrphanSeason(testData, before);
      // The big gourd, the generator, the Pantry pie and the pie bake, at 5 each.
      expect(sweep).toEqual({ seasonId: 'autumn', coins: 20, ended: true });
      expect(autumnIds(boardItemIds(before))).toHaveLength(2);
      expect(autumnIds(boardItemIds(state))).toEqual([]);
      expect(state.pantry.items).toEqual([item('butter-pat')]);
      expect(state.kitchen.ovens.map((o) => o.slots)).toEqual([
        [null],
        [null, cookieBake],
      ]);
      expect(state.orders.map((o) => o.id)).toEqual([99]);
      expect(state.lastSale).toBeNull();
      expect(autumnIds(state.discovered)).toEqual([]);
      expect(state.pendingDiscoveries).toEqual(['egg']);
      expect(state.rewardedChains).toEqual([flourChain]);
      expect(state.staff).toEqual([
        { staffId: 'sam', assignedChain: null, lastActedAt: NOW },
        {
          staffId: 'auto-oven',
          assignedChain: null,
          assignedRecipe: null,
          lastActedAt: NOW,
        },
        { staffId: 'rosa', assignedChain: flourChain, lastActedAt: NOW },
      ]);
      expect(state.coins).toBe(before.coins + 20);
      expect(state.gems).toBe(before.gems);
      expect(state.season).toBeNull();
      expect(state.seasonResult).toBeNull();
      expect(state.keepsakes).toEqual(before.keepsakes);
    });

    it('sweeps only the ids an updated pack no longer has', () => {
      const items = new Map(data.items);
      items.delete('autumn-big-gourd');
      const recipes = new Map(data.recipes);
      recipes.delete('autumn-bake-pie');
      const updated: GameData = { ...data, items, recipes };
      const before = ending();
      const { state, sweep } = sweepOrphanSeason(updated, before);
      expect(sweep).toEqual({ seasonId: 'autumn', coins: 10, ended: false });
      expect(boardItemIds(state)).not.toContain('autumn-big-gourd');
      expect(boardItemIds(state)).toContain('autumn-patch-1');
      expect(state.pantry.items).toEqual(before.pantry.items);
      expect(state.kitchen.ovens.map((o) => o.slots)).toEqual([
        [null],
        [null, cookieBake],
      ]);
      expect(state.orders).toEqual(
        before.orders.filter((o) => !o.wants.includes('autumn-big-gourd')),
      );
      expect(state.lastSale).toEqual(before.lastSale);
      expect(state.staff[1]?.assignedRecipe).toBeNull();
      expect(state.staff[0]).toEqual(before.staff[0]);
      expect(state.season).toEqual(before.season);
      expect(state.coins).toBe(before.coins + 10);
    });

    it('changes nothing when every id loads or no season is joined', () => {
      const before = ending();
      const loaded = sweepOrphanSeason(data, before);
      expect(loaded.state).toBe(before);
      expect(loaded.sweep).toBeNull();
      const none = { ...before, season: null, keepsakes: [] };
      expect(sweepOrphanSeason(data, none).state).toBe(none);
    });

    it('ends a season that had nothing on the board yet, paying nothing', () => {
      const waiting = game({}, { season: season({ startedAt: null }) });
      const { state, sweep } = sweepOrphanSeason(testData, waiting);
      expect(sweep).toEqual({ seasonId: 'autumn', coins: 0, ended: true });
      expect(state.season).toBeNull();
      expect(state.coins).toBe(waiting.coins);
    });

    it('still refuses a save with another unknown id', () => {
      const before = ending();
      const odd = {
        ...before,
        pantry: { ...before.pantry, items: [item('winter-sled')] },
      };
      const loaded = deserializeSave(testData, serializeSave(odd, END));
      expect(loaded.ok).toBe(false);
      if (!loaded.ok) expect(loaded.error).toContain('"winter-sled"');
    });
  });
});

describe('MegaBun events during a season', () => {
  it('don’t start while a season is joined; the one due starts after it ends', () => {
    let state = game(
      {},
      { chapterId: 'chapter2', season: season(), nextEventAt: NOW },
    );
    const tick = (now: number): GameEvent[] => {
      const r = ok(dispatch(data, state, { type: 'tick', now }));
      state = r.state;
      return [...r.events];
    };

    tick(NOW + HOUR);
    tick(NOW + DAY);
    expect(state.event).toBeNull();

    const ended = tick(END).map((e) => e.type);
    expect(ended).toContain('seasonEnded');
    expect(state.event).toBeNull();

    expect(tick(END + 1000).map((e) => e.type)).toContain('eventStarted');
    expect(state.event?.startedAt).toBe(END + 1000);
  });
});

describe('dismissSeasonResult', () => {
  it('clears the result', () => {
    const state = game(
      {},
      { seasonResult: { seasonId: 'autumn', points: 70, coins: 68 } },
    );
    expect(ok(dismissSeasonResult(state)).state.seasonResult).toBeNull();
  });

  it('keeps the same state when there is nothing to dismiss', () => {
    const state = game();
    expect(ok(dismissSeasonResult(state)).state).toBe(state);
  });
});

describe('runningSeason and isSeasonalItem', () => {
  it('runningSeason is the joined season once started and while loaded', () => {
    expect(runningSeason(data, game())).toBeNull();
    const waiting = game({}, { season: season({ startedAt: null }) });
    expect(runningSeason(data, waiting)).toBeNull();
    const started = game({}, { season: season() });
    expect(runningSeason(data, started)?.def.id).toBe('autumn');
    expect(runningSeason(testData, started)).toBeNull();
  });

  it('isSeasonalItem tells pack items from base items', () => {
    expect(isSeasonalItem(data, 'autumn-seed')).toBe(true);
    expect(isSeasonalItem(data, 'autumn-patch-1')).toBe(true);
    expect(isSeasonalItem(data, 'egg')).toBe(false);
    expect(() => isSeasonalItem(data, 'nope')).toThrow(/unknown item/);
  });
});

describe('a player who never joins', () => {
  /** Ticks, taps, deliveries and sales every 3 hours, through the season and past it. */
  function play(d: GameData): { state: GameState; events: GameEvent[] } {
    let state: GameState = {
      ...createNewGame(testData, 7, NOW),
      tutorialStep: 'done',
      chapterId: 'chapter2',
    };
    const events: GameEvent[] = [];
    const act = (action: Action): void => {
      const r = dispatch(d, state, action);
      if (r.ok) {
        state = r.state;
        events.push(...r.events);
      }
    };
    for (let now = NOW; now < END + 21 * DAY; now += 3 * HOUR) {
      act({ type: 'tick', now });
      state.board.cells.forEach((cell, i) => {
        if (cell.kind === 'item' && cell.item.generator) {
          act({ type: 'tapGenerator', cell: i, now });
        }
      });
      for (const order of state.orders) {
        act({ type: 'deliverOrder', orderId: order.id, now });
      }
      state.board.cells.forEach((cell, i) => {
        if (
          cell.kind === 'item' &&
          !cell.item.generator &&
          !cell.item.cobwebbed
        ) {
          act({ type: 'sell', cell: i, now });
        }
      });
    }
    return { state, events };
  }

  it('plays the same with the pack loaded as without it', () => {
    const without = play(testData);
    expect(without.events.map((e) => e.type)).toContain('eventStarted');
    expect(play(data)).toEqual(without);
  });

  it('plays the same with a pack whose rules define every hook (T14.5)', () => {
    const loud = (): never => {
      throw new Error('a season hook ran');
    };
    const hooked = withSeasons(testData, [
      {
        pack,
        startsAt: START,
        endsAt: END,
        rules: {
          apiVersion: 1,
          onTick: loud,
          afterAction: loud,
          extraSpawns: loud,
          cooldownMultiplier: loud,
          orderReward: loud,
        },
      },
    ]);
    expect(play(hooked)).toEqual(play(testData));
  });
});
