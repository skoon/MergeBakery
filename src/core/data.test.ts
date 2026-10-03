/**
 * Tests for the data loader and validator (T1.7).
 */

import { describe, it, expect } from 'vitest';
import { parseGameData, loadGameData, type RawGameData } from './data';

/** A small, internally-consistent fixture covering every check in the brief. */
function makeFixture(): RawGameData {
  return {
    items: {
      chains: [
        {
          id: 'flour',
          name: 'Flour',
          kind: 'ingredient',
          color: '#e8c07d',
          completionGems: 8,
        },
        {
          id: 'cookie',
          name: 'Cookies',
          kind: 'baked',
          color: '#b07a45',
          completionGems: 4,
        },
        {
          id: 'flour-mill',
          name: 'Flour Mill',
          kind: 'generator',
          color: '#9c5b2e',
          completionGems: 0,
        },
        {
          id: 'energy-jar',
          name: 'Energy Jar',
          kind: 'bonus',
          color: '#7fc8f8',
          completionGems: 0,
        },
      ],
      items: [
        {
          id: 'wheat-stalk',
          name: 'Wheat stalk',
          chainId: 'flour',
          tier: 1,
          spriteKey: 'wheat-stalk',
          sellValue: 1,
          note: null,
          collectReward: null,
        },
        {
          id: 'flour-bag',
          name: 'Flour bag',
          chainId: 'flour',
          tier: 2,
          spriteKey: 'flour-bag',
          sellValue: 2,
          note: null,
          collectReward: null,
        },
        {
          id: 'cookie',
          name: 'Cookie',
          chainId: 'cookie',
          tier: 1,
          spriteKey: 'cookie',
          sellValue: 10,
          note: null,
          collectReward: null,
        },
        {
          id: 'flour-mill-1',
          name: 'Flour Mill',
          chainId: 'flour-mill',
          tier: 1,
          spriteKey: 'flour-mill-1',
          sellValue: 0,
          note: null,
          collectReward: null,
        },
        {
          id: 'energy-jar',
          name: 'Energy jar',
          chainId: 'energy-jar',
          tier: 1,
          spriteKey: 'energy-jar',
          sellValue: 0,
          note: null,
          collectReward: { energy: 20, coins: 0 },
        },
      ],
    },
    generators: {
      generators: [
        {
          itemId: 'flour-mill-1',
          spawnTable: [
            { itemId: 'wheat-stalk', weight: 70 },
            { itemId: 'flour-bag', weight: 30 },
          ],
          charges: 10,
          cooldownSec: 60,
        },
      ],
      rareDrops: {
        chancePercent: 5,
        table: [{ itemId: 'energy-jar', weight: 100 }],
      },
    },
    recipes: {
      recipes: [
        {
          id: 'bake-cookie',
          name: 'Cookie',
          inputs: ['flour-bag'],
          output: 'cookie',
          bakeSec: 60,
        },
      ],
    },
    ovens: {
      ovens: [
        {
          id: 'toaster-oven',
          name: 'Toaster Oven',
          tier: 1,
          slots: 1,
          bakeTimeMultiplier: 1,
          spriteKey: 'toaster-oven',
        },
      ],
    },
    customers: {
      customers: [
        {
          id: 'grandma',
          name: 'Grandma',
          kind: 'regular',
          portraitKey: 'grandma',
          favoriteItems: ['cookie'],
        },
      ],
    },
    chapters: [
      {
        id: 'chapter1',
        name: "Grandma's Corner Shop",
        sceneKey: 'corner-shop',
        introSceneId: null,
        tasks: [
          {
            id: 'task-1',
            name: 'Clean the counter',
            starCost: 1,
            spot: { x: 0.5, y: 0.5 },
            prerequisites: [],
            unlocks: [
              { kind: 'oven', ovenId: 'toaster-oven' },
              { kind: 'customer', customerId: 'grandma' },
              { kind: 'generator', itemId: 'flour-mill-1' },
            ],
            featuredItems: ['cookie'],
            beforeSpriteKey: 'counter-before',
            afterSpriteKey: 'counter-after',
            sceneId: null,
          },
        ],
      },
    ],
    economy: {
      energy: { cap: 100, regenSec: 60, perTap: 1 },
      xpPerMergeTier: 1,
      levels: [
        { level: 1, xpTotal: 0, gems: 0 },
        { level: 2, xpTotal: 100, gems: 5 },
      ],
      pantry: { startSlots: 4, slotCosts: [50] },
      rushGemsPerMinute: 1,
      sellUndoSec: 10,
      goldenWhiskMaxTier: 5,
      orders: {
        maxOpen: 2,
        refillDelaySec: 5,
        regularChancePercent: 50,
        featuredWeight: 2,
        walkIn: {
          minItems: 1,
          maxItems: 1,
          maxTier: 2,
          starsByItemCount: [1],
          coinMultiplier: 1,
          xpPerTier: 1,
        },
        regular: {
          minItems: 1,
          maxItems: 2,
          maxTier: 2,
          starsByItemCount: [1, 2],
          coinMultiplier: 2,
          xpPerTier: 2,
        },
      },
    },
    newGame: {
      cols: 3,
      rows: 3,
      locks: [{ cell: 8, lock: 'crate' }],
      items: [{ cell: 0, itemId: 'wheat-stalk', cobwebbed: false }],
      ovens: ['toaster-oven'],
      coins: 0,
      gems: 0,
      chapterId: 'chapter1',
      unlockedCustomers: ['grandma'],
    },
    shop: { items: [] },
    events: { events: [] },
  };
}

