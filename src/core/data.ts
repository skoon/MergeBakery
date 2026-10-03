/**
 * Data loader and validator (T1.7).
 *
 * `parseGameData` is pure: it validates raw JSON-shaped values with zod, then
 * checks cross-references (ids, weights, sequences, ...) and builds the
 * `GameData` lookup maps. It throws one `Error` listing every problem found.
 *
 * `loadGameData` is the only impure piece: it reads the JSON files in
 * src/data and hands them to `parseGameData`.
 */

import { z } from 'zod';
import type {
  Chain,
  ChainId,
  ChainKind,
  Chapter,
  Customer,
  CustomerKind,
  CustomersFile,
  EventDef,
  EventReward,
  EventsFile,
  Economy,
  GameData,
  GeneratorDef,
  GeneratorsFile,
  Item,
  ItemsFile,
  LevelDef,
  LockKind,
  NewGameConfig,
  OrderKindRules,
  OrderRules,
  OvenDef,
  OvensFile,
  RareDropTable,
  Recipe,
  RecipesFile,
  RenovationTask,
  ShopFile,
  ShopItem,
  Unlock,
  WeightedEntry,
} from './types';

// ─── Raw input contract ─────────────────────────────────────────────────────

export interface RawGameData {
  items: unknown; // items.json
  generators: unknown; // generators.json
  recipes: unknown; // recipes.json
  ovens: unknown; // ovens.json
  economy: unknown; // economy.json
  customers: unknown; // customers.json
  chapters: readonly unknown[]; // chapter1.json, later chapters appended
  newGame: unknown; // newGame.json
  shop: unknown; // shop.json
  events: unknown; // events.json
}

// ─── Zod schemas: items and chains (items.json) ─────────────────────────────

const chainKindSchema: z.ZodType<ChainKind> = z.enum([
  'ingredient',
  'baked',
  'generator',
  'bonus',
  'wildcard',
  'event',
]);

const chainSchema: z.ZodType<Chain> = z.strictObject({
  id: z.string(),
  name: z.string(),
  kind: chainKindSchema,
  color: z.string(),
  completionGems: z.number(),
});

const collectRewardSchema = z.strictObject({
  energy: z.number(),
  coins: z.number(),
});

const itemSchema: z.ZodType<Item> = z.strictObject({
  id: z.string(),
  name: z.string(),
  chainId: z.string(),
  tier: z.number(),
  spriteKey: z.string(),
  sellValue: z.number(),
  note: z.string().nullable(),
  collectReward: collectRewardSchema.nullable(),
});

const itemsFileSchema: z.ZodType<ItemsFile> = z.strictObject({
  chains: z.array(chainSchema),
  items: z.array(itemSchema),
});

// ─── Zod schemas: generators (generators.json) ──────────────────────────────

const weightedEntrySchema: z.ZodType<WeightedEntry> = z.strictObject({
  itemId: z.string(),
  weight: z.number(),
});

const generatorDefSchema: z.ZodType<GeneratorDef> = z.strictObject({
  itemId: z.string(),
  spawnTable: z.array(weightedEntrySchema),
  charges: z.number(),
  cooldownSec: z.number(),
});

const rareDropTableSchema: z.ZodType<RareDropTable> = z.strictObject({
  chancePercent: z.number(),
  table: z.array(weightedEntrySchema),
});

const generatorsFileSchema: z.ZodType<GeneratorsFile> = z.strictObject({
  generators: z.array(generatorDefSchema),
  rareDrops: rareDropTableSchema,
});

// ─── Zod schemas: recipes and ovens (recipes.json, ovens.json) ─────────────

const recipeSchema: z.ZodType<Recipe> = z.strictObject({
  id: z.string(),
  name: z.string(),
  inputs: z.array(z.string()),
  output: z.string(),
  bakeSec: z.number(),
});

const recipesFileSchema: z.ZodType<RecipesFile> = z.strictObject({
  recipes: z.array(recipeSchema),
});

const ovenDefSchema: z.ZodType<OvenDef> = z.strictObject({
  id: z.string(),
  name: z.string(),
  tier: z.number(),
  slots: z.number(),
  bakeTimeMultiplier: z.number(),
  spriteKey: z.string(),
});

const ovensFileSchema: z.ZodType<OvensFile> = z.strictObject({
  ovens: z.array(ovenDefSchema),
});

// ─── Zod schemas: the Shop (shop.json) ──────────────────────────────────────

