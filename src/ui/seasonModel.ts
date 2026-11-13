/**
 * Season display data (T14.8): the top-bar button, the invitation, the season
 * sheet, the result card and the running season's theme. Pure; no DOM and no
 * clock of its own.
 */

import { bakeDurationMs } from '../core/kitchen';
import { missingInputs } from '../core/orders';
import { runningSeason } from '../core/seasons';
import type {
  ChainId,
  GameData,
  GameState,
  Item,
  ItemId,
  LoadedSeason,
  RecipeId,
  SeasonDef,
  SeasonId,
  SeasonReward,
  Timestamp,
} from '../core/types';
import type { MusicTheme } from '../audio/music';
import type { SeasonTheme } from '../seasons/pack';
import { formatTimeLeft } from './eventModel';
import { formatDuration, timingOven } from './kitchenModel';
import type { KeyValueStorage } from './saveStorage';

export type SeasonThemes = ReadonlyMap<SeasonId, SeasonTheme>;

/** The season the player could join now: its window open, the tutorial done, and no season joined. */
export function joinableSeason(
  data: GameData,
  state: GameState,
  now: Timestamp,
): LoadedSeason | null {
  if (state.tutorialStep !== 'done' || state.season !== null) return null;
  for (const season of data.seasons.values()) {
    if (season.startsAt <= now && now < season.endsAt) return season;
  }
  return null;
}

/** Milestones the joined season has reached but not claimed. */
function claimable(def: SeasonDef, state: GameState): number {
  const active = state.season;
  if (!active) return 0;
  return def.milestones.filter(
    (m, i) =>
      m.points <= active.points && !active.claimedMilestones.includes(i),
  ).length;
}

export interface SeasonButtonModel {
  readonly seasonId: SeasonId;
  readonly name: string;
  /** 'offer': open to join; 'joined': the player is in it. */
  readonly kind: 'offer' | 'joined';
  /** "2 d 4 h" until the window closes. */
  readonly timeLeft: string;
  /** Milestones ready to claim, for the badge. */
  readonly claimable: number;
  readonly label: string;
}

/** The top-bar button; null when there is no season to show. */
export function seasonButton(
  data: GameData,
  state: GameState,
  now: Timestamp,
): SeasonButtonModel | null {
  const active = state.season;
  const joined = active ? data.seasons.get(active.seasonId) : undefined;
  if (active && joined) {
    const ready = claimable(joined.def, state);
    const timeLeft = formatTimeLeft(active.endsAt - now);
    return {
      seasonId: joined.def.id,
      name: joined.def.name,
      kind: 'joined',
      timeLeft,
      claimable: ready,
      label:
        `${joined.def.name}, ${timeLeft} left` +
        (ready > 0 ? `, ${ready.toString()} reward ready` : ''),
    };
  }
  const open = joinableSeason(data, state, now);
  if (!open) return null;
  return {
    seasonId: open.def.id,
    name: open.def.name,
    kind: 'offer',
    timeLeft: formatTimeLeft(open.endsAt - now),
    claimable: 0,
    label: `New season: ${open.def.name}`,
  };
}

// ─── Invitation ──────────────────────────────────────────────────────────────

/** One run of a season: next year's run of the same season invites again. */
export function inviteKey(season: LoadedSeason): string {
  return `${season.def.id}@${season.endsAt.toString()}`;
}

export function invitationText(
  def: SeasonDef,
  theme: SeasonTheme | undefined,
): string {
  return (
    theme?.invitation ??
    `${def.name} has come to town! Join to bake its recipes, fill its orders, and earn keepsakes that stay on your shelf for good.`
  );
}

export const INVITES_KEY = 'rise-and-shine-season-invites';

/** Which season runs have shown their invitation, kept in localStorage. */
export interface InviteMemory {
  seen(key: string): boolean;
  markSeen(key: string): void;
}

/**
 * Reads the seen list once. Unreadable or broken storage logs with
 * console.error and counts as nothing seen, so the card shows again rather
 * than never.
 */
export function createInviteMemory(storage: KeyValueStorage): InviteMemory {
  let seen: string[] = [];
  try {
    const text = storage.getItem(INVITES_KEY);
    if (text !== null) {
      const parsed: unknown = JSON.parse(text);
      if (
        !Array.isArray(parsed) ||
        !parsed.every((k): k is string => typeof k === 'string')
      ) {
        throw new Error(`${INVITES_KEY} is not a list of strings`);
      }
      seen = parsed;
    }
  } catch (error) {
    console.error('Season invitations: could not read what was seen', error);
  }
  return {
    seen: (key) => seen.includes(key),
    markSeen(key) {
      if (seen.includes(key)) return;
      seen = [...seen, key];
      try {
        storage.setItem(INVITES_KEY, JSON.stringify(seen));
      } catch (error) {
        console.error('Season invitations: could not save', error);
      }
    },
  };
}

