/**
 * Catching up after time away (T4.8).
 *
 * Every timer in the game stores a timestamp rather than a countdown, so
 * "catching up" is mostly a matter of reading them against the current clock.
 * Only two things actually need writing back: energy, which accrues in whole
 * periods, and generator charges, which refill lazily and would otherwise stay
 * at zero until the player tapped a generator that is in fact ready.
 *
 * Pure: no storage, no clock of its own.
 */

import { settleEnergy } from './energy';
import type {
  BoardItem,
  Cell,
  GameData,
  GameState,
  RecipeId,
  Timestamp,
} from './types';

export interface AwaySummary {
  awayMs: number;
  energyGained: number;
  /** Recipes whose bakes finished after savedAt and at or before now, in oven and slot order. */
  bakesFinished: RecipeId[];
  /** Generators (board and Pantry) whose cooldown ended while away. */
  generatorsRecharged: number;
}

/** At least a minute away, and something to actually report. */
const MIN_AWAY_MS = 60_000;

const EMPTY_SUMMARY: AwaySummary = {
  awayMs: 0,
  energyGained: 0,
  bakesFinished: [],
  generatorsRecharged: 0,
};

/**
 * Refills one item's generator if its cooldown has ended. Returns the same
 * object when there is nothing to do, so callers can tell whether anything
 * changed by identity.
 */
function rechargeItem(
  data: GameData,
  item: BoardItem,
  now: Timestamp,
): BoardItem {
  const charge = item.generator;
  if (
    !charge ||
    charge.cooldownEndsAt === null ||
    charge.cooldownEndsAt > now
  ) {
    return item;
  }

  const def = data.generators.get(item.itemId);
  if (!def) {
    return item;
  }

  return {
    ...item,
    generator: { charges: def.charges, cooldownEndsAt: null },
  };
}

/**
 * `awayMs` = max(0, now − savedAt). Settles energy, refills every generator on
 * the board or in the Pantry whose `cooldownEndsAt` has passed, and lists the
 * bakes that finished while away. Bakes themselves need no change: done is
 * derived from `endsAt`.
 *
 * A clock earlier than `savedAt` returns the same state and an all-zero
 * summary, so a machine whose clock has been wound back cannot rewind progress.
 */
export function resolveOffline(
  data: GameData,
  state: GameState,
  savedAt: Timestamp,
  now: Timestamp,
): { state: GameState; summary: AwaySummary } {
  if (now < savedAt) {
    return { state, summary: EMPTY_SUMMARY };
  }

  const awayMs = now - savedAt;

  const energy = settleEnergy(data, state.energy, now);
  const energyGained = energy.value - state.energy.value;

  let generatorsRecharged = 0;

  const cells: Cell[] = state.board.cells.map((cell) => {
    if (cell.kind !== 'item') return cell;
    const item = rechargeItem(data, cell.item, now);
    if (item === cell.item) return cell;
    generatorsRecharged++;
    return { kind: 'item', item };
  });

  const pantryItems: BoardItem[] = state.pantry.items.map((item) => {
    const next = rechargeItem(data, item, now);
    if (next !== item) generatorsRecharged++;
    return next;
  });

  const bakesFinished: RecipeId[] = [];
  for (const oven of state.kitchen.ovens) {
    for (const bake of oven.slots) {
      if (bake && bake.endsAt > savedAt && bake.endsAt <= now) {
        bakesFinished.push(bake.recipeId);
      }
    }
  }

  return {
    state: {
      ...state,
      energy,
      board: { ...state.board, cells },
      pantry: { ...state.pantry, items: pantryItems },
    },
    summary: { awayMs, energyGained, bakesFinished, generatorsRecharged },
  };
}

/** True when away at least 60 s and energy was gained, a bake finished, or a generator recharged. */
export function shouldShowAwayCard(summary: AwaySummary): boolean {
  return (
    summary.awayMs >= MIN_AWAY_MS &&
    (summary.energyGained > 0 ||
      summary.bakesFinished.length > 0 ||
      summary.generatorsRecharged > 0)
  );
}