const shopItemSchema: z.ZodType<ShopItem> = z.strictObject({
  id: z.string(),
  name: z.string(),
  kind: z.enum(['generator', 'energy']),
  itemId: z.string().optional(),
  energy: z.number().optional(),
  price: z.number(),
  fromChapter: z.string(),
});

const shopFileSchema: z.ZodType<ShopFile> = z.strictObject({
  items: z.array(shopItemSchema),
});

// ─── Zod schemas: MegaBun events (events.json) ──────────────────────────────

const eventRewardSchema: z.ZodType<EventReward> = z.strictObject({
  coins: z.number(),
  gems: z.number(),
});

const eventDefSchema: z.ZodType<EventDef> = z.strictObject({
  id: z.string(),
  name: z.string(),
  minChapter: z.string(),
  durationSec: z.number(),
  gapAfterSec: z.number(),
  generatorItemId: z.string(),
  pointsPerOrder: z.number(),
  milestones: z.array(
    z.strictObject({ points: z.number(), reward: eventRewardSchema }),
  ),
  megabunCurve: z.array(
    z.strictObject({ atSec: z.number(), score: z.number() }),
  ),
  trophyGems: z.number(),
});

const eventsFileSchema: z.ZodType<EventsFile> = z.strictObject({
  events: z.array(eventDefSchema),
});

// ─── Zod schemas: customers (customers.json) ────────────────────────────────

const customerKindSchema: z.ZodType<CustomerKind> = z.enum([
  'regular',
  'walkIn',
]);

const customerSchema: z.ZodType<Customer> = z.strictObject({
  id: z.string(),
  name: z.string(),
  kind: customerKindSchema,
  portraitKey: z.string(),
  favoriteItems: z.array(z.string()),
});

const customersFileSchema: z.ZodType<CustomersFile> = z.strictObject({
  customers: z.array(customerSchema),
});

// ─── Zod schemas: chapters (chapter1.json) ──────────────────────────────────

const unlockSchema: z.ZodType<Unlock> = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('generator'), itemId: z.string() }),
  z.strictObject({ kind: z.literal('oven'), ovenId: z.string() }),
  z.strictObject({ kind: z.literal('customer'), customerId: z.string() }),
]);

const renovationTaskSchema: z.ZodType<RenovationTask> = z.strictObject({
  id: z.string(),
  name: z.string(),
  starCost: z.number(),
  spot: z.strictObject({ x: z.number(), y: z.number() }),
  prerequisites: z.array(z.string()),
  unlocks: z.array(unlockSchema),
  featuredItems: z.array(z.string()),
  beforeSpriteKey: z.string(),
  afterSpriteKey: z.string(),
  sceneId: z.string().nullable(),
});

const chapterSchema: z.ZodType<Chapter> = z.strictObject({
  id: z.string(),
  name: z.string(),
  sceneKey: z.string(),
  introSceneId: z.string().nullable(),
  tasks: z.array(renovationTaskSchema),
});

// ─── Zod schemas: economy (economy.json) ────────────────────────────────────

const levelDefSchema: z.ZodType<LevelDef> = z.strictObject({
  level: z.number(),
  xpTotal: z.number(),
  gems: z.number(),
});

const orderKindRulesSchema: z.ZodType<OrderKindRules> = z.strictObject({
  minItems: z.number(),
  maxItems: z.number(),
  maxTier: z.number(),
  starsByItemCount: z.array(z.number()),
  coinMultiplier: z.number(),
  xpPerTier: z.number(),
});

const orderRulesSchema: z.ZodType<OrderRules> = z.strictObject({
  maxOpen: z.number(),
  refillDelaySec: z.number(),
  regularChancePercent: z.number(),
  featuredWeight: z.number(),
  walkIn: orderKindRulesSchema,
  regular: orderKindRulesSchema,
});

const economySchema: z.ZodType<Economy> = z.strictObject({
  energy: z.strictObject({
    cap: z.number(),
    regenSec: z.number(),
    perTap: z.number(),
  }),
  xpPerMergeTier: z.number(),
  levels: z.array(levelDefSchema),
  pantry: z.strictObject({
    startSlots: z.number(),
    slotCosts: z.array(z.number()),
  }),
  rushGemsPerMinute: z.number(),
  sellUndoSec: z.number(),
  goldenWhiskMaxTier: z.number(),
  orders: orderRulesSchema,
});

