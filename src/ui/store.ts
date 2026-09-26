/**
 * The UI-facing game store: wraps `Dispatch` with the current time and state,
 * and notifies listeners after a successful action (T2.8).
 */

import type {
  Action,
  ActionResult,
  Dispatch,
  GameData,
  GameEvent,
  GameState,
  Timestamp,
} from '../core/types';

/** An Action without `now`; the store adds it. */
export type ActionInput = Action extends infer A
  ? A extends Action
    ? Omit<A, 'now'>
    : never
  : never;

export type StoreListener = (
  state: GameState,
  events: readonly GameEvent[],
) => void;

export interface GameStore {
  readonly data: GameData;
  getState(): GameState;
  /**
   * Adds now = clock(), runs dispatch, and on ok keeps the new state. Listeners are called,
   * in subscription order, only when the state object changed or events is non-empty.
   * Returns the result so callers can react to a rejection.
   */
  dispatch(action: ActionInput): ActionResult;
  subscribe(listener: StoreListener): () => void;
}

export function createStore(
  data: GameData,
  initial: GameState,
  dispatch: Dispatch,
  clock: () => Timestamp,
): GameStore {
  let state = initial;
  const listeners: StoreListener[] = [];

  return {
    data,

    getState(): GameState {
      return state;
    },

    dispatch(action: ActionInput): ActionResult {
      const now = clock();
      const fullAction = { ...action, now } as Action;

      const previousState = state;
      const result = dispatch(data, previousState, fullAction);

      if (!result.ok) {
        return result;
      }

      state = result.state;

      const stateChanged = state !== previousState;
      if (stateChanged || result.events.length > 0) {
        for (const listener of listeners) {
          listener(state, result.events);
        }
      }

      return result;
    },

    subscribe(listener: StoreListener): () => void {
      listeners.push(listener);
      return () => {
        const index = listeners.indexOf(listener);
        if (index !== -1) {
          listeners.splice(index, 1);
        }
      };
    },
  };
}