// ─── Sheet ───────────────────────────────────────────────────────────────────

export interface SeasonMilestoneView {
  readonly index: number;
  readonly points: number;
  /** "50 coins, 5 gems, Harvest Wreath (keepsake)". */
  readonly rewardText: string;
  readonly status: 'claimed' | 'ready' | 'locked';
}

export interface SeasonRecipeInputView {
  readonly itemId: ItemId;
  readonly name: string;
  readonly spriteKey: string;
  /**
   * False when the player can't get it now; shown dimmed. Before the season
   * starts, what its generator spawns counts as available.
   */
  readonly available: boolean;
}

/** One of the season's recipes (T14.11), looking like a Kitchen sheet recipe. */
export interface SeasonRecipeView {
  readonly recipeId: RecipeId;
  readonly name: string;
  readonly outputSpriteKey: string;
  /** formatDuration of the bake, timed as the Kitchen sheet times it. */
  readonly bakeTime: string;
  readonly inputs: readonly SeasonRecipeInputView[];
  /** "Needs a Hen Coop" when an input can't be had now; null when the recipe is available. */
  readonly needs: string | null;
}

export interface SeasonSheetModel {
  readonly seasonId: SeasonId;
  readonly name: string;
  readonly status: 'offer' | 'waiting' | 'running';
  readonly timeLeft: string;
  /** The invitation, why it hasn't started, or how to play. */
  readonly text: string;
  readonly points: number;
  /** The season's recipes, in data order, in every status. */
  readonly recipes: readonly SeasonRecipeView[];
  readonly milestones: readonly SeasonMilestoneView[];
}

function rewardText(def: SeasonDef, reward: SeasonReward): string {
  const parts: string[] = [];
  if (reward.coins > 0) parts.push(`${reward.coins.toString()} coins`);
  if (reward.gems > 0) parts.push(`${reward.gems.toString()} gems`);
  const keepsake = def.keepsakes.find((k) => k.id === reward.keepsakeId);
  if (keepsake) parts.push(`${keepsake.name} (keepsake)`);
  return parts.join(', ');
}

/**
 * Where an input comes from: the lowest-tier generator whose spawn table holds
 * its chain, or the input itself when no generator spawns it.
 */
function sourceName(data: GameData, itemId: ItemId): string {
  const item = data.items.get(itemId);
  if (!item) throw new Error(`seasonSheet: unknown item id "${itemId}"`);
  let source: Item | null = null;
  for (const generator of data.generators.values()) {
    const generatorItem = data.items.get(generator.itemId);
    const spawnsChain = generator.spawnTable.some(
      (entry) => data.items.get(entry.itemId)?.chainId === item.chainId,
    );
    if (
      generatorItem &&
      spawnsChain &&
      (source === null || generatorItem.tier < source.tier)
    ) {
      source = generatorItem;
    }
  }
  return source?.name ?? item.name;
}

function withArticle(name: string): string {
  return `${/^[aeiou]/i.test(name) ? 'an' : 'a'} ${name}`;
}

/** "a", "a and b", "a, b and c". */
function andList(parts: readonly string[]): string {
  return parts.length < 2
    ? parts.join('')
    : `${parts.slice(0, -1).join(', ')} and ${parts.slice(-1).join('')}`;
}

/**
 * Chains the season's generator spawns, while the season hasn't started: it
 * arrives when the season starts, so its items aren't shown as missing.
 */
function comingWithSeason(
  data: GameData,
  state: GameState,
  def: SeasonDef,
): Set<ChainId> {
  const chains = new Set<ChainId>();
  if (runningSeason(data, state)?.def.id === def.id) return chains;
  const generator = data.generators.get(def.generatorItemId);
  if (!generator) {
    throw new Error(
      `seasonSheet: season "${def.id}" has no generator "${def.generatorItemId}"`,
    );
  }
  for (const entry of generator.spawnTable) {
    const item = data.items.get(entry.itemId);
    if (item) chains.add(item.chainId);
  }
  return chains;
}