// Loosely-typed helpers so mutations can reach into `unknown`-typed raw
// sections without fighting the compiler; the point of these tests is
// runtime shape, and every JSON file section is an object or an array of
// objects. Using generic casts (rather than `any`) keeps eslint's
// no-unsafe-* rules happy. Non-null assertions on indexing are safe: every
// index used below is known to exist in the fixture above.
function obj(value: unknown): Record<string, unknown> {
  return value as Record<string, unknown>;
}
function list<T = Record<string, unknown>>(value: unknown): T[] {
  return value as T[];
}

/** Deep-clones the base fixture, applies `mutate`, and returns it. */
function broken(mutate: (raw: RawGameData) => void): RawGameData {
  const raw = structuredClone(makeFixture());
  mutate(raw);
  return raw;
}

describe('parseGameData: valid fixture', () => {
  it('parses a small valid fixture and builds GameData lookups', () => {
    const data = parseGameData(makeFixture());

    expect(data.items.get('wheat-stalk')?.tier).toBe(1);
    expect(data.chains.get('flour')?.kind).toBe('ingredient');
    expect(data.chainItems.get('flour')?.map((i) => i.id)).toEqual([
      'wheat-stalk',
      'flour-bag',
    ]);
    expect(data.generators.get('flour-mill-1')?.charges).toBe(10);
    expect(data.rareDrops.chancePercent).toBe(5);
    expect(data.recipes.get('bake-cookie')?.output).toBe('cookie');
    expect(data.ovens.get('toaster-oven')?.slots).toBe(1);
    expect(data.customers.get('grandma')?.kind).toBe('regular');
    expect(data.chapters.get('chapter1')?.name).toBe("Grandma's Corner Shop");
    expect(data.economy.levels).toHaveLength(2);
    expect(data.newGame.chapterId).toBe('chapter1');
  });
});

describe('parseGameData: shape validation', () => {
  it('throws on an unknown key (strict objects)', () => {
    const raw = broken((r) => {
      list(obj(r.items).items)[0]!.extraField = 'nope';
    });
    expect(() => parseGameData(raw)).toThrow(/items\.json/);
  });

  it('throws on a wrong type', () => {
    const raw = broken((r) => {
      list(obj(r.items).items)[0]!.tier = 'one';
    });
    expect(() => parseGameData(raw)).toThrow(/items\.json/);
  });
});

describe('parseGameData: uniqueness', () => {
  it('rejects duplicate item ids', () => {
    const raw = broken((r) => {
      const items = list(obj(r.items).items);
      items.push({ ...items[0] });
    });
    expect(() => parseGameData(raw)).toThrow(/duplicate id "wheat-stalk"/);
  });

  it('rejects duplicate task ids within a chapter', () => {
    const raw = broken((r) => {
      const chapter = list(r.chapters)[0]!;
      const tasks = list(chapter.tasks);
      tasks.push({ ...tasks[0] });
    });
    expect(() => parseGameData(raw)).toThrow(/duplicate id "task-1"/);
  });
});

describe('parseGameData: chainId and chain tiers', () => {
  it('rejects an item with an unknown chainId', () => {
    const raw = broken((r) => {
      list(obj(r.items).items)[0]!.chainId = 'no-such-chain';
    });
    expect(() => parseGameData(raw)).toThrow(/unknown chainId "no-such-chain"/);
  });

  it('rejects a chain with a tier gap', () => {
    const raw = broken((r) => {
      list(obj(r.items).items)[1]!.tier = 3; // flour-bag becomes tier 3, leaving a gap at 2
    });
    expect(() => parseGameData(raw)).toThrow(
      /chain "flour".*no gaps or repeats/,
    );
  });
});