// ─── Zod schemas: new game (newGame.json) ───────────────────────────────────

const lockKindSchema: z.ZodType<LockKind> = z.enum(['crate', 'flourSack']);

const newGameConfigSchema: z.ZodType<NewGameConfig> = z.strictObject({
  cols: z.number(),
  rows: z.number(),
  locks: z.array(
    z.strictObject({
      cell: z.number(),
      lock: lockKindSchema,
    }),
  ),
  items: z.array(
    z.strictObject({
      cell: z.number(),
      itemId: z.string(),
      cobwebbed: z.boolean(),
    }),
  ),
  ovens: z.array(z.string()),
  coins: z.number(),
  gems: z.number(),
  chapterId: z.string(),
  unlockedCustomers: z.array(z.string()),
});

// ─── Phase 1: shape validation ───────────────────────────────────────────────

function parseSection<T>(
  schema: z.ZodType<T>,
  value: unknown,
  label: string,
  problems: string[],
): T | undefined {
  const result = schema.safeParse(value);
  if (result.success) {
    return result.data;
  }
  for (const issue of result.error.issues) {
    const path = issue.path.length > 0 ? issue.path.join('.') : '(root)';
    problems.push(`${label}: ${path}: ${issue.message}`);
  }
  return undefined;
}

// ─── Phase 2: cross-reference validation ────────────────────────────────────

interface ParsedSections {
  readonly items: ItemsFile;
  readonly generators: GeneratorsFile;
  readonly recipes: RecipesFile;
  readonly ovens: OvensFile;
  readonly customers: CustomersFile;
  readonly chapters: readonly Chapter[];
  readonly economy: Economy;
  readonly newGame: NewGameConfig;
  readonly shop: ShopFile;
  readonly events: EventsFile;
}

/** Every id in `ids` must be distinct; reports each duplicate once. */
function checkUnique(
  ids: readonly string[],
  label: string,
  problems: string[],
): void {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      duplicates.add(id);
    }
    seen.add(id);
  }
  for (const id of duplicates) {
    problems.push(`duplicate id "${id}" in ${label}`);
  }
}

/** `tiers` must be exactly 1, 2, 3, ... with no gaps or repeats, in any order. */
function checkTierSequence(
  tiers: readonly number[],
  label: string,
  problems: string[],
): void {
  const sorted = [...tiers].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length; i++) {
    const expected = i + 1;
    if (sorted[i] !== expected) {
      problems.push(
        `${label}: tiers must run 1, 2, 3, ... with no gaps or repeats, got [${sorted.join(', ')}]`,
      );
      return;
    }
  }
}

function checkWeightedTable(
  table: readonly WeightedEntry[],
  label: string,
  problems: string[],
): void {
  let sum = 0;
  for (const entry of table) {
    if (entry.weight <= 0) {
      problems.push(
        `${label}: weight ${entry.weight} for "${entry.itemId}" is not positive`,
      );
    }
    sum += entry.weight;
  }
  if (Math.abs(sum - 100) > 1e-9) {
    problems.push(`${label}: weights sum to ${sum}, expected 100`);
  }
}

