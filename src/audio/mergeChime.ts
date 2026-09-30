/**
 * The merge chime (T5.10): a marimba-like note that climbs the C major scale
 * with the merged item's tier, so a bigger merge sounds like a step up.
 */

import type { GameStore } from '../ui/store';
import type { AudioManager, ToneSpec } from './audioManager';

/** C5, from A4 = 440 Hz. */
const C5 = 440 * 2 ** (3 / 12);
/** Semitones above the octave's C for each step of the major scale. */
const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];

/**
 * Tier 1 is C5 (523.25 Hz); each tier climbs one step of the C major scale
 * (C D E F G A B C), so tier 8 is C6 and tier 9 is D6. Throws for a tier below 1.
 */
export function mergeNoteHz(tier: number): number {
  if (!Number.isInteger(tier) || tier < 1) {
    throw new RangeError(
      `mergeNoteHz: tier must be 1 or more, got ${tier.toString()}`,
    );
  }
  const step = tier - 1;
  const octave = Math.floor(step / MAJOR_SCALE.length);
  const semitones = (MAJOR_SCALE[step % MAJOR_SCALE.length] ?? 0) + 12 * octave;
  return C5 * 2 ** (semitones / 12);
}

/** A short marimba-like note: a sine at the tier's pitch, 180 ms, plus a quiet octave above. */
export function mergeChimeTones(tier: number): ToneSpec[] {
  const freq = mergeNoteHz(tier);
  return [
    { freq, type: 'sine', durationMs: 180, gain: 0.35 },
    { freq: freq * 2, type: 'sine', durationMs: 110, gain: 0.08 },
  ];
}

/** Plays the chime for every `merged` event, using the merged item's tier. Returns unsubscribe. */
export function startMergeChime(
  store: GameStore,
  audio: AudioManager,
): () => void {
  return store.subscribe((_state, events) => {
    for (const event of events) {
      if (event.type !== 'merged') continue;
      const tier = store.data.items.get(event.itemId)?.tier;
      if (tier !== undefined) {
        audio.play(mergeChimeTones(tier));
      }
    }
  });
}
