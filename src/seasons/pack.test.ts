/**
 * Tests for the season pack format (T14.2).
 */

import { describe, expect, it } from 'vitest';
import { dispatch } from '../core/dispatch';
import type { SeasonRules } from '../core/seasonApi';
import { stateWith, testData } from '../core/testing';
import type {
  Chain,
  GeneratorDef,
  Item,
  Recipe,
  SeasonDef,
} from '../core/types';
import fixture from './fixtures/autumn.json';
import { parseSeasonPack, withSeasons, type ResolvedPack } from './pack';

type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> };

/** season.json as plain, editable JSON. */
type PackJson = Mutable<SeasonDef> & {
  chains: Mutable<Chain>[];
  items: Mutable<Item>[];
  generators: Mutable<GeneratorDef>[];
  recipes: Mutable<Recipe>[];
  [key: string]: unknown;
};

/** A fresh copy of the fixture, with `change` applied. */
function raw(change?: (pack: PackJson) => void): PackJson {
  const copy = structuredClone(fixture) as unknown as PackJson;
  change?.(copy);
  return copy;
}

/** The fixture with every "autumn" replaced, e.g. a second, valid pack. */
function renamed(id: string): unknown {
  return JSON.parse(
    JSON.stringify(fixture).replaceAll('autumn', id),
  ) as unknown;
}

function byId<T extends { readonly id: string }>(list: T[], id: string): T {
  const found = list.find((x) => x.id === id);
  if (found === undefined) throw new Error(`fixture has no "${id}"`);
  return found;
}

function generator(pack: PackJson, itemId: string): Mutable<GeneratorDef> {
  const found = pack.generators.find((g) => g.itemId === itemId);
  if (found === undefined) throw new Error(`fixture has no "${itemId}"`);
  return found;
}

function expectRefused(
  change: (pack: PackJson) => void,
  message: RegExp,
): void {
  expect(() => parseSeasonPack(testData, raw(change))).toThrow(message);
}

const DAY = 86_400_000;

function resolved(
  json: unknown = raw(),
  overrides: Partial<Omit<ResolvedPack, 'pack'>> = {},
): ResolvedPack {
  return {
    pack: parseSeasonPack(testData, json),
    startsAt: 10 * DAY,
    endsAt: 29 * DAY,
    rules: null,
    ...overrides,
  };
}

