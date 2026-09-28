/**
 * Bake-finished notifications (T4.9).
 *
 * Polls rather than scheduling a timer per bake: the store holds only
 * timestamps, and a hidden tab's timers are throttled anyway, so checking once
 * a second is both simpler and as prompt as the browser allows.
 */

import type {
  Bake,
  BakeSlotRef,
  GameData,
  GameState,
  Timestamp,
} from '../core/types';
import type { GameStore } from './store';

/** `${oven}:${slot}:${endsAt}` — unique per bake, since a slot's next bake ends later. */
export function bakeKey(slot: BakeSlotRef, bake: Bake): string {
  return `${slot.oven.toString()}:${slot.slot.toString()}:${bake.endsAt.toString()}`;
}

/** Bakes with endsAt <= now whose key isn't in `notified`, in oven and slot order. */
export function finishedBakes(
  data: GameData,
  state: GameState,
  now: Timestamp,
  notified: ReadonlySet<string>,
): { key: string; recipeName: string }[] {
  const found: { key: string; recipeName: string }[] = [];

  state.kitchen.ovens.forEach((oven, ovenIndex) => {
    oven.slots.forEach((bake, slotIndex) => {
      if (!bake || bake.endsAt > now) return;
      const key = bakeKey({ oven: ovenIndex, slot: slotIndex }, bake);
      if (notified.has(key)) return;
      found.push({
        key,
        recipeName: data.recipes.get(bake.recipeId)?.name ?? bake.recipeId,
      });
    });
  });

  return found;
}

export interface NotifierOptions {
  isHidden: () => boolean;
  notificationsOn: () => boolean;
  notify: (title: string) => void;
}

/**
 * Every 1000 ms: for each finished bake not yet seen, calls
 * notify(`${recipeName} is ready!`) if isHidden() and notificationsOn(); either
 * way marks it seen, so a bake that finished while the tab was visible never
 * notifies later. Returns a stop function.
 */
export function startBakeNotifier(
  store: GameStore,
  clock: () => Timestamp,
  options: NotifierOptions,
): () => void {
  const seen = new Set<string>();

  const interval = setInterval(() => {
    const finished = finishedBakes(store.data, store.getState(), clock(), seen);
    if (finished.length === 0) return;

    const shouldNotify = options.isHidden() && options.notificationsOn();
    for (const { key, recipeName } of finished) {
      seen.add(key);
      if (shouldNotify) {
        options.notify(`${recipeName} is ready!`);
      }
    }
  }, 1000);

  return () => {
    clearInterval(interval);
  };
}
