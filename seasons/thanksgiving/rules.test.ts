/**
 * Tests for Harvest Supper's rules (T14.9): alone, and through the real
 * dispatch with the pack merged into the base data.
 */

import { describe, expect, it } from 'vitest';
import { setCell } from '../../src/core/board';
import { dispatch } from '../../src/core/dispatch';
import { createRng } from '../../src/core/rng';
import type { SeasonContext } from '../../src/core/seasonApi';
import { tickSeason } from '../../src/core/seasons';
import { stateWith, testData, type CellSpec } from '../../src/core/testing';
import type {
  ActionResult,
  ActiveSeason,
  ChainId,
  GameState,
  Order,
} from '../../src/core/types';
import { parseSeasonPack, withSeasons } from '../../src/seasons/pack';
import json from './season.json';
import rules from './rules';

const START = Date.UTC(2026, 10, 12);
const END = Date.UTC(2026, 11, 1);
const NOW = START + 86_400_000;

const data = withSeasons(testData, [
  {
    pack: parseSeasonPack(testData, json),
    startsAt: START,
    endsAt: END,
    rules,
  },
]);
const loaded = data.seasons.get('thanksgiving');
if (!loaded) throw new Error('thanksgiving not loaded');
const ctx: SeasonContext = {
  data,
  season: loaded,
  now: NOW,
  rng: createRng(1),
};

const WALK_IN =
  [...testData.customers.values()].find((c) => c.kind === 'walkIn')?.id ?? '';

function order(wants: string[], seasonPoints?: number): Order {
  return {
    id: 50,
    customerId: WALK_IN,
    wants,
    reward: { coins: 40, stars: 0, xp: 0 },
    ...(seasonPoints !== undefined && { seasonPoints }),
  };
}

function season(change: Partial<ActiveSeason> = {}): ActiveSeason {
  return {
    seasonId: 'thanksgiving',
    joinedAt: START,
    startedAt: START,
    endsAt: END,
    points: 0,
    claimedMilestones: [],
    custom: null,
    ...change,
  };
}

type Done = Extract<ActionResult, { ok: true }>;
function ok(result: ActionResult): Done {
  if (!result.ok) throw new Error(`expected ok, got "${result.reason}"`);
  return result;
}

describe('extraSpawns', () => {
  it.each(['flour-mill-1', 'flour-mill-2', 'flour-mill-3'])(
    'adds pecans to %s',
    (mill) => {
      expect(rules.extraSpawns(ctx, mill)).toEqual([
        { itemId: 'thanksgiving-pecan', weight: 10 },
      ]);
    },
  );

  it('leaves every other generator alone', () => {
    expect(rules.extraSpawns(ctx, 'sugar-tin-1')).toEqual([]);
    expect(rules.extraSpawns(ctx, 'thanksgiving-patch-1')).toEqual([]);
  });
});

describe('orderReward', () => {
  const reward = { coins: 41, stars: 0, xp: 0 };

  it('pays a seasonal order of three items half again, rounded', () => {
    const feast = order(
      ['thanksgiving-pie', 'thanksgiving-pecan', 'thanksgiving-cranberry'],
      15,
    );
    expect(rules.orderReward(ctx, feast, reward)).toEqual({
      coins: 62,
      stars: 0,
      xp: 0,
    });
  });

  it('leaves smaller seasonal orders and regular orders alone', () => {
    const pair = order(['thanksgiving-pie', 'thanksgiving-pecan'], 10);
    const regular = order(['egg', 'egg', 'egg']);
    expect(rules.orderReward(ctx, pair, reward)).toBe(reward);
    expect(rules.orderReward(ctx, regular, reward)).toBe(reward);
  });
});

