/**
 * Tapping generators and collecting bonus items (T3.2).
 */

import type {
  ActionResult,
  BoardItem,
  CellIndex,
  GameData,
  GameEvent,
  GameState,
  Rng,
  Timestamp,
} from './types';
import { getCell, nearestEmpty, setCell } from './board';
import { addEnergy, spendEnergy } from './energy';
import { weightedPick } from './rng';
import { discover } from './discovery';

/**
 * Spends energy to tap a generator item, spawning an item at the nearest
 * empty cell. See RejectReason for why a tap can fail.
 */
export function tapGenerator(
  data: GameData,
  state: GameState,
  cell: CellIndex,
  rng: Rng,
  now: Timestamp,
): ActionResult {
  const boardCell = getCell(state.board, cell);

  if (boardCell.kind === 'locked') {
    return { ok: false, reason: 'locked' };
  }
  if (boardCell.kind === 'empty') {
    return { ok: false, reason: 'emptyCell' };
  }

  const tappedItem = boardCell.item;
  const generatorDef = data.generators.get(tappedItem.itemId);
  if (!generatorDef) {
    return { ok: false, reason: 'notAGenerator' };
  }
  if (tappedItem.cobwebbed) {
    return { ok: false, reason: 'cobwebbed' };
  }

  const charge = tappedItem.generator;
  if (!charge) {
    throw new Error(
      `tapGenerator: generator item "${tappedItem.itemId}" has no charge state`,
    );
  }

  let charges = charge.charges;
  if (
    charges === 0 &&
    charge.cooldownEndsAt !== null &&
    now >= charge.cooldownEndsAt
  ) {
    charges = generatorDef.charges;
  }
  if (charges === 0) {
    return { ok: false, reason: 'coolingDown' };
  }

  const targetCell = nearestEmpty(state.board, cell);
  if (targetCell === null) {
    return { ok: false, reason: 'boardFull' };
  }

  const newEnergy = spendEnergy(
    data,
    state.energy,
    data.economy.energy.perTap,
    now,
  );
  if (newEnergy === null) {
    return { ok: false, reason: 'noEnergy' };
  }

  const roll = rng.next();
  const rare = roll * 100 < data.rareDrops.chancePercent;
  const table = rare ? data.rareDrops.table : generatorDef.spawnTable;
  const spawnedItemId = weightedPick(table, rng);

  const spawnedGeneratorDef = data.generators.get(spawnedItemId);
  const spawnedItem: BoardItem = {
    itemId: spawnedItemId,
    cobwebbed: false,
    generator: spawnedGeneratorDef
      ? { charges: spawnedGeneratorDef.charges, cooldownEndsAt: null }
      : null,
  };

  const newCharges = charges - 1;
  const newCooldownEndsAt =
    newCharges === 0 ? now + generatorDef.cooldownSec * 1000 : null;
  const updatedTappedItem: BoardItem = {
    ...tappedItem,
    generator: { charges: newCharges, cooldownEndsAt: newCooldownEndsAt },
  };

  let board = setCell(state.board, targetCell, {
    kind: 'item',
    item: spawnedItem,
  });
  board = setCell(board, cell, { kind: 'item', item: updatedTappedItem });

  let newState: GameState = { ...state, board, energy: newEnergy };

  const events: GameEvent[] = [
    { type: 'spawned', itemId: spawnedItemId, cell: targetCell, rare },
  ];

  const discoverResult = discover(data, newState, spawnedItemId);
  newState = discoverResult.state;
  events.push(...discoverResult.events);

  return { ok: true, state: newState, events };
}

/**
 * Collects a bonus item (energy jar, coin pouch), granting its reward and
 * emptying the cell. See RejectReason for why a collect can fail.
 */
export function collectBonus(
  data: GameData,
  state: GameState,
  cell: CellIndex,
  now: Timestamp,
): ActionResult {
  const boardCell = getCell(state.board, cell);

  if (boardCell.kind === 'locked') {
    return { ok: false, reason: 'locked' };
  }
  if (boardCell.kind === 'empty') {
    return { ok: false, reason: 'emptyCell' };
  }

  const item = boardCell.item;
  const itemDef = data.items.get(item.itemId);
  if (!itemDef) {
    throw new Error(`collectBonus: unknown item id "${item.itemId}"`);
  }

  const reward = itemDef.collectReward;
  if (reward === null) {
    return { ok: false, reason: 'notCollectible' };
  }
  if (item.cobwebbed) {
    return { ok: false, reason: 'cobwebbed' };
  }

  const newEnergy = addEnergy(data, state.energy, reward.energy, now);
  const board = setCell(state.board, cell, { kind: 'empty' });

  const newState: GameState = {
    ...state,
    board,
    energy: newEnergy,
    coins: state.coins + reward.coins,
  };

  return {
    ok: true,
    state: newState,
    events: [{ type: 'collected', itemId: item.itemId, reward }],
  };
}
