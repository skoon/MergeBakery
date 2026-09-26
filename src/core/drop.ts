/**
 * Drop resolution: dragging the item at one cell onto another (T2.3, T2.4).
 *
 * Resolves to a move (destination empty), a merge (matching items with a
 * next tier), or a swap (otherwise). A merge into a connected group of 4 or
 * more identical items (5+ counting the dragged one) is a five-item merge
 * bonus: it produces two next-tier items instead of one.
 */

import type {
  ActionResult,
  Board,
  BoardItem,
  CellIndex,
  GameData,
  GameEvent,
  GameState,
  Item,
  ItemId,
  Timestamp,
} from './types';
import { getCell, setCell, neighbors, toPos } from './board';
import { canMerge, nextTier } from './merge';
import { clearAdjacentLocks } from './locks';
import { addXp } from './level';
import { discover } from './discovery';

/**
 * Determines if an item belongs to a wildcard chain (e.g., the Golden Whisk).
 */
function isWildcardItem(data: GameData, itemId: ItemId): boolean {
  const item = data.items.get(itemId);
  if (!item) return false;
  const chain = data.chains.get(item.chainId);
  if (!chain) return false;
  return chain.kind === 'wildcard';
}

/**
 * Determines if exactly one of two items is a wildcard (whisk drop condition).
 */
function isWhiskDrop(data: GameData, aId: ItemId, bId: ItemId): boolean {
  const aIsWildcard = isWildcardItem(data, aId);
  const bIsWildcard = isWildcardItem(data, bId);
  return aIsWildcard !== bIsWildcard;
}

/**
 * Resolves dragging the item at `from` onto `to`. See RejectReason for why a
 * drop can fail.
 */
export function applyDrop(
  data: GameData,
  state: GameState,
  from: CellIndex,
  to: CellIndex,
  now: Timestamp,
): ActionResult {
  if (from === to) {
    return { ok: false, reason: 'sameCell' };
  }

  const fromCell = getCell(state.board, from);
  if (fromCell.kind === 'locked') {
    return { ok: false, reason: 'locked' };
  }
  if (fromCell.kind === 'empty') {
    return { ok: false, reason: 'emptyCell' };
  }
  if (fromCell.item.cobwebbed) {
    return { ok: false, reason: 'cobwebbed' };
  }

  const toCell = getCell(state.board, to);
  if (toCell.kind === 'locked') {
    return { ok: false, reason: 'locked' };
  }

  const fromItem = fromCell.item;

  // Move: the destination is empty.
  if (toCell.kind === 'empty') {
    const board = setCell(setCell(state.board, from, { kind: 'empty' }), to, {
      kind: 'item',
      item: fromItem,
    });
    return { ok: true, state: { ...state, board }, events: [] };
  }

  const toItem = toCell.item;

  // Merge: matching items with a next tier. The target may be cobwebbed; a
  // matching merge frees it.
  if (canMerge(data, fromItem.itemId, toItem.itemId)) {
    return applyMerge(data, state, from, to, fromItem.itemId, now);
  }

  // Whisk drop: copy the non-whisk item into the whisk's cell.
  if (isWhiskDrop(data, fromItem.itemId, toItem.itemId)) {
    const whiskIsFrom = isWildcardItem(data, fromItem.itemId);
    const whiskCell = whiskIsFrom ? from : to;
    const copiedItemId = whiskIsFrom ? toItem.itemId : fromItem.itemId;
    const copiedItem = data.items.get(copiedItemId);
    const copiedBoardItem = whiskIsFrom ? toItem : fromItem;

    if (!copiedItem) {
      throw new Error(`applyDrop: unknown item id "${copiedItemId}"`);
    }

    const chain = data.chains.get(copiedItem.chainId);
    if (!chain) {
      throw new Error(`applyDrop: unknown chain id "${copiedItem.chainId}"`);
    }

    // The item to be copied must be in ingredient or baked chain
    if (chain.kind !== 'ingredient' && chain.kind !== 'baked') {
      return { ok: false, reason: 'notMergeable' };
    }

    // The item's tier must be within the whisk's limit
    if (copiedItem.tier > data.economy.goldenWhiskMaxTier) {
      return { ok: false, reason: 'notMergeable' };
    }

    // The item to be copied must not be cobwebbed
    if (copiedBoardItem.cobwebbed) {
      return { ok: false, reason: 'notMergeable' };
    }

    // Create a copy of the item in the whisk's cell (not cobwebbed, no generator)
    const newItem: BoardItem = {
      itemId: copiedItemId,
      cobwebbed: false,
      generator: null,
    };

    const board = setCell(state.board, whiskCell, {
      kind: 'item',
      item: newItem,
    });

    const newState: GameState = { ...state, board };
    const events: GameEvent[] = [
      { type: 'merged', itemId: copiedItemId, cells: [whiskCell] },
    ];

    return { ok: true, state: newState, events };
  }

  // Swap: otherwise, unless the target is cobwebbed.
  if (toItem.cobwebbed) {
    return { ok: false, reason: 'cobwebbed' };
  }

  const board = setCell(
    setCell(state.board, from, { kind: 'item', item: toItem }),
    to,
    { kind: 'item', item: fromItem },
  );
  return { ok: true, state: { ...state, board }, events: [] };
}

