/**
 * Tests for autosave (T4.7).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { startAutosave } from './autosave';
import type { GameState } from '../core/types';
import type { GameStore, StoreListener } from './store';

/** A store stand-in: only getState and subscribe are used. */
function fakeStore(): {
  store: GameStore;
  notify: () => void;
  setState: (state: GameState) => void;
  listenerCount: () => number;
} {
  let state = { marker: 'initial' } as unknown as GameState;
  const listeners: StoreListener[] = [];

  const store = {
    data: {} as GameStore['data'],
    getState: () => state,
    dispatch: () => {
      throw new Error('not used');
    },
    subscribe: (listener: StoreListener) => {
      listeners.push(listener);
      return () => {
        const index = listeners.indexOf(listener);
        if (index !== -1) listeners.splice(index, 1);
      };
    },
  } as unknown as GameStore;

  return {
    store,
    notify: () => {
      for (const listener of [...listeners]) listener(state, []);
    },
    setState: (next: GameState) => {
      state = next;
    },
    listenerCount: () => listeners.length,
  };
}

/** An onHide that hands back the flush so a test can fire it. */
function fakeHide(): {
  onHide: (flush: () => void) => () => void;
  hide: () => void;
  unsubscribed: () => boolean;
} {
  let captured: (() => void) | null = null;
  let unsubscribed = false;

  return {
    onHide: (flush) => {
      captured = flush;
      return () => {
        unsubscribed = true;
      };
    },
    hide: () => {
      if (!captured) throw new Error('onHide was never called');
      captured();
    },
    unsubscribed: () => unsubscribed,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('startAutosave', () => {
  it('saves once, with the latest state, after several quick notifications', () => {
    const { store, notify, setState } = fakeStore();
    const hide = fakeHide();
    const save = vi.fn();

    startAutosave(store, save, { delayMs: 500, onHide: hide.onHide });

    notify();
    vi.advanceTimersByTime(200);
    notify();
    vi.advanceTimersByTime(200);
    setState({ marker: 'latest' } as unknown as GameState);
    notify();

    expect(save).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({ marker: 'latest' });
  });

  it('does not save without a notification', () => {
    const { store } = fakeStore();
    const hide = fakeHide();
    const save = vi.fn();

    startAutosave(store, save, { delayMs: 500, onHide: hide.onHide });
    vi.advanceTimersByTime(5000);

    expect(save).not.toHaveBeenCalled();
  });

  it('flushes at once on hide, and does not save again when the timer would have fired', () => {
    const { store, notify } = fakeStore();
    const hide = fakeHide();
    const save = vi.fn();

    startAutosave(store, save, { delayMs: 500, onHide: hide.onHide });

    notify();
    vi.advanceTimersByTime(100);
    hide.hide();

    expect(save).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1000);

    expect(save).toHaveBeenCalledTimes(1);
  });

  it('does nothing on hide when no save is pending', () => {
    const { store, notify } = fakeStore();
    const hide = fakeHide();
    const save = vi.fn();

    startAutosave(store, save, { delayMs: 500, onHide: hide.onHide });

    hide.hide();
    expect(save).not.toHaveBeenCalled();

    // Still nothing pending right after a completed save.
    notify();
    vi.advanceTimersByTime(500);
    expect(save).toHaveBeenCalledTimes(1);

    hide.hide();
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('stop cancels a pending save and unsubscribes', () => {
    const { store, notify, listenerCount } = fakeStore();
    const hide = fakeHide();
    const save = vi.fn();

    const stop = startAutosave(store, save, {
      delayMs: 500,
      onHide: hide.onHide,
    });

    notify();
    stop();
    vi.advanceTimersByTime(1000);

    expect(save).not.toHaveBeenCalled();
    expect(listenerCount()).toBe(0);
    expect(hide.unsubscribed()).toBe(true);
  });
});