describe('parseGameData: referenced item ids exist', () => {
  it('rejects an unknown item in a spawn table', () => {
    const raw = broken((r) => {
      const gen0 = list(obj(r.generators).generators)[0]!;
      list(gen0.spawnTable)[0]!.itemId = 'no-such-item';
    });
    expect(() => parseGameData(raw)).toThrow(
      /spawn table references unknown item "no-such-item"/,
    );
  });

  it('rejects an unknown item in a recipe input', () => {
    const raw = broken((r) => {
      const recipe0 = list(obj(r.recipes).recipes)[0]!;
      list<string>(recipe0.inputs)[0] = 'no-such-item';
    });
    expect(() => parseGameData(raw)).toThrow(
      /recipe "bake-cookie" input references unknown item "no-such-item"/,
    );
  });

  it('rejects an unknown item referenced by newGame', () => {
    const raw = broken((r) => {
      list(obj(r.newGame).items)[0]!.itemId = 'no-such-item';
    });
    expect(() => parseGameData(raw)).toThrow(
      /newGame items references unknown item "no-such-item"/,
    );
  });
});

describe('parseGameData: generator chain <-> GeneratorDef', () => {
  it('rejects a generator-chain item with no GeneratorDef', () => {
    const raw = broken((r) => {
      list(obj(r.items).items).push({
        id: 'flour-mill-2',
        name: 'Flour Mill II',
        chainId: 'flour-mill',
        tier: 2,
        spriteKey: 'flour-mill-2',
        sellValue: 0,
        note: null,
        collectReward: null,
      });
    });
    expect(() => parseGameData(raw)).toThrow(
      /generator item "flour-mill-2" has no GeneratorDef/,
    );
  });

  it('rejects a GeneratorDef that names a non-generator item', () => {
    const raw = broken((r) => {
      list(obj(r.generators).generators)[0]!.itemId = 'cookie';
    });
    expect(() => parseGameData(raw)).toThrow(
      /GeneratorDef "cookie" names an item that is not in a generator chain/,
    );
  });
});

describe('parseGameData: weighted tables', () => {
  it('rejects a spawn table that does not sum to 100', () => {
    const raw = broken((r) => {
      const gen0 = list(obj(r.generators).generators)[0]!;
      list(gen0.spawnTable)[0]!.weight = 50;
    });
    expect(() => parseGameData(raw)).toThrow(/weights sum to 80, expected 100/);
  });

  it('rejects a non-positive weight', () => {
    const raw = broken((r) => {
      const gen0 = list(obj(r.generators).generators)[0]!;
      list(gen0.spawnTable)[0]!.weight = 0;
    });
    expect(() => parseGameData(raw)).toThrow(
      /weight 0 for "wheat-stalk" is not positive/,
    );
  });
});

describe('parseGameData: recipe output', () => {
  it('rejects a recipe output that is not the tier 1 item of a baked chain', () => {
    const raw = broken((r) => {
      list(obj(r.recipes).recipes)[0]!.output = 'flour-bag';
    });
    expect(() => parseGameData(raw)).toThrow(
      /output "flour-bag" is not the tier 1 item of a baked chain/,
    );
  });
});

describe('parseGameData: collectReward and bonus chains', () => {
  it('rejects a bonus item with no collectReward', () => {
    const raw = broken((r) => {
      list(obj(r.items).items)[4]!.collectReward = null;
    });
    expect(() => parseGameData(raw)).toThrow(
      /item "energy-jar" is in a bonus chain but has no collectReward/,
    );
  });

  it('rejects a non-bonus item with a collectReward', () => {
    const raw = broken((r) => {
      list(obj(r.items).items)[0]!.collectReward = { energy: 1, coins: 1 };
    });
    expect(() => parseGameData(raw)).toThrow(
      /item "wheat-stalk" has a collectReward but is not in a bonus chain/,
    );
  });
});

describe('parseGameData: ovens', () => {
  it('rejects an oven tier gap', () => {
    const raw = broken((r) => {
      list(obj(r.ovens).ovens).push({
        id: 'deck-oven',
        name: 'Deck Oven',
        tier: 3,
        slots: 3,
        bakeTimeMultiplier: 0.64,
        spriteKey: 'deck-oven',
      });
    });
    expect(() => parseGameData(raw)).toThrow(/ovens.*no gaps or repeats/);
  });

  it('rejects an oven with fewer than 1 slot', () => {
    const raw = broken((r) => {
      list(obj(r.ovens).ovens)[0]!.slots = 0;
    });
    expect(() => parseGameData(raw)).toThrow(
      /oven "toaster-oven" has slots 0, must be at least 1/,
    );
  });
});

