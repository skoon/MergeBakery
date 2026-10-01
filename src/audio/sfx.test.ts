/**
 * Tests for sound effects (T5.11).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import rawSfx from '../data/sfx.json';
import { parseSfx, soundForEvent, startSfx, type SfxMap } from './sfx';
import type { AudioManager, ToneSpec } from './audioManager';
import { stateWith, testData } from '../core/testing';
import type { Bake, GameEvent, GameState } from '../core/types';
import type { GameStore, StoreListener } from '../ui/store';

const sfx = parseSfx(rawSfx);
const tone = (freq: number): ToneSpec => ({
  freq,
  type: 'sine',
  durationMs: 100,
  gain: 0.2,
});

describe('parseSfx', () => {
  it('parses the real sfx.json with every sound and the chain taps', () => {
    for (const id of [
      'tap',
      'deliver',
      'ovenDone',
      'renovation',
      'sell',
      'collect',
      'discover',
      'levelUp',
      'tap.flour',
      'tap.dairy',
      'tap.egg',
      'tap.sugar',
    ]) {
      expect(sfx[id]?.length, id).toBeGreaterThan(0);
    }
  });

  it('lists every problem in one error', () => {
    const raw = {
      sounds: {
        ...rawSfx.sounds,
        sell: undefined,
        deliver: [],
        whistle: [tone(440)],
        tap: [{ freq: 9000, type: 'sine', durationMs: 5000, gain: 2 }],
      },
    };

    expect(() => parseSfx(raw)).toThrow(/freq|durationMs|gain/);

    let message = '';
    try {
      parseSfx({
        sounds: { ...rawSfx.sounds, deliver: [], whistle: [tone(440)] },
      });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toMatch(/sounds\.deliver: has no tones/);
    expect(message).toMatch(/sounds\.whistle: not a sound id/);

    const withoutSell: Record<string, unknown> = { ...rawSfx.sounds };
    delete withoutSell['sell'];
    expect(() => parseSfx({ sounds: withoutSell })).toThrow(
      /sounds\.sell: missing/,
    );
  });
});

describe('soundForEvent', () => {
  const map: SfxMap = {
    tap: [tone(100)],
    'tap.flour': [tone(101)],
    deliver: [tone(200)],
    ovenDone: [tone(300)],
    renovation: [tone(400)],
    sell: [tone(500)],
    collect: [tone(600)],
    discover: [tone(700)],
    levelUp: [tone(800)],
  };
  const play = (event: GameEvent) =>
    soundForEvent(testData, map, event)?.map((t) => t.freq);

  it('uses the chain tap for a generator spawn, else the plain tap', () => {
    expect(
      play({ type: 'spawned', itemId: 'wheat-stalk', cell: 0, rare: false }),
    ).toEqual([101]);
    expect(
      play({ type: 'spawned', itemId: 'milk-splash', cell: 0, rare: false }),
    ).toEqual([100]);
  });

  it('adds the discovery flourish to a rare drop', () => {
    expect(
      play({ type: 'spawned', itemId: 'energy-jar', cell: 0, rare: true }),
    ).toEqual([100, 700]);
  });

  it('maps each event to its sound', () => {
    expect(
      play({
        type: 'orderDelivered',
        orderId: 1,
        reward: { coins: 1, stars: 1, xp: 1 },
      }),
    ).toEqual([200]);
    expect(play({ type: 'taskCompleted', taskId: 'sweep-cobwebs' })).toEqual([
      400,
    ]);
    expect(play({ type: 'sold', itemId: 'egg', coins: 1 })).toEqual([500]);
    expect(
      play({
        type: 'collected',
        itemId: 'coin-pouch',
        reward: { energy: 0, coins: 25 },
      }),
    ).toEqual([600]);
    expect(play({ type: 'cooldownRushed', cell: 0, gems: 3 })).toEqual([600]);
    expect(play({ type: 'discovered', itemId: 'egg' })).toEqual([700]);
    expect(play({ type: 'levelUp', level: 2, gems: 5 })).toEqual([800]);
  });

  it('gives merges and other events no sound here', () => {
    expect(
      play({ type: 'merged', itemId: 'egg-pair', cells: [0, 1] }),
    ).toBeUndefined();
    expect(play({ type: 'orderArrived', orderId: 3 })).toBeUndefined();
  });
});

describe('startSfx', () => {
  let now = 0;

  beforeEach(() => {
    vi.useFakeTimers();
    now = 0;
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function setup(state: GameState) {
    let listener: StoreListener | null = null;
    const store = {
      data: testData,
      getState: () => state,
      subscribe: (l: StoreListener) => {
        listener = l;
        return () => {
          listener = null;
        };
      },
    } as unknown as GameStore;
    const played: number[][] = [];
    const audio: AudioManager = {
      unlock: vi.fn(),
      setVolumes: vi.fn(),
      play: (tones) => played.push(tones.map((t) => t.freq)),
    };
    const emit = (events: GameEvent[]) => listener?.(state, events);
    return { store, audio, played, emit };
  }

  const bakeEndingAt = (endsAt: number): Bake => ({
    recipeId: 'bake-croissant',
    startedAt: 0,
    endsAt,
  });
  const withBake = (bake: Bake) =>
    stateWith(
      {},
      { kitchen: { ovens: [{ ovenId: 'toaster-oven', slots: [bake] }] } },
    );

  it('plays sounds for store events', () => {
    const { store, audio, played, emit } = setup(stateWith({}));
    startSfx(store, audio, () => now, sfx);

    emit([{ type: 'sold', itemId: 'egg', coins: 1 }]);

    expect(played).toEqual([sfx['sell']?.map((t) => t.freq)]);
  });

  it('dings once when a bake finishes', () => {
    const { store, audio, played } = setup(withBake(bakeEndingAt(3000)));
    startSfx(store, audio, () => now, sfx);

    now = 2000;
    vi.advanceTimersByTime(2000);
    expect(played).toEqual([]);

    now = 3000;
    vi.advanceTimersByTime(1000);
    now = 9000;
    vi.advanceTimersByTime(6000);

    expect(played).toEqual([sfx['ovenDone']?.map((t) => t.freq)]);
  });

  it('does not ding for a bake already done when the game loads', () => {
    now = 5000;
    const { store, audio, played } = setup(withBake(bakeEndingAt(1000)));
    startSfx(store, audio, () => now, sfx);

    vi.advanceTimersByTime(5000);

    expect(played).toEqual([]);
  });

  it('stops', () => {
    const { store, audio, played, emit } = setup(withBake(bakeEndingAt(3000)));
    const stop = startSfx(store, audio, () => now, sfx);

    stop();
    emit([{ type: 'sold', itemId: 'egg', coins: 1 }]);
    now = 9000;
    vi.advanceTimersByTime(9000);

    expect(played).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });
});
