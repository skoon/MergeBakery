/**
 * Builds a fresh GameState from the starting board config (T1.8).
 */

import type {
  BoardItem,
  Cell,
  GameData,
  GameState,
  ItemId,
  OvenState,
  Timestamp,
} from './types';

export function createNewGame(
  data: GameData,
  seed: number,
  now: Timestamp,
): GameState {
  const { newGame: config, economy } = data;
  const { cols, rows } = config;
  const cellCount = cols * rows;

  const cells: Cell[] = Array.from({ length: cellCount }, (): Cell => ({
    kind: 'empty',
  }));

  for (const { cell, lock } of config.locks) {
    cells[cell] = { kind: 'locked', lock };
  }

  for (const { cell, itemId, cobwebbed } of config.items) {
    const generatorDef = data.generators.get(itemId);
    const item: BoardItem = {
      itemId,
      cobwebbed,
      generator: generatorDef
        ? { charges: generatorDef.charges, cooldownEndsAt: null }
        : null,
    };
    cells[cell] = { kind: 'item', item };
  }

  const discovered: ItemId[] = [];
  for (const cell of cells) {
    if (cell.kind === 'item' && !discovered.includes(cell.item.itemId)) {
      discovered.push(cell.item.itemId);
    }
  }

  const ovens: OvenState[] = config.ovens.map((ovenId): OvenState => {
    const ovenDef = data.ovens.get(ovenId);
    if (!ovenDef) {
      throw new Error(`createNewGame: unknown oven id "${ovenId}"`);
    }
    return {
      ovenId,
      slots: Array.from({ length: ovenDef.slots }, () => null),
    };
  });

  return {
    board: { cols, rows, cells },
    pantry: { capacity: economy.pantry.startSlots, items: [] },
    energy: { value: economy.energy.cap, updatedAt: now },
    coins: config.coins,
    stars: 0,
    gems: config.gems,
    xp: 0,
    level: 1,
    orders: [],
    nextOrderAt: now,
    kitchen: { ovens },
    lastSale: null,
    discovered,
    pendingDiscoveries: [],
    rewardedChains: [],
    chapterId: config.chapterId,
    completedTasks: [],
    unlockedCustomers: config.unlockedCustomers,
    tutorialStep: 'firstTap',
    rngState: seed >>> 0,
    nextOrderId: 1,
    event: null,
    nextEventAt: null,
    eventResult: null,
    trophies: [],
    reputation: 0,
    staff: [],
  };
}