describe('through dispatch', () => {
  /** A game past the tutorial with the season running and no regular orders due. */
  function game(
    cells: Parameters<typeof stateWith>[0],
    change: Partial<GameState> = {},
  ): GameState {
    return stateWith(cells, {
      tutorialStep: 'done',
      nextOrderAt: null,
      season: season(),
      ...change,
    });
  }

  it('pays a Feast order 50% more coins and its Season Points', () => {
    const feast: Order = {
      ...order(['thanksgiving-pie', 'thanksgiving-pecan', 'thanksgiving-tart']),
      seasonPoints: 15,
    };
    const before = game(
      {
        0: 'thanksgiving-pie',
        1: 'thanksgiving-pecan',
        2: 'thanksgiving-tart',
      },
      { orders: [feast] },
    );
    const r = ok(
      dispatch(data, before, { type: 'deliverOrder', orderId: 50, now: NOW }),
    );
    expect(r.state.coins - before.coins).toBe(60);
    expect(r.state.season?.points).toBe(15);
  });

  it('spawns pecans from a Flour Mill while the season runs, and never without it', () => {
    const tapAll = (state: GameState): string[] => {
      const spawned: string[] = [];
      let s = state;
      for (let i = 0; i < 30; i++) {
        const r = dispatch(data, s, {
          type: 'tapGenerator',
          cell: 0,
          now: NOW + i,
        });
        if (!r.ok) break;
        for (const e of r.events) {
          if (e.type === 'spawned') spawned.push(e.itemId);
        }
        // Clear the board around the mill so every tap has room.
        s = { ...r.state, board: game({ 0: 'flour-mill-3' }).board };
      }
      return spawned;
    };
    const running = tapAll(game({ 0: 'flour-mill-3' }, { rngState: 7 }));
    const notJoined = tapAll(
      game({ 0: 'flour-mill-3' }, { rngState: 7, season: null }),
    );
    expect(running).toContain('thanksgiving-pecan');
    expect(notJoined).not.toContain('thanksgiving-pecan');
  });
});

describe('seasonal orders (T14.11)', () => {
  /** The season running with its Pumpkin Patch at cell 10, `cells` beside it, and no orders yet. */
  function running(cells: Readonly<Record<number, CellSpec>>): GameState {
    const state = stateWith(cells, {
      tutorialStep: 'done',
      nextOrderAt: null,
      season: season(),
    });
    return {
      ...state,
      board: setCell(state.board, 10, {
        kind: 'item',
        item: {
          itemId: 'thanksgiving-patch-1',
          cobwebbed: false,
          generator: { charges: 20, cooldownEndsAt: null },
        },
      }),
    };
  }

  /** The chains asked for by the orders 60 differently seeded top-ups open, sorted. */
  function chainsAskedFor(state: GameState): ChainId[] {
    const chains = new Set<ChainId>();
    for (let seed = 1; seed <= 60; seed++) {
      const r = ok(tickSeason(data, state, createRng(seed), NOW));
      for (const id of r.state.orders.flatMap((o) => o.wants)) {
        const item = data.items.get(id);
        if (!item) throw new Error(`unknown item "${id}"`);
        chains.add(item.chainId);
      }
    }
    return [...chains].sort();
  }

  const CHAPTER_1 = { 0: 'flour-mill-1', 1: 'dairy-fridge-1' } as const;

  it('asks a Chapter 1 board only for pumpkins, cranberries and pecans', () => {
    expect(chainsAskedFor(running(CHAPTER_1))).toEqual([
      'thanksgiving-cranberry',
      'thanksgiving-pecan',
      'thanksgiving-pumpkin',
    ]);
  });

  it('asks for pies once a Hen Coop is owned', () => {
    expect(chainsAskedFor(running({ ...CHAPTER_1, 2: 'hen-coop-1' }))).toEqual([
      'thanksgiving-cranberry',
      'thanksgiving-pecan',
      'thanksgiving-pie',
      'thanksgiving-pumpkin',
    ]);
  });

  it('asks for tarts once a Sugar Tin is owned', () => {
    expect(chainsAskedFor(running({ ...CHAPTER_1, 2: 'sugar-tin-1' }))).toEqual(
      [
        'thanksgiving-cranberry',
        'thanksgiving-pecan',
        'thanksgiving-pumpkin',
        'thanksgiving-tart',
      ],
    );
  });

  it('asks for no pecans without a Flour Mill', () => {
    expect(chainsAskedFor(running({ 1: 'dairy-fridge-1' }))).toEqual([
      'thanksgiving-cranberry',
      'thanksgiving-pumpkin',
    ]);
  });
});