function validateCrossReferences(parsed: ParsedSections): string[] {
  const problems: string[] = [];
  const {
    items,
    generators,
    recipes,
    ovens,
    customers,
    chapters,
    economy,
    newGame,
    shop,
    events,
  } = parsed;

  const chainById = new Map<ChainId, Chain>(items.chains.map((c) => [c.id, c]));
  const itemById = new Map(items.items.map((i) => [i.id, i]));

  const requireItem = (id: string, where: string): void => {
    if (!itemById.has(id)) {
      problems.push(`${where} references unknown item "${id}"`);
    }
  };

  // Ids unique within items, chains, generators, recipes, ovens, customers,
  // chapters, and tasks within a chapter.
  checkUnique(
    items.chains.map((c) => c.id),
    'chains',
    problems,
  );
  checkUnique(
    items.items.map((i) => i.id),
    'items',
    problems,
  );
  checkUnique(
    generators.generators.map((g) => g.itemId),
    'generators',
    problems,
  );
  checkUnique(
    recipes.recipes.map((r) => r.id),
    'recipes',
    problems,
  );
  checkUnique(
    ovens.ovens.map((o) => o.id),
    'ovens',
    problems,
  );
  checkUnique(
    customers.customers.map((c) => c.id),
    'customers',
    problems,
  );
  checkUnique(
    chapters.map((c) => c.id),
    'chapters',
    problems,
  );
  // Completed tasks are one list across chapters (GameState.completedTasks),
  // so task ids must be unique across all of them, not just within one.
  checkUnique(
    chapters.flatMap((c) => c.tasks.map((t) => t.id)),
    'tasks across all chapters',
    problems,
  );
  checkUnique(
    shop.items.map((i) => i.id),
    'shop items',
    problems,
  );

  // Shop rows: a generator row names a generator, an energy row adds a
  // positive amount, prices are positive, fromChapter names a chapter.
  for (const row of shop.items) {
    const where = `shop item "${row.id}"`;
    if (row.kind === 'generator') {
      if (row.itemId === undefined) {
        problems.push(`${where}: a generator row needs an itemId`);
      } else if (!generators.generators.some((g) => g.itemId === row.itemId)) {
        problems.push(`${where}: "${row.itemId}" is not a generator`);
      }
    } else if (row.energy === undefined || row.energy <= 0) {
      problems.push(`${where}: an energy row needs a positive energy amount`);
    }
    if (row.price <= 0) {
      problems.push(`${where}: price ${row.price} is not positive`);
    }
    if (!chapters.some((c) => c.id === row.fromChapter)) {
      problems.push(
        `${where}: fromChapter "${row.fromChapter}" names an unknown chapter`,
      );
    }
  }

  // Events: ids unique; the generator is a known item; a real duration;
  // milestones and the curve ascend; the curve starts at 0 and ends inside
  // the event's duration, so MegaBun's final score is reached before the timer.
  checkUnique(
    events.events.map((e) => e.id),
    'events',
    problems,
  );
  for (const event of events.events) {
    const where = `event "${event.id}"`;
    requireItem(event.generatorItemId, `${where} generatorItemId`);
    const generator = generators.generators.find(
      (g) => g.itemId === event.generatorItemId,
    );
    if (generator === undefined) {
      problems.push(`${where}: generatorItemId is not a generator`);
    } else {
      for (const entry of generator.spawnTable) {
        const spawned = itemById.get(entry.itemId);
        if (
          spawned !== undefined &&
          chainById.get(spawned.chainId)?.kind !== 'event'
        ) {
          problems.push(
            `${where}: spawns "${entry.itemId}", which is not in an event chain`,
          );
        }
      }
    }
    if (!chapters.some((c) => c.id === event.minChapter)) {
      problems.push(
        `${where}: minChapter "${event.minChapter}" names an unknown chapter`,
      );
    }
    if (
      event.durationSec <= 0 ||
      event.pointsPerOrder <= 0 ||
      event.gapAfterSec < 0
    ) {
      problems.push(
        `${where}: durationSec and pointsPerOrder must be positive, gapAfterSec not negative`,
      );
    }
    const ascending = (xs: readonly number[]): boolean =>
      xs.every((x, i) => i === 0 || x > (xs[i - 1] ?? 0));
    if (!ascending(event.milestones.map((m) => m.points))) {
      problems.push(`${where}: milestone points must be ascending`);
    }
    const curve = event.megabunCurve;
    if (curve.length < 2 || curve[0]?.atSec !== 0 || curve[0].score !== 0) {
      problems.push(`${where}: megabunCurve must start at atSec 0, score 0`);
    }
    if (!ascending(curve.map((p) => p.atSec).slice(1))) {
      problems.push(`${where}: megabunCurve atSec must be ascending`);
    }
    if (curve.some((p, i) => i > 0 && p.score < (curve[i - 1]?.score ?? 0))) {
      problems.push(`${where}: megabunCurve score must never fall`);
    }
    if ((curve[curve.length - 1]?.atSec ?? 0) > event.durationSec) {
      problems.push(`${where}: megabunCurve runs past durationSec`);
    }
  }

  // Every chainId names a chain; each chain's tiers run 1, 2, 3, ... with no
  // gaps or repeats.
  const itemsByChain = new Map<ChainId, Item[]>();
  for (const item of items.items) {
    if (!chainById.has(item.chainId)) {
      problems.push(`item "${item.id}" has unknown chainId "${item.chainId}"`);
      continue;
    }
    const list = itemsByChain.get(item.chainId) ?? [];
    list.push(item);
    itemsByChain.set(item.chainId, list);
  }
  for (const chain of items.chains) {
    const chainItemsList = itemsByChain.get(chain.id) ?? [];
    checkTierSequence(
      chainItemsList.map((i) => i.tier),
      `chain "${chain.id}"`,
      problems,
    );
  }

  // Every referenced item id exists: spawn tables, rare drops, recipe inputs
  // and outputs, customer favorites, task featuredItems and generator
  // unlocks, and newGame items.
  for (const g of generators.generators) {
    for (const entry of g.spawnTable) {
      requireItem(entry.itemId, `generator "${g.itemId}" spawn table`);
    }
  }
  for (const entry of generators.rareDrops.table) {
    requireItem(entry.itemId, 'rare drop table');
  }
  for (const r of recipes.recipes) {
    for (const input of r.inputs) {
      requireItem(input, `recipe "${r.id}" input`);
    }
    requireItem(r.output, `recipe "${r.id}" output`);
  }
  for (const c of customers.customers) {
    for (const fav of c.favoriteItems) {
      requireItem(fav, `customer "${c.id}" favoriteItems`);
    }
  }
  for (const chapter of chapters) {
    for (const task of chapter.tasks) {
      for (const fi of task.featuredItems) {
        requireItem(fi, `task "${task.id}" featuredItems`);
      }
      for (const unlock of task.unlocks) {
        if (unlock.kind === 'generator') {
          requireItem(unlock.itemId, `task "${task.id}" unlock`);
        }
      }
    }
  }
  for (const it of newGame.items) {
    requireItem(it.itemId, 'newGame items');
  }

  // Every item in a generator chain has exactly one GeneratorDef, and every
  // GeneratorDef names a generator item.
  const generatorDefByItemId = new Map(
    generators.generators.map((g) => [g.itemId, g]),
  );
  for (const item of items.items) {
    const chain = chainById.get(item.chainId);
    if (chain?.kind === 'generator' && !generatorDefByItemId.has(item.id)) {
      problems.push(`generator item "${item.id}" has no GeneratorDef`);
    }
  }
  for (const g of generators.generators) {
    const item = itemById.get(g.itemId);
    if (item === undefined) {
      problems.push(`GeneratorDef "${g.itemId}" names an unknown item`);
    } else if (chainById.get(item.chainId)?.kind !== 'generator') {
      problems.push(
        `GeneratorDef "${g.itemId}" names an item that is not in a generator chain`,
      );
    }
  }

  // Weights in every spawn table and the rare-drop table sum to 100, and
  // every weight is positive.
  for (const g of generators.generators) {
    checkWeightedTable(
      g.spawnTable,
      `generator "${g.itemId}" spawn table`,
      problems,
    );
  }
  checkWeightedTable(generators.rareDrops.table, 'rare drop table', problems);

  // A recipe's output is the tier 1 item of a baked chain.
  for (const r of recipes.recipes) {
    const outputItem = itemById.get(r.output);
    if (outputItem !== undefined) {
      const chain = chainById.get(outputItem.chainId);
      if (outputItem.tier !== 1 || chain?.kind !== 'baked') {
        problems.push(
          `recipe "${r.id}" output "${r.output}" is not the tier 1 item of a baked chain`,
        );
      }
    }
  }

  // collectReward is non-null exactly for items in bonus chains.
  for (const item of items.items) {
    const chain = chainById.get(item.chainId);
    const isBonus = chain?.kind === 'bonus';
    if (isBonus && item.collectReward === null) {
      problems.push(
        `item "${item.id}" is in a bonus chain but has no collectReward`,
      );
    }
    if (!isBonus && item.collectReward !== null) {
      problems.push(
        `item "${item.id}" has a collectReward but is not in a bonus chain`,
      );
    }
  }

  // Oven tiers run 1, 2, 3, ... with no gaps; slots are at least 1.
  checkTierSequence(
    ovens.ovens.map((o) => o.tier),
    'ovens',
    problems,
  );
  for (const o of ovens.ovens) {
    if (o.slots < 1) {
      problems.push(`oven "${o.id}" has slots ${o.slots}, must be at least 1`);
    }
  }

  // economy.levels starts at level 1 with xpTotal 0, levels count up by 1, and
  // xpTotal strictly increases; each starsByItemCount has length maxItems;
  // minItems <= maxItems.
  const levels = economy.levels;
  if (levels.length === 0) {
    problems.push('economy.levels is empty');
  } else {
    const first = levels[0];
    if (first === undefined || first.level !== 1 || first.xpTotal !== 0) {
      problems.push('economy.levels must start at level 1 with xpTotal 0');
    }
    for (let i = 1; i < levels.length; i++) {
      const prev = levels[i - 1];
      const curr = levels[i];
      if (prev === undefined || curr === undefined) {
        continue;
      }
      if (curr.level !== prev.level + 1) {
        problems.push(
          `economy.levels: level ${curr.level} does not follow level ${prev.level} by 1`,
        );
      }
      if (curr.xpTotal <= prev.xpTotal) {
        problems.push(
          `economy.levels: xpTotal at level ${curr.level} does not strictly increase over level ${prev.level}`,
        );
      }
    }
  }
  for (const kind of ['walkIn', 'regular'] as const) {
    const rules = economy.orders[kind];
    if (rules.starsByItemCount.length !== rules.maxItems) {
      problems.push(
        `economy.orders.${kind}.starsByItemCount has length ${rules.starsByItemCount.length}, expected maxItems ${rules.maxItems}`,
      );
    }
    if (rules.minItems > rules.maxItems) {
      problems.push(
        `economy.orders.${kind}: minItems ${rules.minItems} is greater than maxItems ${rules.maxItems}`,
      );
    }
  }

  // newGame cells lie inside cols x rows, no cell is used twice across locks
  // and items, chapterId names a chapter, every oven id exists, and every
  // unlockedCustomers id is a regular customer.
  const totalCells = newGame.cols * newGame.rows;
  const usedCells = new Set<number>();
  const checkCell = (cell: number, where: string): void => {
    if (cell < 0 || cell >= totalCells) {
      problems.push(
        `${where}: cell ${cell} is outside the ${newGame.cols}x${newGame.rows} board`,
      );
    }
    if (usedCells.has(cell)) {
      problems.push(`newGame: cell ${cell} is used more than once`);
    }
    usedCells.add(cell);
  };
  for (const lock of newGame.locks) {
    checkCell(lock.cell, 'newGame locks');
  }
  for (const it of newGame.items) {
    checkCell(it.cell, 'newGame items');
  }
  if (!chapters.some((c) => c.id === newGame.chapterId)) {
    problems.push(
      `newGame.chapterId "${newGame.chapterId}" names an unknown chapter`,
    );
  }
  for (const ovenId of newGame.ovens) {
    if (!ovens.ovens.some((o) => o.id === ovenId)) {
      problems.push(`newGame.ovens references unknown oven "${ovenId}"`);
    }
  }
  const regularIds = new Set(
    customers.customers.filter((c) => c.kind === 'regular').map((c) => c.id),
  );
  for (const cid of newGame.unlockedCustomers) {
    if (!regularIds.has(cid)) {
      problems.push(
        `newGame.unlockedCustomers references "${cid}", which is not a regular customer`,
      );
    }
  }

  // Task prerequisites name tasks in the same chapter; unlock ids (item,
  // oven, customer) exist. (Generator-item unlocks were checked above.)
  for (const chapter of chapters) {
    const taskIds = new Set(chapter.tasks.map((t) => t.id));
    for (const task of chapter.tasks) {
      for (const prereq of task.prerequisites) {
        if (!taskIds.has(prereq)) {
          problems.push(
            `task "${task.id}" prerequisite "${prereq}" is not a task in chapter "${chapter.id}"`,
          );
        }
      }
      for (const unlock of task.unlocks) {
        if (
          unlock.kind === 'oven' &&
          !ovens.ovens.some((o) => o.id === unlock.ovenId)
        ) {
          problems.push(
            `task "${task.id}" unlock references unknown oven "${unlock.ovenId}"`,
          );
        }
        if (
          unlock.kind === 'customer' &&
          !customers.customers.some((c) => c.id === unlock.customerId)
        ) {
          problems.push(
            `task "${task.id}" unlock references unknown customer "${unlock.customerId}"`,
          );
        }
      }
    }
  }

  return problems;
}

