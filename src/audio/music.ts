/**
 * Background music (T12.3): a soft generative loop, one theme per chapter in
 * src/data/music.json. Like the effects it is synthesized, so there are no
 * audio files. A theme is a chord progression, one chord per bar, played as an
 * eighth-note arpeggio over a low pad. The loop picks its theme from the
 * player's chapter at the start of every bar, so a chapter change is heard at
 * the next bar line.
 */

import { z } from 'zod';
import type { GameStore } from '../ui/store';
import type { AudioManager, ToneSpec } from './audioManager';

export interface MusicTheme {
  bpm: number;
  rootHz: number;
  wave: 'sine' | 'triangle' | 'square' | 'sawtooth';
  gain: number;
  /** Which chord tone (index into the chord) each of a bar's eight eighth notes plays. */
  pattern: readonly number[];
  /** One chord per bar, as semitones above the root. */
  progression: readonly (readonly number[])[];
}

export type MusicThemes = Readonly<Record<string, MusicTheme>>;

const themeSchema = z.strictObject({
  bpm: z.number().min(40).max(200),
  rootHz: z.number().min(60).max(1000),
  wave: z.enum(['sine', 'triangle', 'square', 'sawtooth']),
  gain: z.number().min(0).max(0.2),
  pattern: z.array(z.number().int().min(0)).length(8),
  progression: z
    .array(z.array(z.number().int().min(-12).max(36)).min(1))
    .min(1),
});

const musicSchema = z.strictObject({
  themes: z.record(z.string(), themeSchema),
});

/** Validates music.json: a theme per chapter id given, each pattern step naming a real chord tone. */
export function parseMusic(
  raw: unknown,
  chapterIds: readonly string[],
): MusicThemes {
  const result = musicSchema.safeParse(raw);
  if (!result.success) {
    const problems = result.error.issues.map(
      (i) => `${i.path.join('.') || '(root)'}: ${i.message}`,
    );
    throw new Error(`parseMusic:\n${problems.join('\n')}`);
  }
  const problems: string[] = [];
  for (const id of chapterIds) {
    if (!(id in result.data.themes)) problems.push(`themes.${id}: missing`);
  }
  for (const [id, theme] of Object.entries(result.data.themes)) {
    for (const chord of theme.progression) {
      if (theme.pattern.some((step) => step >= chord.length)) {
        problems.push(
          `themes.${id}: a pattern step is past a chord's last tone`,
        );
        break;
      }
    }
  }
  if (problems.length > 0)
    throw new Error(`parseMusic:\n${problems.join('\n')}`);
  return result.data.themes;
}

const hz = (root: number, semitones: number): number =>
  root * 2 ** (semitones / 12);

/** Length of one bar (four beats) in ms. */
export function barMs(theme: MusicTheme): number {
  return (60_000 / theme.bpm) * 4;
}

/**
 * The tones of one bar, with delays inside it: a pad on the chord's root an
 * octave down, held for the bar, and eight arpeggio notes an octave up. Pure: the same bar index always gives the same notes.
 */
export function barTones(theme: MusicTheme, barIndex: number): ToneSpec[] {
  const chord = theme.progression[barIndex % theme.progression.length] ?? [0];
  const eighth = barMs(theme) / 8;
  const tones: ToneSpec[] = [
    {
      freq: hz(theme.rootHz, (chord[0] ?? 0) - 12),
      type: 'sine',
      durationMs: barMs(theme),
      gain: theme.gain * 0.8,
    },
  ];
  theme.pattern.forEach((step, i) => {
    tones.push({
      freq: hz(theme.rootHz, (chord[step] ?? 0) + 12),
      type: theme.wave,
      delayMs: i * eighth,
      durationMs: eighth * 0.9,
      gain: theme.gain,
    });
  });
  return tones;
}

/** The chapter's theme, or the first one when the chapter has none. */
export function themeFor(themes: MusicThemes, chapterId: string): MusicTheme {
  const theme = themes[chapterId] ?? Object.values(themes)[0];
  if (!theme) throw new Error('themeFor: no music themes');
  return theme;
}

/**
 * Plays the loop on the music channel. Each bar is scheduled a little ahead of
 * the previous one's end, so timer jitter doesn't open gaps. Before the first
 * tap (audio not unlocked) bars are dropped by the audio manager, and the loop
 * simply starts at the next bar once it is. Stops scheduling while the tab is
 * hidden. Returns a stop function.
 */
export function startMusic(
  store: GameStore,
  audio: AudioManager,
  themes: MusicThemes,
  isHidden: () => boolean = () => document.hidden,
): () => void {
  let bar = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  const LEAD_MS = 120;

  function next(): void {
    if (stopped) return;
    const theme = themeFor(themes, store.getState().chapterId);
    if (!isHidden()) {
      audio.play(
        barTones(theme, bar).map((t) => ({
          ...t,
          delayMs: (t.delayMs ?? 0) + LEAD_MS,
        })),
        'music',
      );
      bar++;
    }
    timer = setTimeout(next, barMs(theme));
  }
  next();

  return () => {
    stopped = true;
    if (timer !== undefined) clearTimeout(timer);
  };
}
