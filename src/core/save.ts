/**
 * Save format: turning a GameState into a versioned string and back (T4.5).
 *
 * Pure: no storage access. See src/ui/saveStorage.ts for reading and writing
 * browser storage.
 */

import { z } from 'zod';
import { migrate } from './migrate';
import type {
  Bake,
  Board,
  BoardItem,
  Cell,
  EnergyState,
  GameData,
  GameState,
  GeneratorCharge,
  LastSale,
  LockKind,
  Order,
  OrderReward,
  OvenState,
  Pantry,
  Timestamp,
  TutorialStep,
} from './types';

export const SAVE_VERSION = 1;

export interface SaveFile {
  version: number;
  savedAt: Timestamp;
  state: GameState;
}

export type LoadResult =
  { ok: true; save: SaveFile } | { ok: false; error: string };

// ─── Zod schema for GameState (strict, mirrors data.ts) ─────────────────────

const lockKindSchema: z.ZodType<LockKind> = z.enum(['crate', 'flourSack']);

const generatorChargeSchema: z.ZodType<GeneratorCharge> = z.strictObject({
  charges: z.number(),
  cooldownEndsAt: z.number().nullable(),
});

const boardItemSchema: z.ZodType<BoardItem> = z.strictObject({
  itemId: z.string(),
  cobwebbed: z.boolean(),
  generator: generatorChargeSchema.nullable(),
});

const cellSchema: z.ZodType<Cell> = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('empty') }),
  z.strictObject({ kind: z.literal('locked'), lock: lockKindSchema }),
  z.strictObject({ kind: z.literal('item'), item: boardItemSchema }),
]);

const boardSchema: z.ZodType<Board> = z.strictObject({
  cols: z.number(),
  rows: z.number(),
  cells: z.array(cellSchema),
});

const pantrySchema: z.ZodType<Pantry> = z.strictObject({
  capacity: z.number(),
  items: z.array(boardItemSchema),
});

const energyStateSchema: z.ZodType<EnergyState> = z.strictObject({
  value: z.number(),
  updatedAt: z.number(),
});

const orderRewardSchema: z.ZodType<OrderReward> = z.strictObject({
  coins: z.number(),
  stars: z.number(),
  xp: z.number(),
});

const orderSchema: z.ZodType<Order> = z.strictObject({
  id: z.number(),
  customerId: z.string(),
  wants: z.array(z.string()),
  reward: orderRewardSchema,
});

const bakeSchema: z.ZodType<Bake> = z.strictObject({
  recipeId: z.string(),
  startedAt: z.number(),
  endsAt: z.number(),
});

const ovenStateSchema: z.ZodType<OvenState> = z.strictObject({
  ovenId: z.string(),
  slots: z.array(bakeSchema.nullable()),
});

const lastSaleSchema: z.ZodType<LastSale> = z.strictObject({
  item: boardItemSchema,
  cell: z.number(),
  coins: z.number(),
  soldAt: z.number(),
});

const tutorialStepSchema: z.ZodType<TutorialStep> = z.enum([
  'firstTap',
  'firstMerge',
  'firstOrder',
  'firstRenovation',
  'done',
]);

const gameStateSchema: z.ZodType<GameState> = z.strictObject({
  board: boardSchema,
  pantry: pantrySchema,
  energy: energyStateSchema,
  coins: z.number(),
  stars: z.number(),
  gems: z.number(),
  xp: z.number(),
  level: z.number(),
  orders: z.array(orderSchema),
  nextOrderAt: z.number().nullable(),
  kitchen: z.strictObject({ ovens: z.array(ovenStateSchema) }),
  lastSale: lastSaleSchema.nullable(),
  discovered: z.array(z.string()),
  pendingDiscoveries: z.array(z.string()),
  rewardedChains: z.array(z.string()),
  chapterId: z.string(),
  completedTasks: z.array(z.string()),
  unlockedCustomers: z.array(z.string()),
  tutorialStep: tutorialStepSchema,
  rngState: z.number(),
  nextOrderId: z.number(),
});

const saveFileSchema: z.ZodType<SaveFile> = z.strictObject({
  version: z.number(),
  savedAt: z.number(),
  state: gameStateSchema,
});

// ─── Cross-reference validation against GameData ────────────────────────────

