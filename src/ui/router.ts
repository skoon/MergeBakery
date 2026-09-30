/**
 * Which screen is showing: the board, or one of the full-height screens the
 * nav bar opens (T5.8). No DOM; navBar.ts draws it.
 */

export type ScreenId = 'board' | 'recipeBook' | 'bakery' | 'shop' | 'settings';

export interface Router {
  current(): ScreenId;
  /** Shows a screen. Showing the current screen does nothing and notifies no one. */
  show(id: ScreenId): void;
  /** Same as show('board'). */
  back(): void;
  /** Called after every change, with the new screen. Returns an unsubscribe function. */
  subscribe(listener: (id: ScreenId) => void): () => void;
}

/** Starts on 'board'. */
export function createRouter(): Router {
  let current: ScreenId = 'board';
  const listeners = new Set<(id: ScreenId) => void>();

  function show(id: ScreenId): void {
    if (id === current) return;
    current = id;
    for (const listener of [...listeners]) listener(id);
  }

  return {
    current: () => current,
    show,
    back: () => {
      show('board');
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
