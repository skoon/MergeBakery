/**
 * Tests for bake-finished notifications (T4.9).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { bakeKey, finishedBakes, startBakeNotifier } from './bakeNotifier';
import { testData, stateWith } from '../core/testing';
import type { Bake, GameState } from '../core/types';
import type { GameStore } from './store';

const croissant = (endsAt: number): Bake => ({
  recipeId: 'bake-croissant',
  startedAt: 0,
  endsAt,
});

function kitchenState(slots: (Bake | null)[][]): GameState {
  return stateWith(
    {},
    {
      kitchen: {
        ovens: slots.map((s, i) => ({
          ovenId: i === 0 ? 'toaster-oven' : 'brick-oven',
          slots: s,
        })),
      },
    },
  );
}

function fakeStore(state: GameState): GameStore {
  return {
    data: testData,
    getState: () => state,
    dispatch: () => {
      throw new Error('not used');
    },
    subscribe: () => () => {},
  };
}

describe('bakeKey', () => {
  it('combines oven, slot and end time', () => {
    expect(bakeKey({ oven: 1, slot: 2 }, croissant(5000))).toBe('1:2:5000');
  });
});

describe('finishedBakes', () => {
  it('lists finished bakes in oven and slot order, skipping running and empty slots', () => {
    const state = kitchenState([[croissant(1000)], [null, croissant(9000)]]);

    expect(finishedBakes(testData, state, 1000, new Set())).toEqual([
      { key: '0:0:1000', recipeName: 'Croissant' },
    ]);
    expect(
      finishedBakes(testData, state, 9000, new Set()).map((b) => b.key),
    ).toEqual(['0:0:1000', '1:1:9000']);
  });

  it('skips bakes already seen', () => {
    const state = kitchenState([[croissant(1000)]]);

    expect(finishedBakes(testData, state, 5000, new Set(['0:0:1000']))).toEqual(
      [],
    );
  });
});

describe('startBakeNotifier', () => {
  let now = 0;
  const clock = (): number => now;

  beforeEach(() => {
    vi.useFakeTimers();
    now = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('notifies once for a bake that finishes while the tab is hidden', () => {
    const notify = vi.fn();
    startBakeNotifier(fakeStore(kitchenState([[croissant(3000)]])), clock, {
      isHidden: () => true,
      notificationsOn: () => true,
      notify,
    });

    now = 2000;
    vi.advanceTimersByTime(2000);
    expect(notify).not.toHaveBeenCalled();

    now = 3000;
    vi.advanceTimersByTime(1000);
    now = 10_000;
    vi.advanceTimersByTime(5000);

    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith('Croissant is ready!');
  });

  it('never notifies for a bake that finished while the tab was visible', () => {
    const notify = vi.fn();
    let hidden = false;
    startBakeNotifier(fakeStore(kitchenState([[croissant(1000)]])), clock, {
      isHidden: () => hidden,
      notificationsOn: () => true,
      notify,
    });

    now = 1000;
    vi.advanceTimersByTime(1000);
    hidden = true;
    now = 5000;
    vi.advanceTimersByTime(4000);

    expect(notify).not.toHaveBeenCalled();
  });

  it('does not notify when notifications are off', () => {
    const notify = vi.fn();
    startBakeNotifier(fakeStore(kitchenState([[croissant(1000)]])), clock, {
      isHidden: () => true,
      notificationsOn: () => false,
      notify,
    });

    now = 5000;
    vi.advanceTimersByTime(5000);

    expect(notify).not.toHaveBeenCalled();
  });

  it('stops checking after stop', () => {
    const notify = vi.fn();
    const stop = startBakeNotifier(
      fakeStore(kitchenState([[croissant(3000)]])),
      clock,
      { isHidden: () => true, notificationsOn: () => true, notify },
    );

    stop();
    now = 5000;
    vi.advanceTimersByTime(5000);

    expect(notify).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