describe('parseGameData: economy.levels', () => {
  it('rejects levels that do not start at level 1 with xpTotal 0', () => {
    const raw = broken((r) => {
      list(obj(r.economy).levels)[0]!.xpTotal = 5;
    });
    expect(() => parseGameData(raw)).toThrow(
      /economy\.levels must start at level 1 with xpTotal 0/,
    );
  });

  it('rejects levels that do not count up by 1', () => {
    const raw = broken((r) => {
      list(obj(r.economy).levels)[1]!.level = 3;
    });
    expect(() => parseGameData(raw)).toThrow(
      /level 3 does not follow level 1 by 1/,
    );
  });

  it('rejects xpTotal that does not strictly increase', () => {
    const raw = broken((r) => {
      list(obj(r.economy).levels)[1]!.xpTotal = 0;
    });
    expect(() => parseGameData(raw)).toThrow(
      /xpTotal at level 2 does not strictly increase/,
    );
  });

  it('rejects a starsByItemCount whose length does not equal maxItems', () => {
    const raw = broken((r) => {
      const orders = obj(obj(r.economy).orders);
      obj(orders.walkIn).starsByItemCount = [1, 1];
    });
    expect(() => parseGameData(raw)).toThrow(
      /walkIn\.starsByItemCount has length 2, expected maxItems 1/,
    );
  });

  it('rejects minItems greater than maxItems', () => {
    const raw = broken((r) => {
      const orders = obj(obj(r.economy).orders);
      obj(orders.regular).minItems = 3;
    });
    expect(() => parseGameData(raw)).toThrow(
      /regular: minItems 3 is greater than maxItems 2/,
    );
  });
});

describe('parseGameData: newGame', () => {
  it('rejects a cell outside the board', () => {
    const raw = broken((r) => {
      list(obj(r.newGame).items)[0]!.cell = 100;
    });
    expect(() => parseGameData(raw)).toThrow(
      /cell 100 is outside the 3x3 board/,
    );
  });

  it('rejects a cell used twice across locks and items', () => {
    const raw = broken((r) => {
      list(obj(r.newGame).items)[0]!.cell = 8; // same as the lock's cell
    });
    expect(() => parseGameData(raw)).toThrow(/cell 8 is used more than once/);
  });

  it('rejects an unknown chapterId', () => {
    const raw = broken((r) => {
      obj(r.newGame).chapterId = 'no-such-chapter';
    });
    expect(() => parseGameData(raw)).toThrow(
      /newGame\.chapterId "no-such-chapter" names an unknown chapter/,
    );
  });

  it('rejects an unknown oven id', () => {
    const raw = broken((r) => {
      obj(r.newGame).ovens = ['no-such-oven'];
    });
    expect(() => parseGameData(raw)).toThrow(
      /newGame\.ovens references unknown oven "no-such-oven"/,
    );
  });

  it('rejects an unlockedCustomers id that is not a regular customer', () => {
    const raw = broken((r) => {
      obj(r.newGame).unlockedCustomers = ['no-such-customer'];
    });
    expect(() => parseGameData(raw)).toThrow(
      /"no-such-customer", which is not a regular customer/,
    );
  });
});

describe('parseGameData: task prerequisites and unlocks', () => {
  it('rejects a prerequisite that is not a task in the same chapter', () => {
    const raw = broken((r) => {
      const chapter = list(r.chapters)[0]!;
      const task0 = list(chapter.tasks)[0]!;
      task0.prerequisites = ['no-such-task'];
    });
    expect(() => parseGameData(raw)).toThrow(
      /prerequisite "no-such-task" is not a task in chapter "chapter1"/,
    );
  });

  it('rejects an unlock that references an unknown oven', () => {
    const raw = broken((r) => {
      const chapter = list(r.chapters)[0]!;
      const task0 = list(chapter.tasks)[0]!;
      list(task0.unlocks)[0]!.ovenId = 'no-such-oven';
    });
    expect(() => parseGameData(raw)).toThrow(
      /unlock references unknown oven "no-such-oven"/,
    );
  });

  it('rejects an unlock that references an unknown customer', () => {
    const raw = broken((r) => {
      const chapter = list(r.chapters)[0]!;
      const task0 = list(chapter.tasks)[0]!;
      list(task0.unlocks)[1]!.customerId = 'no-such-customer';
    });
    expect(() => parseGameData(raw)).toThrow(
      /unlock references unknown customer "no-such-customer"/,
    );
  });
});