/**
 * Applies a merge landing on `to`. Normally (a group of 3 or fewer cells):
 * empties `from`, promotes `to` to the next tier (not cobwebbed, with full
 * generator charges when applicable), then opens adjacent locks, awards XP,
 * and records discovery.
 *
 * When `to` is part of a connected group of 4 or more cells holding the
 * merged item (T2.4's five-item merge bonus), promotes `to` and the closest
 * other group cell to the next tier instead of just `to`, consuming two more
 * group cells besides, for double XP.
 */
function applyMerge(
  data: GameData,
  state: GameState,
  from: CellIndex,
  to: CellIndex,
  mergedItemId: ItemId,
  now: Timestamp,
): ActionResult {
  const fromDef = data.items.get(mergedItemId);
  if (!fromDef) {
    throw new Error(`applyDrop: unknown item id "${mergedItemId}"`);
  }

  const mergedInto = nextTier(data, mergedItemId);
  if (!mergedInto) {
    throw new Error(
      `applyDrop: canMerge said "${mergedItemId}" has a next tier, but nextTier returned null`,
    );
  }

  const group = findMergeGroup(state.board, to, from, mergedItemId);

  if (group.length >= 4) {
    return applyFiveItemMerge(
      data,
      state,
      from,
      to,
      group,
      fromDef,
      mergedInto,
      now,
    );
  }

  const generatorDef = data.generators.get(mergedInto.id);
  const newItem: BoardItem = {
    itemId: mergedInto.id,
    cobwebbed: false,
    generator: generatorDef
      ? { charges: generatorDef.charges, cooldownEndsAt: null }
      : null,
  };

  const board = setCell(setCell(state.board, from, { kind: 'empty' }), to, {
    kind: 'item',
    item: newItem,
  });

  let newState: GameState = { ...state, board };
  const events: GameEvent[] = [
    { type: 'merged', itemId: mergedInto.id, cells: [to] },
  ];

  const lockResult = clearAdjacentLocks(newState, to);
  newState = lockResult.state;
  if (lockResult.unlocked.length > 0) {
    events.push({ type: 'cellsUnlocked', cells: lockResult.unlocked });
  }

  const xpResult = addXp(
    data,
    newState,
    fromDef.tier * data.economy.xpPerMergeTier,
    now,
  );
  newState = xpResult.state;
  events.push(...xpResult.events);

  const discoverResult = discover(data, newState, mergedInto.id);
  newState = discoverResult.state;
  events.push(...discoverResult.events);

  return { ok: true, state: newState, events };
}

