/**
 * Season pack format (T14.2).
 *
 * `parseSeasonPack` validates one pack's season.json against the base game
 * data and throws one Error listing every problem. `withSeasons` merges parsed
 * packs, their windows already resolved to this occurrence (T14.3), into a new
 * GameData. Both are pure; fetching packs and importing their rules is the
 * loader's job (T14.6), which skips a pack that throws here.
 */

import { z } from 'zod';
import {
  chainSchema,
  checkTierSequence,
  checkUnique,
  checkWeightedTable,
  generatorDefSchema,
  itemSchema,
  parseSection,
  recipeSchema,
} from '../core/data';
import { SEASON_API_VERSION, type SeasonRules } from '../core/seasonApi';
import type {
  Chain,
  ChainId,
  ChainKind,
  GameData,
  GeneratorDef,
  Item,
  ItemId,
  Recipe,
  SeasonDef,
  Timestamp,
} from '../core/types';
import { isMonthDay } from './calendar';

/** A validated pack: the rules data core sees, and the content merged into GameData. */
export interface SeasonPack {
  readonly def: SeasonDef;
  /** Stamped with `seasonId`. */
  readonly chains: readonly Chain[];
  readonly items: readonly Item[];
  readonly generators: readonly GeneratorDef[];
  /** Stamped with `seasonId`. */
  readonly recipes: readonly Recipe[];
}

/** A pack ready to merge: its window resolved to this occurrence, its hooks imported. */
export interface ResolvedPack {
  readonly pack: SeasonPack;
  readonly startsAt: Timestamp;
  readonly endsAt: Timestamp;
  readonly rules: SeasonRules | null;
}

// ─── season.json schema ──────────────────────────────────────────────────────

/** Lowercase words joined by single dashes; the id is also a path segment and an id prefix. */
export const SEASON_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** A path segment such as "1.0.0"; can't be "." or "..". */
export const PACK_VERSION = /^[a-z0-9]+([.-][a-z0-9]+)*$/;

/** Chain kinds a season may add. Event chains belong to MegaBun events. */
const SEASON_CHAIN_KINDS: readonly ChainKind[] = [
  'ingredient',
  'baked',
  'generator',
];

const seasonPackSchema = z.strictObject({
  id: z.string().regex(SEASON_ID),
  name: z.string().min(1),
  version: z.string().regex(PACK_VERSION),
  apiVersion: z.number().int(),
  window: z.strictObject({ start: z.string(), end: z.string() }),
  generatorItemId: z.string(),
  pointsPerItem: z.number().int().positive(),
  orders: z.strictObject({
    maxOpen: z.number().int(),
    minItems: z.number().int(),
    maxItems: z.number().int(),
    minTier: z.number().int().optional(),
    maxTier: z.number().int(),
  }),
  milestones: z
    .array(
      z.strictObject({
        points: z.number().int().positive(),
        reward: z.strictObject({
          coins: z.number().int().nonnegative(),
          gems: z.number().int().nonnegative(),
          keepsakeId: z.string().optional(),
        }),
      }),
    )
    .min(1),
  keepsakes: z.array(
    z.strictObject({ id: z.string(), name: z.string(), spriteKey: z.string() }),
  ),
  chains: z.array(chainSchema),
  items: z.array(itemSchema),
  generators: z.array(generatorDefSchema),
  recipes: z.array(recipeSchema),
});

type SeasonPackFile = z.infer<typeof seasonPackSchema>;

// ─── Cross-checks ────────────────────────────────────────────────────────────