describe('parseGameData: reports every problem, not just the first', () => {
  it('collects multiple cross-reference problems in one thrown error', () => {
    const raw = broken((r) => {
      const gen0 = list(obj(r.generators).generators)[0]!;
      list(gen0.spawnTable)[0]!.weight = 0;
      list(obj(r.ovens).ovens)[0]!.slots = 0;
    });
    try {
      parseGameData(raw);
      expect.unreachable('parseGameData should have thrown');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).toMatch(/is not positive/);
      expect(message).toMatch(/must be at least 1/);
    }
  });
});

describe('loadGameData', () => {
  it('loads and validates the real data files in src/data', () => {
    // Other sessions are writing these files concurrently; if this fails,
    // the thrown error lists every current problem with the real data.
    expect(() => loadGameData()).not.toThrow();
  });
});

describe('parseGameData: chapters and the Shop (T7.1)', () => {
  /** The fixture's only task, under a new id, in a second chapter. */
  function secondChapter(raw: RawGameData, taskId: string): void {
    const first = list(raw.chapters)[0]!;
    const task = { ...list(first.tasks)[0]!, id: taskId };
    list(raw.chapters).push({ ...first, id: 'chapter2', tasks: [task] });
  }

  it('accepts a second chapter with its own task ids', () => {
    const raw = broken((r) => secondChapter(r, 'cafe-task-1'));

    expect([...parseGameData(raw).chapters.keys()]).toEqual([
      'chapter1',
      'chapter2',
    ]);
  });

  it('rejects a task id reused in another chapter', () => {
    const raw = broken((r) => secondChapter(r, 'task-1'));

    expect(() => parseGameData(raw)).toThrow(/tasks across all chapters/);
  });

  it('loads shop rows in data order', () => {
    const raw = broken((r) => {
      obj(r.shop).items = [
        {
          id: 'mill',
          name: 'Mill',
          kind: 'generator',
          itemId: 'flour-mill-1',
          price: 100,
          fromChapter: 'chapter1',
        },
        {
          id: 'snack',
          name: 'Snack',
          kind: 'energy',
          energy: 25,
          price: 50,
          fromChapter: 'chapter1',
        },
      ];
    });

    expect([...parseGameData(raw).shop.keys()]).toEqual(['mill', 'snack']);
  });

  it('lists every shop problem in one error', () => {
    const raw = broken((r) => {
      obj(r.shop).items = [
        {
          id: 'no-item',
          name: 'x',
          kind: 'generator',
          price: 10,
          fromChapter: 'chapter1',
        },
        {
          id: 'not-gen',
          name: 'x',
          kind: 'generator',
          itemId: 'wheat-stalk',
          price: 10,
          fromChapter: 'chapter1',
        },
        {
          id: 'no-energy',
          name: 'x',
          kind: 'energy',
          energy: 0,
          price: 10,
          fromChapter: 'chapter1',
        },
        {
          id: 'free',
          name: 'x',
          kind: 'energy',
          energy: 5,
          price: 0,
          fromChapter: 'chapter1',
        },
        {
          id: 'later',
          name: 'x',
          kind: 'energy',
          energy: 5,
          price: 10,
          fromChapter: 'chapter9',
        },
      ];
    });

    let message = '';
    try {
      parseGameData(raw);
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toMatch(/"no-item": a generator row needs an itemId/);
    expect(message).toMatch(/"not-gen": "wheat-stalk" is not a generator/);
    expect(message).toMatch(
      /"no-energy": an energy row needs a positive energy/,
    );
    expect(message).toMatch(/"free": price 0 is not positive/);
    expect(message).toMatch(/"later": fromChapter "chapter9"/);
  });

  it('rejects an event with an unknown generator and a bad curve', () => {
    const raw = makeFixture();
    obj(raw).events = {
      events: [
        {
          id: 'bakeOff',
          name: 'Bake-Off',
          minChapter: 'chapter1',
          durationSec: 100,
          gapAfterSec: 10,
          generatorItemId: 'nope',
          pointsPerOrder: 5,
          milestones: [
            { points: 20, reward: { coins: 1, gems: 0 } },
            { points: 10, reward: { coins: 1, gems: 0 } },
          ],
          megabunCurve: [
            { atSec: 0, score: 0 },
            { atSec: 200, score: 50 },
          ],
          trophyGems: 1,
        },
      ],
    };
    expect(() => parseGameData(raw)).toThrow(
      /generatorItemId[\s\S]*milestone points[\s\S]*runs past durationSec/,
    );
  });

  it('loads the real shop.json', () => {
    expect(loadGameData().shop.size).toBeGreaterThan(0);
  });
});