/**
 * Every cell orthogonally connected to `to` through cells holding `itemId`,
 * including `to` itself, excluding `from`. Cobwebbed cells other than `to`
 * don't count and don't connect (`to` may itself be cobwebbed; a matching
 * merge frees it).
 */
function findMergeGroup(
  board: Board,
  to: CellIndex,
  from: CellIndex,
  itemId: ItemId,
): CellIndex[] {
  const visited = new Set<CellIndex>([to]);
  const queue: CellIndex[] = [to];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) {
      break;
    }
    for (const neighbor of neighbors(board, current)) {
      if (neighbor === from || visited.has(neighbor)) {
        continue;
      }
      const cell = getCell(board, neighbor);
      if (
        cell.kind !== 'item' ||
        cell.item.itemId !== itemId ||
        cell.item.cobwebbed
      ) {
        continue;
      }
      visited.add(neighbor);
      queue.push(neighbor);
    }
  }

  return [...visited];
}

/** Straight-line distance between two cells' centers. */
function distanceBetween(board: Board, a: CellIndex, b: CellIndex): number {
  const posA = toPos(board, a);
  const posB = toPos(board, b);
  const dx = posA.col - posB.col;
  const dy = posA.row - posB.row;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * The five-item merge bonus (T2.4): `group` (from findMergeGroup) has 4 or
 * more cells. Consumes the dragged item, `to`, and the 3 other group cells
 * closest to `to` (ties to the lowest index): `to` and the closest of those
 * three become next-tier items; the rest of the consumed cells and `from`
 * become empty. Any remaining group cells are left untouched. XP is doubled;
 * adjacent locks open around both result cells.
 */
function applyFiveItemMerge(
  data: GameData,
  state: GameState,
  from: CellIndex,
  to: CellIndex,
  group: readonly CellIndex[],
  fromDef: Item,
  mergedInto: Item,
  now: Timestamp,
): ActionResult {
  const others = group
    .filter((cell) => cell !== to)
    .sort((a, b) => {
      const distA = distanceBetween(state.board, to, a);
      const distB = distanceBetween(state.board, to, b);
      return distA !== distB ? distA - distB : a - b;
    });

  const [second, ...toEmpty] = others.slice(0, 3);
  if (second === undefined) {
    throw new Error(
      'applyDrop: five-item merge group has fewer than 3 other cells',
    );
  }

  const generatorDef = data.generators.get(mergedInto.id);
  const makeResultItem = (): BoardItem => ({
    itemId: mergedInto.id,
    cobwebbed: false,
    generator: generatorDef
      ? { charges: generatorDef.charges, cooldownEndsAt: null }
      : null,
  });

  let board = setCell(state.board, from, { kind: 'empty' });
  board = setCell(board, to, { kind: 'item', item: makeResultItem() });
  board = setCell(board, second, { kind: 'item', item: makeResultItem() });
  for (const cell of toEmpty) {
    board = setCell(board, cell, { kind: 'empty' });
  }

  let newState: GameState = { ...state, board };
  const events: GameEvent[] = [
    { type: 'merged', itemId: mergedInto.id, cells: [to, second] },
  ];

  const toLocks = clearAdjacentLocks(newState, to);
  newState = toLocks.state;
  const secondLocks = clearAdjacentLocks(newState, second);
  newState = secondLocks.state;

  const unlocked = [...toLocks.unlocked, ...secondLocks.unlocked].sort(
    (a, b) => a - b,
  );
  if (unlocked.length > 0) {
    events.push({ type: 'cellsUnlocked', cells: unlocked });
  }

  const xpResult = addXp(
    data,
    newState,
    2 * fromDef.tier * data.economy.xpPerMergeTier,
    now,
  );
  newState = xpResult.state;
  events.push(...xpResult.events);

  const discoverResult = discover(data, newState, mergedInto.id);
  newState = discoverResult.state;
  events.push(...discoverResult.events);

  return { ok: true, state: newState, events };
}
