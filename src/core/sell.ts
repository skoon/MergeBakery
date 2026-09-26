/**
 * Selling items (T2.10).
 */

import type {
  ActionResult,
  CellIndex,
  GameData,
  GameState,
  Timestamp,
} from './types';
import { getCell, setCell, nearestEmpty } from './board';

/**
 * Rejects 'locked', 'emptyCell', 'cobwebbed', and 'notSellable' (sellValue 0). Otherwise empties
 * the cell, adds sellValue coins, sets lastSale { item, cell, coins, soldAt: now }, and returns
 * a `sold { itemId, coins }` event.
 */
export function sellItem(
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
  if (item.cobwebbed) {
    return { ok: false, reason: 'cobwebbed' };
  }

  const itemDef = data.items.get(item.itemId);
  if (!itemDef) {
    throw new Error(`sellItem: item ${item.itemId} not found in data`);
  }

  if (itemDef.sellValue === 0) {
    return { ok: false, reason: 'notSellable' };
  }

  const newState: GameState = {
    ...state,
    board: setCell(state.board, cell, { kind: 'empty' }),
    coins: state.coins + itemDef.sellValue,
    lastSale: {
      item,
      cell,
      coins: itemDef.sellValue,
      soldAt: now,
    },
  };

  return {
    ok: true,
    state: newState,
    events: [{ type: 'sold', itemId: item.itemId, coins: itemDef.sellValue }],
  };
}

/**
 * Rejects 'nothingToUndo' when lastSale is null, 'undoExpired' when now − soldAt > sellUndoSec × 1000,
 * 'notEnoughCoins' when the coins were spent, and 'boardFull' when no cell is free. Otherwise puts
 * the item back at lastSale.cell if empty, else nearestEmpty(board, lastSale.cell), subtracts the
 * coins, clears lastSale, and returns `saleUndone { itemId, cell }`.
 */
export function undoSell(
  data: GameData,
  state: GameState,
  now: Timestamp,
): ActionResult {
  if (state.lastSale === null) {
    return { ok: false, reason: 'nothingToUndo' };
  }

  const sellUndoMs = data.economy.sellUndoSec * 1000;
  if (now - state.lastSale.soldAt > sellUndoMs) {
    return { ok: false, reason: 'undoExpired' };
  }

  if (state.coins < state.lastSale.coins) {
    return { ok: false, reason: 'notEnoughCoins' };
  }

  const targetCell = getCell(state.board, state.lastSale.cell);
  let placementCell: CellIndex;

  if (targetCell.kind === 'empty') {
    placementCell = state.lastSale.cell;
  } else {
    const nearest = nearestEmpty(state.board, state.lastSale.cell);
    if (nearest === null) {
      return { ok: false, reason: 'boardFull' };
    }
    placementCell = nearest;
  }

  const newState: GameState = {
    ...state,
    board: setCell(state.board, placementCell, {
      kind: 'item',
      item: state.lastSale.item,
    }),
    coins: state.coins - state.lastSale.coins,
    lastSale: null,
  };

  return {
    ok: true,
    state: newState,
    events: [
      {
        type: 'saleUndone',
        itemId: state.lastSale.item.itemId,
        cell: placementCell,
      },
    ],
  };
}