function validatePack(base: GameData, file: SeasonPackFile): string[] {
  const problems: string[] = [];
  const prefix = `${file.id}-`;

  if (file.apiVersion !== SEASON_API_VERSION) {
    problems.push(
      `apiVersion ${file.apiVersion} is not the game's ${SEASON_API_VERSION}`,
    );
  }
  for (const [key, value] of [
    ['window.start', file.window.start],
    ['window.end', file.window.end],
  ] as const) {
    if (!isMonthDay(value)) {
      problems.push(
        `${key} "${value}" is not a month-day like "11-26" (Feb 29 isn't allowed)`,
      );
    }
  }

  // The orphan sweep removes every id starting with the prefix, so no base id
  // may start with it, and every id the pack adds must.
  const baseIds = [
    ...base.items.keys(),
    ...base.chains.keys(),
    ...base.recipes.keys(),
  ];
  const clash = baseIds.find((id) => id.startsWith(prefix));
  if (clash !== undefined) {
    problems.push(
      `the base game's "${clash}" starts with "${prefix}", so the season id can't be "${file.id}"`,
    );
  }
  const requirePrefix = (value: string, label: string): void => {
    if (!value.startsWith(prefix)) {
      problems.push(`${label} "${value}" doesn't start with "${prefix}"`);
    }
  };
  for (const chain of file.chains) requirePrefix(chain.id, 'chain');
  for (const item of file.items) {
    requirePrefix(item.id, 'item');
    requirePrefix(item.spriteKey, `item "${item.id}" spriteKey`);
  }
  for (const recipe of file.recipes) requirePrefix(recipe.id, 'recipe');
  for (const keepsake of file.keepsakes) {
    requirePrefix(keepsake.id, 'keepsake');
    requirePrefix(keepsake.spriteKey, `keepsake "${keepsake.id}" spriteKey`);
  }

  checkUnique(
    file.chains.map((c) => c.id),
    'chains',
    problems,
  );
  checkUnique(
    file.items.map((i) => i.id),
    'items',
    problems,
  );
  checkUnique(
    file.generators.map((g) => g.itemId),
    'generators',
    problems,
  );
  checkUnique(
    file.recipes.map((r) => r.id),
    'recipes',
    problems,
  );
  checkUnique(
    file.keepsakes.map((k) => k.id),
    'keepsakes',
    problems,
  );

  // Chains: allowed kinds, and items whose tiers run 1, 2, 3, ...
  const chainById = new Map<ChainId, Chain>(file.chains.map((c) => [c.id, c]));
  const itemById = new Map<ItemId, Item>(file.items.map((i) => [i.id, i]));
  const itemsByChain = new Map<ChainId, Item[]>();
  for (const chain of file.chains) {
    if (!SEASON_CHAIN_KINDS.includes(chain.kind)) {
      problems.push(
        `chain "${chain.id}" has kind "${chain.kind}"; a season adds only ${SEASON_CHAIN_KINDS.join(', ')} chains`,
      );
    }
  }
  for (const item of file.items) {
    if (!chainById.has(item.chainId)) {
      problems.push(
        `item "${item.id}" has chainId "${item.chainId}", which isn't one of the pack's chains`,
      );
      continue;
    }
    if (item.collectReward !== null) {
      problems.push(
        `item "${item.id}" has a collectReward, but a season has no bonus chains`,
      );
    }
    const list = itemsByChain.get(item.chainId) ?? [];
    list.push(item);
    itemsByChain.set(item.chainId, list);
  }
  for (const chain of file.chains) {
    const tiers = (itemsByChain.get(chain.id) ?? []).map((i) => i.tier);
    if (tiers.length === 0) {
      problems.push(`chain "${chain.id}" has no items`);
    }
    checkTierSequence(tiers, `chain "${chain.id}"`, problems);
  }

  const requireItem = (id: ItemId, where: string): void => {
    if (!itemById.has(id) && !base.items.has(id)) {
      problems.push(`${where} references unknown item "${id}"`);
    }
  };

  // Generators: one GeneratorDef per pack generator item, and no other; spawn
  // tables may mix pack and base items.
  const generatorById = new Map(file.generators.map((g) => [g.itemId, g]));
  for (const item of file.items) {
    if (
      chainById.get(item.chainId)?.kind === 'generator' &&
      !generatorById.has(item.id)
    ) {
      problems.push(`generator item "${item.id}" has no GeneratorDef`);
    }
  }
  for (const generator of file.generators) {
    const where = `generator "${generator.itemId}"`;
    const item = itemById.get(generator.itemId);
    if (item === undefined) {
      problems.push(`${where} isn't one of the pack's items`);
    } else if (chainById.get(item.chainId)?.kind !== 'generator') {
      problems.push(`${where} is not in a generator chain`);
    }
    for (const entry of generator.spawnTable) {
      requireItem(entry.itemId, `${where} spawn table`);
    }
    checkWeightedTable(generator.spawnTable, `${where} spawn table`, problems);
  }
  if (
    !generatorById.has(file.generatorItemId) ||
    !itemById.has(file.generatorItemId)
  ) {
    problems.push(
      `generatorItemId "${file.generatorItemId}" isn't one of the pack's generators`,
    );
  }

  // Recipes: inputs may mix pack and base items; the output starts one of the
  // pack's baked chains.
  for (const recipe of file.recipes) {
    for (const input of recipe.inputs) {
      requireItem(input, `recipe "${recipe.id}" input`);
    }
    const output = itemById.get(recipe.output);
    if (
      output === undefined ||
      output.tier !== 1 ||
      chainById.get(output.chainId)?.kind !== 'baked'
    ) {
      problems.push(
        `recipe "${recipe.id}" output "${recipe.output}" is not the tier 1 item of one of the pack's baked chains`,
      );
    }
  }

  // Seasonal orders ask for the pack's ingredient and baked items.
  const { orders } = file;
  const minTier = orders.minTier ?? 1;
  if (
    orders.maxOpen < 1 ||
    orders.minItems < 1 ||
    orders.minItems > orders.maxItems ||
    minTier < 1 ||
    minTier > orders.maxTier
  ) {
    problems.push('orders rules are out of range');
  }
  const tallestProductChain = Math.max(
    0,
    ...file.chains
      .filter((c) => c.kind === 'ingredient' || c.kind === 'baked')
      .map((c) => itemsByChain.get(c.id)?.length ?? 0),
  );
  if (orders.maxTier > tallestProductChain) {
    problems.push(
      `orders.maxTier ${orders.maxTier} is above the top tier of every ingredient and baked chain in the pack`,
    );
  }

  // Milestones ascend; each keepsake is paid by exactly one milestone.
  const points = file.milestones.map((m) => m.points);
  if (points.some((p, i) => i > 0 && p <= (points[i - 1] ?? 0))) {
    problems.push('milestone points must be ascending');
  }
  const keepsakeIds = new Set(file.keepsakes.map((k) => k.id));
  const paid = new Set<string>();
  file.milestones.forEach((milestone, index) => {
    const keepsakeId = milestone.reward.keepsakeId;
    if (keepsakeId === undefined) return;
    if (!keepsakeIds.has(keepsakeId)) {
      problems.push(`milestone ${index} pays unknown keepsake "${keepsakeId}"`);
    } else if (paid.has(keepsakeId)) {
      problems.push(
        `keepsake "${keepsakeId}" is paid by more than one milestone`,
      );
    }
    paid.add(keepsakeId);
  });
  for (const keepsake of file.keepsakes) {
    if (!paid.has(keepsake.id)) {
      problems.push(`keepsake "${keepsake.id}" isn't paid by any milestone`);
    }
  }

  return problems;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/** Validates one pack's season.json against `base`. Throws one Error listing every problem. */
export function parseSeasonPack(base: GameData, raw: unknown): SeasonPack {
  const shapeProblems: string[] = [];
  const file = parseSection(
    seasonPackSchema,
    raw,
    'season.json',
    shapeProblems,
  );
  if (file === undefined) {
    throw new Error(shapeProblems.join('\n'));
  }
  const problems = validatePack(base, file);
  if (problems.length > 0) {
    throw new Error(
      problems.map((p) => `season "${file.id}": ${p}`).join('\n'),
    );
  }
  const { chains, items, generators, recipes, ...def } = file;
  return {
    def,
    chains: chains.map((c) => ({ ...c, seasonId: def.id })),
    items,
    generators,
    recipes: recipes.map((r) => ({ ...r, seasonId: def.id })),
  };
}

function addAll<K, V>(
  map: Map<K, V>,
  entries: readonly (readonly [K, V])[],
  label: string,
): void {
  for (const [key, value] of entries) {
    if (map.has(key)) {
      throw new Error(`withSeasons: ${label} "${String(key)}" already exists`);
    }
    map.set(key, value);
  }
}

/**
 * `base` plus each pack's chains, items, generators, recipes, and its
 * LoadedSeason. Packs must have been parsed against this same `base`. Throws
 * on a season loaded twice, two season ids where one prefixes the other, an
 * empty window, or rules built for another apiVersion.
 */
export function withSeasons(
  base: GameData,
  packs: readonly ResolvedPack[],
): GameData {
  if (packs.length === 0) return base;

  const items = new Map(base.items);
  const chains = new Map(base.chains);
  const chainItems = new Map(base.chainItems);
  const generators = new Map(base.generators);
  const recipes = new Map(base.recipes);
  const seasons = new Map(base.seasons);

  for (const { pack, startsAt, endsAt, rules } of packs) {
    const id = pack.def.id;
    if (seasons.has(id)) {
      throw new Error(`withSeasons: season "${id}" is loaded twice`);
    }
    for (const other of seasons.keys()) {
      if (other.startsWith(`${id}-`) || id.startsWith(`${other}-`)) {
        throw new Error(
          `withSeasons: seasons "${id}" and "${other}" overlap; one id starts the other's ids`,
        );
      }
    }
    if (startsAt >= endsAt) {
      throw new Error(`withSeasons: season "${id}" ends before it starts`);
    }
    if (rules !== null && rules.apiVersion !== pack.def.apiVersion) {
      throw new Error(
        `withSeasons: season "${id}" rules are for apiVersion ${String(rules.apiVersion)}, its data for ${pack.def.apiVersion}`,
      );
    }

    addAll(
      items,
      pack.items.map((i) => [i.id, i] as const),
      'item',
    );
    addAll(
      chains,
      pack.chains.map((c) => [c.id, c] as const),
      'chain',
    );
    addAll(
      chainItems,
      pack.chains.map(
        (c) =>
          [
            c.id,
            pack.items
              .filter((i) => i.chainId === c.id)
              .sort((a, b) => a.tier - b.tier),
          ] as const,
      ),
      'chain',
    );
    addAll(
      generators,
      pack.generators.map((g) => [g.itemId, g] as const),
      'generator',
    );
    addAll(
      recipes,
      pack.recipes.map((r) => [r.id, r] as const),
      'recipe',
    );
    seasons.set(id, { def: pack.def, startsAt, endsAt, rules });
  }

  return { ...base, items, chains, chainItems, generators, recipes, seasons };
}
