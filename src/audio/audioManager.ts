/**
 * Sound through the Web Audio API (T5.10): a music channel and an effects
 * channel, each with its own volume. There are no audio files: effects are
 * synthesized from short oscillator tones.
 *
 * Browsers keep audio muted until the player interacts with the page, so the
 * context is only created in `unlock()`, which main.ts calls from the first
 * tap. Sounds requested before that are dropped rather than queued: a burst of
 * stale sounds on the first tap would be worse than silence.
 */

export interface ToneSpec {
  /** Hz. */
  freq: number;
  type: OscillatorType;
  /** Start, in ms after the call. Default 0. */
  delayMs?: number;
  durationMs: number;
  /** Peak level before the effects volume, 0–1. */
  gain: number;
}

/** The parts of AudioContext this module uses, so tests can pass a fake. */
export type AudioContextLike = Pick<
  AudioContext,
  | 'currentTime'
  | 'destination'
  | 'state'
  | 'resume'
  | 'createOscillator'
  | 'createGain'
>;

export interface AudioManager {
  /**
   * Creates the context on first call and resumes it. Call from a user
   * gesture. Safe to call repeatedly.
   */
  unlock(): void;
  /** Each clamped to 0–1. Before unlock, remembered and applied on unlock. */
  setVolumes(music: number, effects: number): void;
  /**
   * Plays tones on the effects channel, or the music channel when asked.
   * Before unlock, does nothing (sounds are dropped, not queued).
   */
  play(tones: readonly ToneSpec[], channel?: 'effects' | 'music'): void;
}

/** Attack time, so a note never starts with a click. */
const ATTACK_S = 0.005;
/** Exponential ramps can't reach 0; this is inaudible. */
const SILENT = 0.0001;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Defaults: music 0.5, effects 0.8. */
export function createAudioManager(
  makeContext: () => AudioContextLike = () => new AudioContext(),
): AudioManager {
  let context: AudioContextLike | null = null;
  let musicBus: GainNode | null = null;
  let effectsBus: GainNode | null = null;
  let musicVolume = 0.5;
  let effectsVolume = 0.8;

  function applyVolumes(): void {
    if (musicBus) musicBus.gain.value = musicVolume;
    if (effectsBus) effectsBus.gain.value = effectsVolume;
  }

  return {
    unlock() {
      if (!context) {
        context = makeContext();
        musicBus = context.createGain();
        effectsBus = context.createGain();
        musicBus.connect(context.destination);
        effectsBus.connect(context.destination);
        applyVolumes();
      }
      if (context.state === 'suspended') {
        void context.resume();
      }
    },

    setVolumes(music, effects) {
      musicVolume = clamp01(music);
      effectsVolume = clamp01(effects);
      applyVolumes();
    },

    play(tones, channel = 'effects') {
      const bus = channel === 'music' ? musicBus : effectsBus;
      if (!context || !bus) return;

      for (const tone of tones) {
        const start = context.currentTime + (tone.delayMs ?? 0) / 1000;
        const end = start + tone.durationMs / 1000;

        const oscillator = context.createOscillator();
        oscillator.type = tone.type;
        oscillator.frequency.value = tone.freq;

        const envelope = context.createGain();
        envelope.gain.setValueAtTime(SILENT, start);
        envelope.gain.linearRampToValueAtTime(tone.gain, start + ATTACK_S);
        envelope.gain.exponentialRampToValueAtTime(SILENT, end);

        oscillator.connect(envelope);
        envelope.connect(bus);
        oscillator.start(start);
        oscillator.stop(end);
      }
    },
  };
}