// ─── Build GameData ──────────────────────────────────────────────────────────

function buildGameData(parsed: ParsedSections): GameData {
  const chainItems = new Map<ChainId, Item[]>();
  for (const item of parsed.items.items) {
    const list = chainItems.get(item.chainId) ?? [];
    list.push(item);
    chainItems.set(item.chainId, list);
  }
  for (const list of chainItems.values()) {
    list.sort((a, b) => a.tier - b.tier);
  }

  return {
    items: new Map(parsed.items.items.map((i) => [i.id, i])),
    chains: new Map(parsed.items.chains.map((c) => [c.id, c])),
    chainItems,
    generators: new Map(parsed.generators.generators.map((g) => [g.itemId, g])),
    rareDrops: parsed.generators.rareDrops,
    recipes: new Map(parsed.recipes.recipes.map((r) => [r.id, r])),
    ovens: new Map(parsed.ovens.ovens.map((o) => [o.id, o])),
    customers: new Map(parsed.customers.customers.map((c) => [c.id, c])),
    chapters: new Map(parsed.chapters.map((c) => [c.id, c])),
    economy: parsed.economy,
    newGame: parsed.newGame,
    shop: new Map(parsed.shop.items.map((i) => [i.id, i])),
    events: new Map(parsed.events.events.map((e) => [e.id, e])),
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/** Validates and builds GameData. Throws one Error listing every problem found. */
export function parseGameData(raw: RawGameData): GameData {
  const shapeProblems: string[] = [];

  const items = parseSection(
    itemsFileSchema,
    raw.items,
    'items.json',
    shapeProblems,
  );
  const generators = parseSection(
    generatorsFileSchema,
    raw.generators,
    'generators.json',
    shapeProblems,
  );
  const recipes = parseSection(
    recipesFileSchema,
    raw.recipes,
    'recipes.json',
    shapeProblems,
  );
  const ovens = parseSection(
    ovensFileSchema,
    raw.ovens,
    'ovens.json',
    shapeProblems,
  );
  const economy = parseSection(
    economySchema,
    raw.economy,
    'economy.json',
    shapeProblems,
  );
  const customers = parseSection(
    customersFileSchema,
    raw.customers,
    'customers.json',
    shapeProblems,
  );
  const chapters = parseSection(
    z.array(chapterSchema),
    raw.chapters,
    'chapters',
    shapeProblems,
  );
  const newGame = parseSection(
    newGameConfigSchema,
    raw.newGame,
    'newGame.json',
    shapeProblems,
  );
  const shop = parseSection(
    shopFileSchema,
    raw.shop,
    'shop.json',
    shapeProblems,
  );

  const events = parseSection(
    eventsFileSchema,
    raw.events,
    'events.json',
    shapeProblems,
  );

  if (
    items === undefined ||
    generators === undefined ||
    recipes === undefined ||
    ovens === undefined ||
    economy === undefined ||
    customers === undefined ||
    chapters === undefined ||
    newGame === undefined ||
    shop === undefined ||
    events === undefined
  ) {
    throw new Error(shapeProblems.join('\n'));
  }

  const parsed: ParsedSections = {
    items,
    generators,
    recipes,
    ovens,
    customers,
    chapters,
    economy,
    newGame,
    shop,
    events,
  };

  const crossRefProblems = validateCrossReferences(parsed);
  if (crossRefProblems.length > 0) {
    throw new Error(crossRefProblems.join('\n'));
  }

  return buildGameData(parsed);
}

const dataFiles = import.meta.glob<unknown>('../data/*.json', {
  eager: true,
  import: 'default',
});

function readDataFile(filename: string): unknown {
  const key = `../data/${filename}`;
  if (!(key in dataFiles)) {
    throw new Error(`loadGameData: src/data/${filename} was not found`);
  }
  return dataFiles[key];
}

function readChapterFiles(): readonly unknown[] {
  const chapterEntries = Object.entries(dataFiles)
    .filter(([path]) => /\/chapter\d+\.json$/.test(path))
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
  if (chapterEntries.length === 0) {
    throw new Error(
      'loadGameData: no chapter files found in src/data (expected chapter1.json, ...)',
    );
  }
  return chapterEntries.map(([, data]) => data);
}

/** Imports the JSON files in src/data and calls parseGameData. */
export function loadGameData(): GameData {
  return parseGameData({
    items: readDataFile('items.json'),
    generators: readDataFile('generators.json'),
    recipes: readDataFile('recipes.json'),
    ovens: readDataFile('ovens.json'),
    economy: readDataFile('economy.json'),
    customers: readDataFile('customers.json'),
    chapters: readChapterFiles(),
    newGame: readDataFile('newGame.json'),
    shop: readDataFile('shop.json'),
    events: readDataFile('events.json'),
  });
}
