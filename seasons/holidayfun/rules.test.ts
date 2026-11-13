/**
 * Tests for Holiday fun!'s rules (T14.12): alone, and through the real
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

const START = Date.UTC(2026, 11, 1);
const END = Date.UTC(2026, 11, 26);
const NOW = START + 86_400_000;

const data = withSeasons(testData, [
  {
    pack: parseSeasonPack(testData, json),
    startsAt: START,
    endsAt: END,
    rules,
  },
]);
const loaded = data.seasons.get('holidayfun');
if (!loaded) throw new Error('holidayfun not loaded');
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
    seasonId: 'holidayfun',
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

describe('orderReward', () => {
  const reward = { coins: 41, stars: 0, xp: 0 };

  it('pays a seasonal order of three items, a Gift order, half again, rounded', () => {
    const gift = order(
      [
        'holidayfun-gingerbread-man',
        'holidayfun-candy-cane',
        'holidayfun-clementine',
      ],
      15,
    );
    expect(rules.orderReward(ctx, gift, reward)).toEqual({
      coins: 62,
      stars: 0,
      xp: 0,
    });
  });

  it('leaves smaller seasonal orders and regular orders alone', () => {
    const pair = order(
      ['holidayfun-gingerbread-man', 'holidayfun-peppermint'],
      10,
    );
    const regular = order(['egg', 'egg', 'egg']);
    expect(rules.orderReward(ctx, pair, reward)).toBe(reward);
    expect(rules.orderReward(ctx, regular, reward)).toBe(reward);
  });

  it('adds no spawns to any generator', () => {
    expect('extraSpawns' in rules).toBe(false);
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

  it('pays a Gift order 50% more coins and its Season Points', () => {
    const gift = order(
      [
        'holidayfun-gingerbread-man',
        'holidayfun-candy-cane',
        'holidayfun-clementine-cake',
      ],
      15,
    );
    const before = game(
      {
        0: 'holidayfun-gingerbread-man',
        1: 'holidayfun-candy-cane',
        2: 'holidayfun-clementine-cake',
      },
      { orders: [gift] },
    );
    const r = ok(
      dispatch(data, before, { type: 'deliverOrder', orderId: 50, now: NOW }),
    );
    expect(r.state.coins - before.coins).toBe(60);
    expect(r.state.season?.points).toBe(15);
  });

  it('pays a two-item seasonal order its plain coins', () => {
    const pair = order(['holidayfun-candy-cane', 'holidayfun-clementine'], 10);
    const before = game(
      { 0: 'holidayfun-candy-cane', 1: 'holidayfun-clementine' },
      { orders: [pair] },
    );
    const r = ok(
      dispatch(data, before, { type: 'deliverOrder', orderId: 50, now: NOW }),
    );
    expect(r.state.coins - before.coins).toBe(40);
    expect(r.state.season?.points).toBe(10);
  });
});

describe('seasonal orders (T14.11)', () => {
  /** The season running with its Holiday Sleigh at cell 10, `cells` beside it, and no orders yet. */
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
          itemId: 'holidayfun-sleigh-1',
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

  it('asks a Chapter 1 board for both treats and both ingredients', () => {
    expect(
      chainsAskedFor(running({ 0: 'flour-mill-1', 1: 'dairy-fridge-1' })),
    ).toEqual([
      'holidayfun-cake',
      'holidayfun-clementine',
      'holidayfun-gingerbread',
      'holidayfun-peppermint',
    ]);
  });

  it('asks for no treats without a Dairy Fridge', () => {
    expect(chainsAskedFor(running({ 0: 'flour-mill-1' }))).toEqual([
      'holidayfun-clementine',
      'holidayfun-peppermint',
    ]);
  });
});
