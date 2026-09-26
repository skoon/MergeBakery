/**
 * Seeded random number generator (mulberry32) and weighted picker (T1.9).
 */

import type { ItemId, Rng, WeightedEntry } from './types';

/**
 * Create a seeded random number generator using mulberry32.
 * The sequence is deterministic: createRng(seed) will produce the same
 * sequence every time. You can save and resume the sequence via getState().
 */
export function createRng(seed: number): Rng {
  let a = seed;

  return {
    next(): number {
      // Update the state: a = (a + 0x6d2b79f5) | 0
      a = (a + 0x6d2b79f5) | 0;

      // Standard mulberry32 mixing
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },

    getState(): number {
      return a >>> 0;
    },
  };
}

/**
 * Pick one item from a weighted table using the given RNG.
 * Calls rng.next() exactly once to pick.
 *
 * @throws Error if the table is empty, any weight is negative, or total weight is 0.
 */
export function weightedPick(
  table: readonly WeightedEntry[],
  rng: Rng,
): ItemId {
  // Validate table
  if (table.length === 0) {
    throw new Error('weightedPick: table is empty');
  }

  // Calculate total weight and validate entries
  let total = 0;
  for (const entry of table) {
    if (entry.weight < 0) {
      throw new Error(
        `weightedPick: negative weight ${entry.weight} for item ${entry.itemId}`,
      );
    }
    total += entry.weight;
  }

  if (total === 0) {
    throw new Error('weightedPick: total weight is 0');
  }

  // Generate one random value and find the entry
  const random = rng.next() * total;
  let cumulative = 0;

  for (const entry of table) {
    cumulative += entry.weight;
    if (random < cumulative) {
      return entry.itemId;
    }
  }

  // cumulative ends equal to total and next() < 1, so this only happens with a broken Rng.
  throw new Error(
    `weightedPick: rng.next() returned ${random / total}, outside [0, 1)`,
  );
}