/** Board cols, rows, and cell count must match data.newGame exactly. */
function checkBoard(data: GameData, board: Board): string | null {
  const { cols, rows } = data.newGame;
  if (board.cols !== cols || board.rows !== rows) {
    return `board is ${board.cols}x${board.rows}, expected ${cols}x${rows}`;
  }
  const expectedCells = cols * rows;
  if (board.cells.length !== expectedCells) {
    return `board has ${board.cells.length} cells, expected ${expectedCells}`;
  }
  return null;
}

/** Every item, oven, recipe, customer, and chapter id must be known to `data`. */
function checkKnownIds(data: GameData, state: GameState): string | null {
  const problems: string[] = [];

  const requireItem = (id: string, where: string): void => {
    if (!data.items.has(id)) {
      problems.push(`${where} references unknown item "${id}"`);
    }
  };
  const requireOven = (id: string, where: string): void => {
    if (!data.ovens.has(id)) {
      problems.push(`${where} references unknown oven "${id}"`);
    }
  };
  const requireRecipe = (id: string, where: string): void => {
    if (!data.recipes.has(id)) {
      problems.push(`${where} references unknown recipe "${id}"`);
    }
  };
  const requireCustomer = (id: string, where: string): void => {
    if (!data.customers.has(id)) {
      problems.push(`${where} references unknown customer "${id}"`);
    }
  };

  for (const cell of state.board.cells) {
    if (cell.kind === 'item') {
      requireItem(cell.item.itemId, 'board item');
    }
  }
  for (const item of state.pantry.items) {
    requireItem(item.itemId, 'pantry item');
  }
  if (state.lastSale !== null) {
    requireItem(state.lastSale.item.itemId, 'lastSale item');
  }
  for (const id of state.discovered) {
    requireItem(id, 'discovered');
  }
  for (const id of state.pendingDiscoveries) {
    requireItem(id, 'pendingDiscoveries');
  }
  for (const order of state.orders) {
    requireCustomer(order.customerId, 'order customerId');
    for (const id of order.wants) {
      requireItem(id, 'order wants');
    }
  }
  for (const id of state.unlockedCustomers) {
    requireCustomer(id, 'unlockedCustomers');
  }
  if (!data.chapters.has(state.chapterId)) {
    problems.push(`chapterId references unknown chapter "${state.chapterId}"`);
  }
  for (const oven of state.kitchen.ovens) {
    requireOven(oven.ovenId, 'kitchen oven');
    for (const slot of oven.slots) {
      if (slot !== null) {
        requireRecipe(slot.recipeId, 'bake slot');
      }
    }
  }

  return problems.length > 0 ? problems.join('; ') : null;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/** JSON of { version: SAVE_VERSION, savedAt, state }. */
export function serializeSave(state: GameState, savedAt: Timestamp): string {
  const save: SaveFile = { version: SAVE_VERSION, savedAt, state };
  return JSON.stringify(save);
}

/**
 * Never throws for bad input. See LoadResult for the error cases checked.
 */
export function deserializeSave(data: GameData, text: string): LoadResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'deserializeSave: not valid JSON' };
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    Array.isArray(parsed) ||
    typeof (parsed as Record<string, unknown>)['version'] !== 'number'
  ) {
    return {
      ok: false,
      error: 'deserializeSave: not an object with a numeric version',
    };
  }

  const version = (parsed as Record<string, unknown>)['version'] as number;
  if (version > SAVE_VERSION) {
    return {
      ok: false,
      error: `deserializeSave: save version ${version} is newer than supported version ${SAVE_VERSION}`,
    };
  }

  // Walk an older save forward to the current format before validating it.
  let migrated: unknown;
  try {
    migrated = migrate(parsed as Record<string, unknown>, SAVE_VERSION);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `deserializeSave: ${message}` };
  }

  const result = saveFileSchema.safeParse(migrated);
  if (!result.success) {
    const messages = result.error.issues.map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : '(root)';
      return `${path}: ${issue.message}`;
    });
    return {
      ok: false,
      error: `deserializeSave: save does not match GameState: ${messages.join('; ')}`,
    };
  }

  const save = result.data;

  const boardError = checkBoard(data, save.state.board);
  if (boardError !== null) {
    return { ok: false, error: `deserializeSave: ${boardError}` };
  }

  const idError = checkKnownIds(data, save.state);
  if (idError !== null) {
    return { ok: false, error: `deserializeSave: ${idError}` };
  }

  return { ok: true, save };
}
