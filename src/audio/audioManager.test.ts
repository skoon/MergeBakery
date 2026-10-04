/**
 * Tests for the audio manager (T5.10), with a fake AudioContext.
 */

import { describe, it, expect } from 'vitest';
import { createAudioManager, type AudioContextLike } from './audioManager';

interface FakeParam {
  value: number;
  calls: [string, number, number][];
  setValueAtTime(v: number, t: number): void;
  linearRampToValueAtTime(v: number, t: number): void;
  exponentialRampToValueAtTime(v: number, t: number): void;
}

function fakeParam(): FakeParam {
  const param: FakeParam = {
    value: 1,
    calls: [],
    setValueAtTime: (v, t) => param.calls.push(['set', v, t]),
    linearRampToValueAtTime: (v, t) => param.calls.push(['linear', v, t]),
    exponentialRampToValueAtTime: (v, t) => param.calls.push(['exp', v, t]),
  };
  return param;
}

function fakeContext() {
  const oscillators: {
    type: string;
    frequency: { value: number };
    startedAt: number | null;
    stoppedAt: number | null;
  }[] = [];
  const gains: { gain: FakeParam }[] = [];
  let resumed = 0;

  const context = {
    currentTime: 10,
    destination: {},
    state: 'suspended',
    resume: () => {
      resumed++;
      return Promise.resolve();
    },
    createOscillator: () => {
      const osc = {
        type: 'sine',
        frequency: { value: 0 },
        startedAt: null as number | null,
        stoppedAt: null as number | null,
        connect: () => undefined,
        start(t: number) {
          osc.startedAt = t;
        },
        stop(t: number) {
          osc.stoppedAt = t;
        },
      };
      oscillators.push(osc);
      return osc;
    },
    createGain: () => {
      const node = {
        gain: fakeParam(),
        targets: [] as unknown[],
        connect(target: unknown) {
          node.targets.push(target);
        },
      };
      gains.push(node);
      return node;
    },
  };

  return {
    context: context as unknown as AudioContextLike,
    oscillators,
    gains,
    resumed: () => resumed,
  };
}

const TONE = {
  freq: 440,
  type: 'triangle',
  durationMs: 200,
  gain: 0.3,
} as const;

describe('the music channel', () => {
  it('routes music tones to the music bus and the rest to the effects bus', () => {
    const fake = fakeContext();
    const audio = createAudioManager(() => fake.context);
    audio.unlock();
    // The first two gains are the music and effects buses, in that order.
    const [musicBus, effectsBus] = fake.gains;
    const before = fake.gains.length;
    audio.play([TONE], 'music');
    audio.play([TONE]);
    const [musicEnvelope, effectsEnvelope] = fake.gains.slice(
      before,
    ) as unknown as {
      targets: unknown[];
    }[];
    expect(musicEnvelope?.targets).toEqual([musicBus]);
    expect(effectsEnvelope?.targets).toEqual([effectsBus]);
  });
});

describe('createAudioManager', () => {
  it('drops sounds before unlock', () => {
    const fake = fakeContext();
    let created = 0;
    const audio = createAudioManager(() => {
      created++;
      return fake.context;
    });

    audio.play([TONE]);

    expect(created).toBe(0);
    expect(fake.oscillators).toHaveLength(0);
  });

  it('plays one oscillator per tone after unlock', () => {
    const fake = fakeContext();
    const audio = createAudioManager(() => fake.context);
    audio.unlock();

    audio.play([TONE, { ...TONE, freq: 660, delayMs: 250 }]);

    expect(fake.oscillators).toHaveLength(2);
    expect(fake.oscillators[0]).toMatchObject({
      type: 'triangle',
      frequency: { value: 440 },
      startedAt: 10,
      stoppedAt: 10.2,
    });
    expect(fake.oscillators[1]?.frequency.value).toBe(660);
    expect(fake.oscillators[1]?.startedAt).toBeCloseTo(10.25, 9);
  });

  it('shapes each tone to its gain and back to silence', () => {
    const fake = fakeContext();
    const audio = createAudioManager(() => fake.context);
    audio.unlock();

    audio.play([TONE]);

    // gains[0] and [1] are the music and effects channels; [2] is the tone's envelope.
    const calls = fake.gains[2]?.gain.calls ?? [];
    expect(calls.map((c) => c[0])).toEqual(['set', 'linear', 'exp']);
    expect(calls[1]?.[1]).toBe(0.3);
    expect(calls[2]?.[2]).toBeCloseTo(10.2, 9);
  });

  it('clamps volumes and applies them to the channels', () => {
    const fake = fakeContext();
    const audio = createAudioManager(() => fake.context);
    audio.unlock();

    audio.setVolumes(1.5, -0.2);

    expect(fake.gains[0]?.gain.value).toBe(1);
    expect(fake.gains[1]?.gain.value).toBe(0);
  });

  it('applies volumes set before unlock, and the defaults otherwise', () => {
    const early = fakeContext();
    const audio = createAudioManager(() => early.context);
    audio.setVolumes(0.2, 0.4);
    audio.unlock();
    expect(early.gains[0]?.gain.value).toBe(0.2);
    expect(early.gains[1]?.gain.value).toBe(0.4);

    const defaults = fakeContext();
    createAudioManager(() => defaults.context).unlock();
    expect(defaults.gains[0]?.gain.value).toBe(0.5);
    expect(defaults.gains[1]?.gain.value).toBe(0.8);
  });

  it('creates one context however many times it unlocks', () => {
    const fake = fakeContext();
    let created = 0;
    const audio = createAudioManager(() => {
      created++;
      return fake.context;
    });

    audio.unlock();
    audio.unlock();

    expect(created).toBe(1);
    expect(fake.resumed()).toBe(2);
  });
});
