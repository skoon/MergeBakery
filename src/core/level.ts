/**
 * XP and leveling (T3.8).
 */

import type { GameData, GameEvent, GameState, Timestamp } from './types';

/**
 * The highest level whose xpTotal is at most `xp`, from data.economy.levels.
 */
export function levelForXp(data: GameData, xp: number): number {
  const levels = data.economy.levels;
  for (let i = levels.length - 1; i >= 0; i--) {
    const level = levels[i];
    if (level && level.xpTotal <= xp) {
      return level.level;
    }
  }
  // Should never happen since level 1 has xpTotal 0
  return 1;
}

/**
 * Adds `amount` to state.xp. For each level reached, in order: level + 1, gems + that
 * level's `gems`, energy refilled to max(energy.value, cap) with updatedAt = now, and a
 * `levelUp` event { level, gems }. XP keeps counting past the last level; the level stops
 * there. Throws on a negative amount. Zero returns the same state and no events.
 */
export function addXp(
  data: GameData,
  state: GameState,
  amount: number,
  now: Timestamp,
): { state: GameState; events: GameEvent[] } {
  if (amount < 0) {
    throw new Error('addXp: amount must be non-negative');
  }

  if (amount === 0) {
    return { state, events: [] };
  }

  const newXp = state.xp + amount;
  const levels = data.economy.levels;
  const events: GameEvent[] = [];
  let newLevel = state.level;
  let newGems = state.gems;
  let newEnergy = state.energy;

  // Process level-ups
  for (const levelDef of levels) {
    // Only process levels we haven't reached yet
    if (levelDef.level <= state.level) {
      continue;
    }

    // Stop if we haven't reached this level
    if (newXp < levelDef.xpTotal) {
      break;
    }

    // We've reached this level
    newLevel = levelDef.level;
    newGems += levelDef.gems;

    // Refill energy to max(current energy, cap)
    const energyCap = data.economy.energy.cap;
    newEnergy = {
      value: Math.max(newEnergy.value, energyCap),
      updatedAt: now,
    };

    events.push({
      type: 'levelUp',
      level: levelDef.level,
      gems: levelDef.gems,
    });
  }

  const newState: GameState = {
    ...state,
    xp: newXp,
    level: newLevel,
    gems: newGems,
    energy: newEnergy,
  };

  return { state: newState, events };
}
