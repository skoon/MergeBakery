/**
 * HUD model: data for the top bar display (T3.10).
 * Pure function; no DOM, rendering, or Date.now() calls.
 */

import type { GameData, GameState, Timestamp } from '../core/types';
import { currentEnergy, msToNextEnergy } from '../core/energy';

export interface HudModel {
  energy: number; // currentEnergy
  energyCap: number;
  nextEnergyIn: string | null; // "m:ss" from msToNextEnergy, rounded up to whole seconds; null at or above cap
  coins: number;
  stars: number;
  gems: number;
  level: number;
  /** Progress from this level's xpTotal to the next level's, 0–1; 1 at the last level. */
  levelProgress: number;
}

export function hudModel(
  data: GameData,
  state: GameState,
  now: Timestamp,
): HudModel {
  const energy = currentEnergy(data, state.energy, now);
  const energyCap = data.economy.energy.cap;

  // Get milliseconds to next energy point, or null if at cap
  const msToNext = msToNextEnergy(data, state.energy, now);
  let nextEnergyIn: string | null = null;
  if (msToNext !== null) {
    // Round up to whole seconds
    const secondsRounded = Math.ceil(msToNext / 1000);
    const minutes = Math.floor(secondsRounded / 60);
    const seconds = secondsRounded % 60;
    nextEnergyIn = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  // Calculate level progress
  const levels = data.economy.levels;
  const currentLevelIndex = state.level - 1; // levels are 1-based
  let levelProgress = 0;

  if (currentLevelIndex >= 0 && currentLevelIndex < levels.length) {
    const currentLevelDef = levels[currentLevelIndex]!;
    const isLastLevel = currentLevelIndex === levels.length - 1;

    if (isLastLevel) {
      levelProgress = 1;
    } else {
      const nextLevelDef = levels[currentLevelIndex + 1]!;
      const xpInLevel = state.xp - currentLevelDef.xpTotal;
      const xpNeeded = nextLevelDef.xpTotal - currentLevelDef.xpTotal;
      levelProgress = Math.min(1, Math.max(0, xpInLevel / xpNeeded));
    }
  }

  return {
    energy,
    energyCap,
    nextEnergyIn,
    coins: state.coins,
    stars: state.stars,
    gems: state.gems,
    level: state.level,
    levelProgress,
  };
}
