/**
 * Dev-only console helpers for testing in a browser without grinding.
 * Loaded from main.ts only when `import.meta.env.DEV`, so production builds
 * never include it.
 *
 *   bakery.give('dough-ball', 'butter-block')  put items on the board
 *   bakery.away(90)                            pretend 90 minutes passed
 *   bakery.stars(200)                          set the star count
 *   bakery.event()                             start an event on the next tick
 *   bakery.reset()                             delete the save, start over
 *
 * Each one writes a save and reloads, so it goes through the real load path:
 * readSave, migrate, resolveOffline and the away card all run as they would
 * for a player.
 */

import { nearestEmpty, setCell } from '../core/board';
import type { BoardItem, GameData, GameState, ItemId } from '../core/types';
import { SAVE_KEY, writeSave } from './saveStorage';
import type { GameStore } from './store';

/**
 * Places each item on the empty cell nearest the board's middle. Generators
 * get full charges. Throws on an unknown id or when the board fills up.
 */
export function giveItems(
  data: GameData,
  state: GameState,
  itemIds: readonly ItemId[],
): GameState {
  const middle = Math.floor(state.board.cells.length / 2);
  let board = state.board;

  for (const itemId of itemIds) {
    if (!data.items.has(itemId)) {
      throw new Error(`giveItems: unknown item "${itemId}"`);
    }
    const cell = nearestEmpty(board, middle);
    if (cell === null) {
      throw new Error(`giveItems: the board is full, "${itemId}" didn't fit`);
    }
    const generator = data.generators.get(itemId);
    const item: BoardItem = {
      itemId,
      cobwebbed: false,
      generator: generator
        ? { charges: generator.charges, cooldownEndsAt: null }
        : null,
    };
    board = setCell(board, cell, { kind: 'item', item });
  }

  return { ...state, board };
}

function shiftItem(item: BoardItem, ms: number): BoardItem {
  const charge = item.generator;
  if (!charge || charge.cooldownEndsAt === null) return item;
  return {
    ...item,
    generator: { ...charge, cooldownEndsAt: charge.cooldownEndsAt - ms },
  };
}

/**
 * Moves every timestamp in the state `ms` into the past. Saved with a
 * `savedAt` that far back too, the state loads exactly as if the player had
 * closed the game `ms` ago.
 */
export function rewindState(state: GameState, ms: number): GameState {
  return {
    ...state,
    energy: { ...state.energy, updatedAt: state.energy.updatedAt - ms },
    board: {
      ...state.board,
      cells: state.board.cells.map((cell) =>
        cell.kind === 'item'
          ? { kind: 'item', item: shiftItem(cell.item, ms) }
          : cell,
      ),
    },
    pantry: {
      ...state.pantry,
      items: state.pantry.items.map((item) => shiftItem(item, ms)),
    },
    kitchen: {
      ovens: state.kitchen.ovens.map((oven) => ({
        ...oven,
        slots: oven.slots.map((bake) =>
          bake
            ? {
                ...bake,
                startedAt: bake.startedAt - ms,
                endsAt: bake.endsAt - ms,
              }
            : null,
        ),
      })),
    },
    nextOrderAt: state.nextOrderAt === null ? null : state.nextOrderAt - ms,
    lastSale: state.lastSale
      ? { ...state.lastSale, soldAt: state.lastSale.soldAt - ms }
      : null,
    event: state.event
      ? {
          ...state.event,
          startedAt: state.event.startedAt - ms,
          endsAt: state.event.endsAt - ms,
        }
      : null,
    nextEventAt: state.nextEventAt === null ? null : state.nextEventAt - ms,
  };
}

export function installDevTools(
  store: GameStore,
  stopAutosave: () => void,
): void {
  /** Autosave would flush the old state over ours on pagehide, so stop it first. */
  function saveAndReload(state: GameState, savedAt: number): void {
    stopAutosave();
    writeSave(localStorage, state, savedAt);
    location.reload();
  }

  const tools = {
    give(...itemIds: ItemId[]): void {
      saveAndReload(
        giveItems(store.data, store.getState(), itemIds),
        Date.now(),
      );
    },
    stars(n: number): void {
      saveAndReload({ ...store.getState(), stars: n }, Date.now());
    },
    /** Moves to the first event's chapter and makes it due now. */
    event(): void {
      const first = [...store.data.events.values()][0];
      saveAndReload(
        {
          ...store.getState(),
          chapterId: first?.minChapter ?? store.getState().chapterId,
          nextEventAt: 0,
        },
        Date.now(),
      );
    },
    away(minutes: number): void {
      const ms = minutes * 60_000;
      saveAndReload(rewindState(store.getState(), ms), Date.now() - ms);
    },
    reset(): void {
      stopAutosave();
      localStorage.removeItem(SAVE_KEY);
      location.reload();
    },
  };

  Object.assign(window, { bakery: tools });
  console.info(
    "Dev tools: bakery.give('dough-ball', 'butter-block'), bakery.stars(200), bakery.away(90), bakery.event(), bakery.reset()",
  );
}