function seasonRecipes(
  data: GameData,
  state: GameState,
  def: SeasonDef,
): SeasonRecipeView[] {
  const oven = timingOven(state);
  const coming = comingWithSeason(data, state, def);
  return [...data.recipes.values()]
    .filter((recipe) => recipe.seasonId === def.id)
    .map((recipe) => {
      const missing = missingInputs(data, state, recipe).filter((id) => {
        const chainId = data.items.get(id)?.chainId;
        return chainId === undefined || !coming.has(chainId);
      });
      const sources = [...new Set(missing.map((id) => sourceName(data, id)))];
      return {
        recipeId: recipe.id,
        name: recipe.name,
        outputSpriteKey:
          data.items.get(recipe.output)?.spriteKey ?? recipe.output,
        bakeTime: formatDuration(bakeDurationMs(data, recipe.id, oven, state)),
        inputs: recipe.inputs.map((itemId) => {
          const item = data.items.get(itemId);
          return {
            itemId,
            name: item?.name ?? itemId,
            spriteKey: item?.spriteKey ?? itemId,
            available: !missing.includes(itemId),
          };
        }),
        needs:
          sources.length === 0
            ? null
            : `Needs ${andList(sources.map(withArticle))}`,
      };
    });
}

/** The season sheet for the button's season; null when there is no button. */
export function seasonSheet(
  data: GameData,
  state: GameState,
  now: Timestamp,
  themes: SeasonThemes,
): SeasonSheetModel | null {
  const button = seasonButton(data, state, now);
  const loaded = button && data.seasons.get(button.seasonId);
  if (!button || !loaded) return null;
  const { def } = loaded;
  const active = state.season;
  const generator = data.items.get(def.generatorItemId)?.name ?? 'generator';

  let status: SeasonSheetModel['status'];
  let text: string;
  if (!active) {
    status = 'offer';
    text = invitationText(def, themes.get(def.id));
  } else if (active.startedAt === null) {
    status = 'waiting';
    text =
      state.event !== null
        ? `${def.name} starts when the MegaBun event ends.`
        : `${def.name} starts once there's room on the board or in the Pantry for the ${generator}.`;
  } else {
    status = 'running';
    text = `Tap the ${generator} and merge what it makes, and bake the season's recipes. Deliver the orders with a dashed border to earn Season Points, then claim your rewards here.`;
  }

  const points = active?.points ?? 0;
  return {
    seasonId: def.id,
    name: def.name,
    status,
    timeLeft: button.timeLeft,
    text,
    points,
    recipes: seasonRecipes(data, state, def),
    milestones: def.milestones.map((m, index) => ({
      index,
      points: m.points,
      rewardText: rewardText(def, m.reward),
      status: active?.claimedMilestones.includes(index)
        ? 'claimed'
        : active && points >= m.points
          ? 'ready'
          : 'locked',
    })),
  };
}

// ─── Result card ─────────────────────────────────────────────────────────────

/** The result card's text; null when there is no result to show. */
export function seasonResultView(
  data: GameData,
  state: GameState,
): { title: string; lines: string[] } | null {
  const result = state.seasonResult;
  if (!result) return null;
  const name = data.seasons.get(result.seasonId)?.def.name ?? 'The season';
  const lines = [`Season Points: ${result.points.toString()}`];
  if (result.coins > 0) {
    lines.push(`Seasonal items sold for ${result.coins.toString()} coins`);
  }
  const mine = state.keepsakes.filter((k) => k.seasonId === result.seasonId);
  const year = Math.max(...mine.map((k) => k.year));
  const earned = mine.filter((k) => k.year === year).map((k) => k.name);
  if (earned.length > 0) {
    lines.push(`Keepsakes for your shelf: ${earned.join(', ')}`);
  }
  return { title: `${name} is over`, lines };
}

// ─── Theme ───────────────────────────────────────────────────────────────────

/** The running season's token overrides; empty when no season runs. */
export function seasonTokens(
  data: GameData,
  state: GameState,
  themes: SeasonThemes,
): Readonly<Record<string, string>> {
  const running = runningSeason(data, state);
  return (running && themes.get(running.def.id)?.tokens) ?? {};
}

/** The running season's music; null when no season runs or it has none. */
export function seasonMusic(
  data: GameData,
  state: GameState,
  themes: SeasonThemes,
): MusicTheme | null {
  const running = runningSeason(data, state);
  return (running && themes.get(running.def.id)?.music) ?? null;
}
