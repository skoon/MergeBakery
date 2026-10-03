/**
 * What the Staff panel shows (T10.4). Pure, no DOM.
 */

import type {
  ChainId,
  GameData,
  GameState,
  StaffId,
  StaffRole,
} from '../core/types';
import { formatTimeLeft } from './eventModel';
import { recipeAvailable } from './kitchenModel';

export interface ChainOption {
  chainId: ChainId;
  name: string;
}

export interface RecipeOption {
  recipeId: string;
  name: string;
}

export interface StaffRow {
  staffId: StaffId;
  name: string;
  role: StaffRole;
  portraitKey: string;
  /** One line on what they do, e.g. "Taps every 5 min" or "Bakes 20% faster". */
  blurb: string;
  hired: boolean;
  /** Not yet hired: why the button is off, or null when it can be pressed. */
  hireBlocked: string | null;
  hireCost: number;
  /** A hired tapper's chain; null when resting. */
  assignedChain: ChainId | null;
  /** Generator chains a tapper can be pointed at: those with a generator on the board. */
  chainOptions: ChainOption[];
  /** An Auto-Oven's recipe; null when resting. */
  assignedRecipe: string | null;
  /** Recipes an Auto-Oven can loop: those whose inputs the player can get. */
  recipeOptions: RecipeOption[];
}

export interface StaffModel {
  reputation: number;
  /** Everyone whose chapter the player has reached, hired or not, in data order. */
  rows: StaffRow[];
}

/** Generator chains on the board that aren't an event's (those vanish when the event ends). */
function boardGeneratorChains(data: GameData, state: GameState): ChainOption[] {
  const eventGenerators = new Set(
    [...data.events.values()].map((e) => e.generatorItemId),
  );
  const seen = new Set<ChainId>();
  const options: ChainOption[] = [];
  for (const cell of state.board.cells) {
    if (cell.kind !== 'item' || !cell.item.generator) continue;
    if (eventGenerators.has(cell.item.itemId)) continue;
    const chainId = data.items.get(cell.item.itemId)?.chainId;
    const chain = chainId === undefined ? undefined : data.chains.get(chainId);
    if (!chain || seen.has(chain.id)) continue;
    seen.add(chain.id);
    options.push({ chainId: chain.id, name: chain.name });
  }
  return options;
}

export function staffModel(data: GameData, state: GameState): StaffModel {
  const chapterIds = [...data.chapters.keys()];
  const reached = chapterIds.indexOf(state.chapterId);
  const options = boardGeneratorChains(data, state);

  const rows: StaffRow[] = [];
  for (const def of data.staff.values()) {
    if (chapterIds.indexOf(def.minChapter) > reached) continue;
    const hired = state.staff.find((s) => s.staffId === def.id);

    let hireBlocked: string | null = null;
    if (!hired) {
      if (state.reputation < def.minReputation) {
        hireBlocked = `Needs ${def.minReputation.toString()} reputation`;
      } else if (state.coins < def.hireCost) {
        hireBlocked = `Needs ${(def.hireCost - state.coins).toString()} more coins`;
      }
    }

    rows.push({
      staffId: def.id,
      name: def.name,
      role: def.role,
      portraitKey: def.portraitKey,
      blurb:
        def.role === 'tapper'
          ? `Taps a generator every ${formatTimeLeft((def.intervalSec ?? 0) * 1000)}, no energy`
          : def.role === 'oven'
            ? `Collects and reloads a recipe every ${formatTimeLeft((def.intervalSec ?? 0) * 1000)}`
            : `Bakes ${Math.round((1 - (def.bakeTimeMultiplier ?? 1)) * 100).toString()}% faster`,
      hired: hired !== undefined,
      hireBlocked,
      hireCost: def.hireCost,
      assignedChain: hired?.assignedChain ?? null,
      chainOptions: def.role === 'tapper' ? options : [],
      assignedRecipe: hired?.assignedRecipe ?? null,
      recipeOptions:
        def.role === 'oven'
          ? [...data.recipes.values()]
              .filter((r) => recipeAvailable(data, state, r))
              .map((r) => ({ recipeId: r.id, name: r.name }))
          : [],
    });
  }
  return { reputation: state.reputation, rows };
}
