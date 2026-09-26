/**
 * Energy management (T3.1).
 *
 * Energy is stored as a value at a moment; regen accrues from `updatedAt`.
 * When spending, advance `updatedAt` by whole regen periods only, so partial
 * progress toward the next point is kept.
 */

import type { GameData, EnergyState, Timestamp } from './types';

/** Energy now. Regen adds 1 per full period since updatedAt, up to cap; a value at or above cap doesn't regen. A clock earlier than updatedAt gives the stored value. */
export function currentEnergy(
  data: GameData,
  energy: EnergyState,
  now: Timestamp,
): number {
  const cap = data.economy.energy.cap;
  const regenMs = data.economy.energy.regenSec * 1000;

  // If value is at or above cap, no regen
  if (energy.value >= cap) {
    return energy.value;
  }

  // If clock goes backwards, return stored value
  if (now < energy.updatedAt) {
    return energy.value;
  }

  // Calculate elapsed time since updatedAt
  const elapsedMs = now - energy.updatedAt;

  // Add 1 per full period
  const pointsGained = Math.floor(elapsedMs / regenMs);
  const result = energy.value + pointsGained;

  // Cap at the economy cap
  return Math.min(result, cap);
}

/**
 * The same energy re-based to `now`. Below cap, updatedAt advances by whole periods only,
 * so partial progress toward the next point is kept. At or above cap, updatedAt becomes now.
 */
export function settleEnergy(
  data: GameData,
  energy: EnergyState,
  now: Timestamp,
): EnergyState {
  const cap = data.economy.energy.cap;
  const regenMs = data.economy.energy.regenSec * 1000;

  // If current value is at or above cap, stop regen
  if (energy.value >= cap) {
    return { value: energy.value, updatedAt: now };
  }

  // If clock goes backwards, no change
  if (now < energy.updatedAt) {
    return energy;
  }

  // Calculate whole periods elapsed
  const elapsedMs = now - energy.updatedAt;
  const wholePeriodsElapsed = Math.floor(elapsedMs / regenMs);

  // Advance updatedAt by whole periods only
  const newUpdatedAt = energy.updatedAt + wholePeriodsElapsed * regenMs;

  // Calculate new value, capping at cap
  const newValue = Math.min(energy.value + wholePeriodsElapsed, cap);

  return { value: newValue, updatedAt: newUpdatedAt };
}

/** Settles, then subtracts amount. Null when there isn't enough. */
export function spendEnergy(
  data: GameData,
  energy: EnergyState,
  amount: number,
  now: Timestamp,
): EnergyState | null {
  const settled = settleEnergy(data, energy, now);

  if (settled.value < amount) {
    return null;
  }

  return { value: settled.value - amount, updatedAt: settled.updatedAt };
}

/** Settles, then adds amount. May go above cap (energy jars). */
export function addEnergy(
  data: GameData,
  energy: EnergyState,
  amount: number,
  now: Timestamp,
): EnergyState {
  const settled = settleEnergy(data, energy, now);
  return { value: settled.value + amount, updatedAt: settled.updatedAt };
}

/** Milliseconds until the next point, between 0 and one period. Null at or above cap. */
export function msToNextEnergy(
  data: GameData,
  energy: EnergyState,
  now: Timestamp,
): number | null {
  const cap = data.economy.energy.cap;
  const regenMs = data.economy.energy.regenSec * 1000;

  // Settle first to get current state
  const settled = settleEnergy(data, energy, now);

  // At or above cap, null
  if (settled.value >= cap) {
    return null;
  }

  // Time until next point
  // Next point happens at: settled.updatedAt + regenMs
  const nextPointAt = settled.updatedAt + regenMs;
  const msUntilNext = nextPointAt - now;

  // Clamp to [0, regenMs]
  return Math.max(0, Math.min(msUntilNext, regenMs));
}