describe('parseSeasonPack', () => {
  it('accepts the fixture and stamps its chains and recipes with the season', () => {
    const pack = parseSeasonPack(testData, raw());
    expect(pack.def.id).toBe('autumn');
    expect(pack.def.window).toEqual({ start: '11-12', end: '11-30' });
    expect(pack.def.milestones).toHaveLength(3);
    expect(pack.def.keepsakes.map((k) => k.id)).toEqual(['autumn-wreath']);
    expect(Object.keys(pack.def)).not.toContain('chains');
    expect(pack.chains.map((c) => c.seasonId)).toEqual([
      'autumn',
      'autumn',
      'autumn',
    ]);
    expect(pack.recipes.map((r) => r.seasonId)).toEqual(['autumn']);
    expect(pack.items).toHaveLength(8);
    expect(pack.generators).toHaveLength(2);
  });

  it('does not change the JSON it was given', () => {
    const json = raw();
    const before = structuredClone(json);
    parseSeasonPack(testData, json);
    expect(json).toEqual(before);
  });

  it.each<[string, (pack: PackJson) => void]>([
    [
      'a missing field',
      (p) => {
        delete (p as Record<string, unknown>)['pointsPerItem'];
      },
    ],
    [
      'an unknown field',
      (p) => {
        p['theme'] = {};
      },
    ],
    [
      'a seasonId written in the JSON',
      (p) => {
        byId(p.chains, 'autumn-gourd').seasonId = 'autumn';
      },
    ],
    [
      'an id that is not lowercase words and dashes',
      (p) => {
        p.id = 'Harvest';
      },
    ],
    [
      'an id with a trailing dash',
      (p) => {
        p.id = 'autumn-';
      },
    ],
    [
      'a version that is not a safe path segment',
      (p) => {
        p.version = '..';
      },
    ],
    [
      'no milestones',
      (p) => {
        p.milestones = [];
      },
    ],
    [
      'a fractional point value',
      (p) => {
        p.pointsPerItem = 2.5;
      },
    ],
  ])('refuses %s', (_label, change) => {
    expectRefused(change, /season\.json: /);
  });

  it('refuses a pack built for another apiVersion', () => {
    expectRefused((p) => {
      p.apiVersion = 2;
    }, /apiVersion 2 is not the game's 1/);
  });

  it.each(['02-29', '13-01', '11-31', '00-10', '1-05', '11/26'])(
    'refuses the window day "%s"',
    (day) => {
      expectRefused((p) => {
        p.window.end = day;
      }, /window\.end .* is not a month-day/);
    },
  );

  it('accepts a window that wraps from December into January', () => {
    const json = raw((p) => {
      p.window = { start: '12-20', end: '01-06' };
    });
    expect(parseSeasonPack(testData, json).def.window.start).toBe('12-20');
  });

  it.each<[string, (pack: PackJson) => void, RegExp]>([
    [
      'chain id',
      (p) => {
        byId(p.chains, 'autumn-pie').id = 'pie';
      },
      /chain "pie" doesn't start with "autumn-"/,
    ],
    [
      'item id',
      (p) => {
        byId(p.items, 'autumn-pie-pair').id = 'pie-pair';
      },
      /item "pie-pair" doesn't start with "autumn-"/,
    ],
    [
      'item spriteKey',
      (p) => {
        byId(p.items, 'autumn-seed').spriteKey = 'seed';
      },
      /item "autumn-seed" spriteKey "seed" doesn't start/,
    ],
    [
      'recipe id',
      (p) => {
        byId(p.recipes, 'autumn-bake-pie').id = 'bake-pie';
      },
      /recipe "bake-pie" doesn't start with "autumn-"/,
    ],
    [
      'keepsake id',
      (p) => {
        byId(p.keepsakes, 'autumn-wreath').id = 'wreath';
      },
      /keepsake "wreath" doesn't start with "autumn-"/,
    ],
    [
      'keepsake spriteKey',
      (p) => {
        byId(p.keepsakes, 'autumn-wreath').spriteKey = 'wreath';
      },
      /keepsake "autumn-wreath" spriteKey "wreath" doesn't start/,
    ],
  ])('requires the season prefix on every %s', (_label, change, message) => {
    expectRefused(change, message);
  });

  it('refuses a season id that starts ids in the base game', () => {
    const json = renamed('flour');
    expect(() => parseSeasonPack(testData, json)).toThrow(
      /the base game's "flour-[a-z0-9-]+" starts with "flour-"/,
    );
  });

  it('refuses duplicate ids within the pack', () => {
    expectRefused((p) => {
      p.items.push({ ...byId(p.items, 'autumn-seed'), tier: 5 });
    }, /duplicate id "autumn-seed" in items/);
  });

  describe('chains and items', () => {
    it('refuses an event chain', () => {
      expectRefused((p) => {
        byId(p.chains, 'autumn-gourd').kind = 'event';
      }, /chain "autumn-gourd" has kind "event"/);
    });

    it('refuses an item in a base chain', () => {
      expectRefused((p) => {
        byId(p.items, 'autumn-prize-gourd').chainId = 'flour';
      }, /item "autumn-prize-gourd" has chainId "flour", which isn't one of the pack's chains/);
    });

    it("refuses a gap in a chain's tiers", () => {
      expectRefused((p) => {
        byId(p.items, 'autumn-prize-gourd').tier = 5;
      }, /chain "autumn-gourd": tiers must run 1, 2, 3/);
    });

    it('refuses a chain with no items', () => {
      expectRefused((p) => {
        p.chains.push({ ...byId(p.chains, 'autumn-pie'), id: 'autumn-jam' });
      }, /chain "autumn-jam" has no items/);
    });

    it('refuses a collectReward', () => {
      expectRefused((p) => {
        byId(p.items, 'autumn-seed').collectReward = { energy: 1, coins: 0 };
      }, /item "autumn-seed" has a collectReward/);
    });
  });

  describe('generators', () => {
    it('refuses a generator item with no GeneratorDef', () => {
      expectRefused((p) => {
        p.generators = p.generators.filter(
          (g) => g.itemId !== 'autumn-patch-2',
        );
      }, /generator item "autumn-patch-2" has no GeneratorDef/);
    });

    it('refuses a GeneratorDef for an item outside a generator chain', () => {
      expectRefused((p) => {
        p.generators.push({
          ...generator(p, 'autumn-patch-1'),
          itemId: 'autumn-seed',
        });
      }, /generator "autumn-seed" is not in a generator chain/);
    });

    it('refuses a GeneratorDef for a base generator', () => {
      expectRefused((p) => {
        p.generators.push({
          ...generator(p, 'autumn-patch-1'),
          itemId: 'flour-mill-1',
        });
      }, /generator "flour-mill-1" isn't one of the pack's items/);
    });

    it('refuses spawn weights that do not sum to 100', () => {
      expectRefused((p) => {
        const first = generator(p, 'autumn-patch-1').spawnTable[0];
        if (first !== undefined) first.weight = 80;
      }, /generator "autumn-patch-1" spawn table: weights sum to 90/);
    });

    it('refuses an unknown spawn', () => {
      expectRefused((p) => {
        const first = generator(p, 'autumn-patch-1').spawnTable[0];
        if (first !== undefined) first.itemId = 'autumn-ghost';
      }, /spawn table references unknown item "autumn-ghost"/);
    });

    it('accepts base items in a spawn table', () => {
      const json = raw((p) => {
        generator(p, 'autumn-patch-1').spawnTable = [
          { itemId: 'autumn-seed', weight: 80 },
          { itemId: 'autumn-gourd', weight: 10 },
          { itemId: 'wheat-stalk', weight: 10 },
        ];
      });
      expect(() => parseSeasonPack(testData, json)).not.toThrow();
    });

    it('refuses a base generator as the season generator', () => {
      expectRefused((p) => {
        p.generatorItemId = 'flour-mill-1';
      }, /generatorItemId "flour-mill-1" isn't one of the pack's generators/);
    });
  });

  describe('recipes', () => {
    it('refuses an unknown input', () => {
      expectRefused((p) => {
        byId(p.recipes, 'autumn-bake-pie').inputs.push('autumn-ghost');
      }, /recipe "autumn-bake-pie" input references unknown item "autumn-ghost"/);
    });

    it.each(['cookie', 'autumn-pie-pair', 'autumn-seed'])(
      'refuses "%s" as the output',
      (output) => {
        expectRefused((p) => {
          byId(p.recipes, 'autumn-bake-pie').output = output;
        }, /is not the tier 1 item of one of the pack's baked chains/);
      },
    );
  });

  describe('orders', () => {
    it.each<[string, Partial<PackJson['orders']>]>([
      ['no open orders', { maxOpen: 0 }],
      ['minItems above maxItems', { minItems: 3 }],
      ['minTier above maxTier', { minTier: 4 }],
      ['minTier 0', { minTier: 0 }],
    ])('refuses %s', (_label, orders) => {
      expectRefused((p) => {
        p.orders = { ...p.orders, ...orders };
      }, /orders rules are out of range/);
    });

    it('refuses a maxTier above every product chain', () => {
      expectRefused((p) => {
        p.orders.maxTier = 5;
      }, /orders\.maxTier 5 is above the top tier/);
    });
  });

  describe('milestones and keepsakes', () => {
    it('refuses milestones out of order', () => {
      expectRefused((p) => {
        const second = p.milestones[1];
        if (second !== undefined) second.points = 20;
      }, /milestone points must be ascending/);
    });

    it('refuses an unknown keepsake', () => {
      expectRefused((p) => {
        const first = p.milestones[0];
        if (first !== undefined) first.reward.keepsakeId = 'autumn-ghost';
      }, /milestone 0 pays unknown keepsake "autumn-ghost"/);
    });

    it('refuses a keepsake paid twice', () => {
      expectRefused((p) => {
        const first = p.milestones[0];
        if (first !== undefined) first.reward.keepsakeId = 'autumn-wreath';
      }, /keepsake "autumn-wreath" is paid by more than one milestone/);
    });

    it('refuses a keepsake no milestone pays', () => {
      expectRefused((p) => {
        p.keepsakes.push({
          id: 'autumn-trophy',
          name: 'Trophy',
          spriteKey: 'autumn-trophy',
        });
      }, /keepsake "autumn-trophy" isn't paid by any milestone/);
    });
  });

  it('lists every problem in one error, each naming the season', () => {
    let message = '';
    try {
      parseSeasonPack(
        testData,
        raw((p) => {
          p.apiVersion = 3;
          p.window.start = '02-30';
        }),
      );
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message.split('\n')).toEqual([
      `season "autumn": apiVersion 3 is not the game's 1`,
      `season "autumn": window.start "02-30" is not a month-day like "11-26" (Feb 29 isn't allowed)`,
    ]);
  });
});

describe('withSeasons', () => {
  it('returns the base data when there are no packs', () => {
    expect(withSeasons(testData, [])).toBe(testData);
  });

  it('adds the pack content and its season, leaving the base untouched', () => {
    const rules: SeasonRules = { apiVersion: 1 };
    const pack = resolved(raw(), { rules });
    const data = withSeasons(testData, [pack]);

    expect(data.items.size).toBe(testData.items.size + 8);
    expect(data.items.get('flour-bag')).toBe(testData.items.get('flour-bag'));
    expect(data.items.get('autumn-seed')?.chainId).toBe('autumn-gourd');
    expect(data.chains.get('autumn-gourd')?.seasonId).toBe('autumn');
    expect(data.generators.get('autumn-patch-1')?.charges).toBe(20);
    expect(data.recipes.get('autumn-bake-pie')?.seasonId).toBe('autumn');
    expect(data.seasons.get('autumn')).toEqual({
      def: pack.pack.def,
      startsAt: 10 * DAY,
      endsAt: 29 * DAY,
      rules,
    });
    expect(data.seasons.get('autumn')?.rules).toBe(rules);
    expect(data.economy).toBe(testData.economy);

    expect(testData.items.has('autumn-seed')).toBe(false);
    expect(testData.chains.has('autumn-gourd')).toBe(false);
    expect(testData.recipes.has('autumn-bake-pie')).toBe(false);
    expect(testData.seasons.size).toBe(0);
  });

  it("lists each pack chain's items in tier order", () => {
    const json = raw((p) => {
      p.items.reverse();
    });
    const data = withSeasons(testData, [resolved(json)]);
    expect(data.chainItems.get('autumn-gourd')?.map((i) => i.id)).toEqual([
      'autumn-seed',
      'autumn-gourd',
      'autumn-big-gourd',
      'autumn-prize-gourd',
    ]);
  });

  it('gives core seasonal items that merge like any other', () => {
    const data = withSeasons(testData, [resolved()]);
    const start = stateWith({ 0: 'autumn-seed', 1: 'autumn-seed' });
    const result = dispatch(data, start, {
      type: 'drop',
      from: 0,
      to: 1,
      now: 1_000,
    });
    if (!result.ok) throw new Error(result.reason);
    expect(result.state.board.cells[1]).toMatchObject({
      kind: 'item',
      item: { itemId: 'autumn-gourd' },
    });
  });

  it('merges two packs', () => {
    const data = withSeasons(testData, [
      resolved(),
      resolved(renamed('orchard')),
    ]);
    expect([...data.seasons.keys()]).toEqual(['autumn', 'orchard']);
    expect(data.items.size).toBe(testData.items.size + 16);
    expect(data.chains.get('orchard-gourd')?.seasonId).toBe('orchard');
  });

  it('refuses the same season twice', () => {
    expect(() => withSeasons(testData, [resolved(), resolved()])).toThrow(
      /season "autumn" is loaded twice/,
    );
  });

  it('refuses a season already in the base data', () => {
    const once = withSeasons(testData, [resolved()]);
    expect(() => withSeasons(once, [resolved()])).toThrow(
      /season "autumn" is loaded twice/,
    );
  });

  it('refuses two seasons where one id starts the other', () => {
    expect(() =>
      withSeasons(testData, [resolved(), resolved(renamed('autumn-moon'))]),
    ).toThrow(/seasons "autumn-moon" and "autumn" overlap/);
  });

  it('refuses a window that ends before it starts', () => {
    expect(() =>
      withSeasons(testData, [resolved(raw(), { endsAt: 10 * DAY })]),
    ).toThrow(/season "autumn" ends before it starts/);
  });

  it('refuses rules built for another apiVersion', () => {
    const rules = { apiVersion: 2 } as unknown as SeasonRules;
    expect(() => withSeasons(testData, [resolved(raw(), { rules })])).toThrow(
      /rules are for apiVersion 2, its data for 1/,
    );
  });
});
