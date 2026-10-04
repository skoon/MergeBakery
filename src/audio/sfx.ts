/**
 * Sound effects (T5.11): which sound each game event makes, defined as
 * synthesized tones in src/data/sfx.json so they can be retuned without code.
 */

import { z } from 'zod';
import type { GameData, GameEvent, Timestamp } from '../core/types';
import { finishedBakes } from '../ui/bakeNotifier';
import type { GameStore } from '../ui/store';
import type { AudioManager, ToneSpec } from './audioManager';

export type SoundId =
  | 'tap' // generator tap: a soft thunk
  | 'deliver' // order complete: a shop bell, then a coin jingle
  | 'ovenDone' // a bake finishes: a kitchen-timer ding
  | 'renovation' // a task completes: a short brass sting
  | 'sell'
  | 'collect' // tapping a bonus item
  | 'discover'
  | 'levelUp'
  | 'eventStart' // a MegaBun event begins: a bright fanfare
  | 'eventWin' // the event is won: a rising flourish
  | 'eventLose' // the event is lost: a gentle, comic descent
  | 'milestone'; // a milestone is claimed

export type SfxMap = Readonly<Record<string, readonly ToneSpec[]>>;

const SOUND_IDS: readonly SoundId[] = [
  'tap',
  'deliver',
  'ovenDone',
  'renovation',
  'sell',
  'collect',
  'discover',
  'levelUp',
  'eventStart',
  'eventWin',
  'eventLose',
  'milestone',
];

const toneSchema = z.strictObject({
  freq: z.number().min(20).max(8000),
  type: z.enum(['sine', 'triangle', 'square', 'sawtooth']),
  delayMs: z.number().min(0).optional(),
  durationMs: z.number().min(1).max(2000),
  gain: z.number().min(0).max(1),
});

const sfxSchema = z.strictObject({
  sounds: z.record(z.string(), z.array(toneSchema)),
});

/**
 * Validates sfx.json: every SoundId present, each list non-empty, frequencies
 * 20–8000 Hz, gains 0–1, durations 1–2000 ms. Keys other than the SoundIds
 * must be per-chain tap variants, "tap.<chainId>". Throws one Error listing
 * every problem.
 */
export function parseSfx(raw: unknown): SfxMap {
  const result = sfxSchema.safeParse(raw);
  const problems: string[] = [];

  if (!result.success) {
    for (const issue of result.error.issues) {
      const path = issue.path.length > 0 ? issue.path.join('.') : '(root)';
      problems.push(`${path}: ${issue.message}`);
    }
    throw new Error(`parseSfx:\n${problems.join('\n')}`);
  }

  const sounds = result.data.sounds;
  for (const id of SOUND_IDS) {
    if (!(id in sounds)) problems.push(`sounds.${id}: missing`);
  }
  for (const [key, tones] of Object.entries(sounds)) {
    if (
      !(SOUND_IDS as readonly string[]).includes(key) &&
      !key.startsWith('tap.')
    ) {
      problems.push(
        `sounds.${key}: not a sound id or a "tap.<chainId>" variant`,
      );
    }
    if (tones.length === 0) problems.push(`sounds.${key}: has no tones`);
  }

  if (problems.length > 0) {
    throw new Error(`parseSfx:\n${problems.join('\n')}`);
  }
  return sounds;
}

/** The tones for an event, or null when it has no sound. Merges are T5.10's chime, not here. */
export function soundForEvent(
  data: GameData,
  sfx: SfxMap,
  event: GameEvent,
): readonly ToneSpec[] | null {
  switch (event.type) {
    case 'spawned': {
      const chainId = data.items.get(event.itemId)?.chainId;
      const tap = (chainId && sfx[`tap.${chainId}`]) || sfx['tap'] || [];
      if (!event.rare) return tap;
      // A rare drop: the tap, then the discovery flourish once it lands.
      const flourish = (sfx['discover'] ?? []).map((tone) => ({
        ...tone,
        delayMs: (tone.delayMs ?? 0) + 120,
      }));
      return [...tap, ...flourish];
    }
    case 'orderDelivered':
      return sfx['deliver'] ?? null;
    case 'taskCompleted':
      return sfx['renovation'] ?? null;
    case 'sold':
    case 'purchased':
      return sfx['sell'] ?? null;
    case 'collected':
    case 'cooldownRushed':
      return sfx['collect'] ?? null;
    case 'discovered':
      return sfx['discover'] ?? null;
    case 'levelUp':
      return sfx['levelUp'] ?? null;
    case 'eventStarted':
      return sfx['eventStart'] ?? null;
    case 'eventEnded':
      return (event.won ? sfx['eventWin'] : sfx['eventLose']) ?? null;
    case 'milestoneClaimed':
      return sfx['milestone'] ?? null;
    default:
      return null;
  }
}

/**
 * Plays soundForEvent for each event after every store notification, and
 * 'ovenDone' when a bake finishes (checked each second, each bake once,
 * whether or not the tab is visible — the browser mutes a hidden tab anyway).
 * Returns a stop function.
 */
export function startSfx(
  store: GameStore,
  audio: AudioManager,
  clock: () => Timestamp,
  sfx: SfxMap,
): () => void {
  const unsubscribe = store.subscribe((_state, events) => {
    for (const event of events) {
      const tones = soundForEvent(store.data, sfx, event);
      if (tones) audio.play(tones);
    }
  });

  // Bakes already done when the game loads were heard (or missed) last time.
  const seen = new Set(
    finishedBakes(store.data, store.getState(), clock(), new Set()).map(
      (b) => b.key,
    ),
  );
  const interval = setInterval(() => {
    const finished = finishedBakes(store.data, store.getState(), clock(), seen);
    for (const bake of finished) seen.add(bake.key);
    if (finished.length > 0) audio.play(sfx['ovenDone'] ?? []);
  }, 1000);

  return () => {
    unsubscribe();
    clearInterval(interval);
  };
}
