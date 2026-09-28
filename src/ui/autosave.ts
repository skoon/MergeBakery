/**
 * Autosave (T4.7).
 *
 * Saving on every action would write dozens of times during a merge streak, so
 * each store notification restarts a short timer and only the last one writes.
 * A page that is hidden or unloaded may never get that timer, so `onHide`
 * flushes whatever is pending first.
 */

import type { GameState } from '../core/types';
import type { GameStore } from './store';

export interface AutosaveOptions {
  /** Delay after the last store notification before saving. */
  delayMs: number;
  /** Calls flush when the page is hidden or unloaded; returns an unsubscribe function. */
  onHide: (flush: () => void) => () => void;
}

/**
 * Subscribes to the store. Each notification (re)starts a `delayMs` timer; when
 * it fires, calls `save(store.getState())`. `onHide`'s flush saves at once if a
 * save is pending (and cancels the timer). Returns a stop function that
 * unsubscribes and cancels the timer.
 */
export function startAutosave(
  store: GameStore,
  save: (state: GameState) => void,
  options: AutosaveOptions,
): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;

  function cancel(): void {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function saveNow(): void {
    cancel();
    save(store.getState());
  }

  const unsubscribeStore = store.subscribe(() => {
    cancel();
    timer = setTimeout(saveNow, options.delayMs);
  });

  const unsubscribeHide = options.onHide(() => {
    // Nothing pending means nothing has changed since the last save.
    if (timer !== null) {
      saveNow();
    }
  });

  return () => {
    cancel();
    unsubscribeStore();
    unsubscribeHide();
  };
}

/**
 * The browser's "the page is going away" signals. `visibilitychange` covers a
 * backgrounded tab and, on mobile, the app being swapped out; `pagehide` covers
 * a real unload. Either may be the last moment the page gets to run.
 */
export function onPageHide(flush: () => void): () => void {
  const onVisibilityChange = (): void => {
    if (document.visibilityState === 'hidden') {
      flush();
    }
  };

  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('pagehide', flush);

  return () => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('pagehide', flush);
  };
}
