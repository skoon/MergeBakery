/**
 * Completing renovation tasks (T5.2): spending stars on the current
 * chapter's tasks and applying what they unlock. Completing a chapter's last
 * task moves the player on to the next chapter (T7.2).
 */

import { placeGenerator, roomForItems } from './placement';
import type {
  ActionResult,
  ChapterId,
  GameData,
  GameEvent,
  GameState,
  RenovationTask,
  TaskId,
} from './types';

/** The current chapter's task with this id. Throws when the chapter or task is unknown. */
export function taskById(
  data: GameData,
  state: GameState,
  taskId: TaskId,
): RenovationTask {
  const chapter = data.chapters.get(state.chapterId);
  if (!chapter) {
    throw new Error(`taskById: unknown chapter id "${state.chapterId}"`);
  }
  const task = chapter.tasks.find((t) => t.id === taskId);
  if (!task) {
    throw new Error(
      `taskById: no task "${taskId}" in chapter "${state.chapterId}"`,
    );
  }
  return task;
}

function prerequisitesMet(state: GameState, task: RenovationTask): boolean {
  return task.prerequisites.every((p) => state.completedTasks.includes(p));
}

/** Incomplete tasks whose prerequisites are all complete, in chapter order. */
export function availableTasks(
  data: GameData,
  state: GameState,
): RenovationTask[] {
  const chapter = data.chapters.get(state.chapterId);
  if (!chapter) {
    throw new Error(`availableTasks: unknown chapter id "${state.chapterId}"`);
  }
  return chapter.tasks.filter(
    (task) =>
      !state.completedTasks.includes(task.id) && prerequisitesMet(state, task),
  );
}

/** The chapter after `chapterId` in data (play) order, or null after the last. */
export function nextChapterId(
  data: GameData,
  chapterId: ChapterId,
): ChapterId | null {
  const ids = Array.from(data.chapters.keys());
  const index = ids.indexOf(chapterId);
  return index === -1 ? null : (ids[index + 1] ?? null);
}

/**
 * Throws for an unknown task. Rejects, in order: 'alreadyCompleted',
 * 'prerequisitesMissing', 'notEnoughStars', and 'boardFull' when a generator
 * unlock would find no empty board cell and a full Pantry — checked before
 * anything changes, so a rejected task costs nothing.
 *
 * Otherwise spends the stars, records the task, and applies its unlocks in
 * order. Events: `spawned` for each generator placed on the board, any
 * `discovered`, then `taskCompleted`. When that was the chapter's last
 * incomplete task and another chapter follows, `chapterId` moves on to it and
 * a `chapterStarted` event comes last; after the final chapter, it stays.
 */
export function completeTask(
  data: GameData,
  state: GameState,
  taskId: TaskId,
): ActionResult {
  const task = taskById(data, state, taskId);

  if (state.completedTasks.includes(taskId)) {
    return { ok: false, reason: 'alreadyCompleted' };
  }
  if (!prerequisitesMet(state, task)) {
    return { ok: false, reason: 'prerequisitesMissing' };
  }
  if (state.stars < task.starCost) {
    return { ok: false, reason: 'notEnoughStars' };
  }

  const generatorUnlocks = task.unlocks.filter((u) => u.kind === 'generator');
  if (generatorUnlocks.length > roomForItems(state)) {
    return { ok: false, reason: 'boardFull' };
  }

  let next: GameState = {
    ...state,
    stars: state.stars - task.starCost,
    completedTasks: [...state.completedTasks, taskId],
  };
  const events: GameEvent[] = [];

  for (const unlock of task.unlocks) {
    if (unlock.kind === 'generator') {
      // Room was checked above, so this always places.
      const placed = placeGenerator(data, next, unlock.itemId);
      if (placed) {
        next = placed.state;
        events.push(...placed.events);
      }
    } else if (unlock.kind === 'oven') {
      const oven = data.ovens.get(unlock.ovenId);
      if (!oven) {
        throw new Error(`completeTask: unknown oven "${unlock.ovenId}"`);
      }
      next = {
        ...next,
        kitchen: {
          ovens: [
            ...next.kitchen.ovens,
            {
              ovenId: unlock.ovenId,
              slots: Array.from({ length: oven.slots }, () => null),
            },
          ],
        },
      };
    } else if (!next.unlockedCustomers.includes(unlock.customerId)) {
      next = {
        ...next,
        unlockedCustomers: [...next.unlockedCustomers, unlock.customerId],
      };
    }
  }

  events.push({ type: 'taskCompleted', taskId });

  const chapter = data.chapters.get(next.chapterId);
  const chapterDone =
    chapter?.tasks.every((t) => next.completedTasks.includes(t.id)) ?? false;
  const following = chapterDone ? nextChapterId(data, next.chapterId) : null;
  if (following) {
    next = { ...next, chapterId: following };
    events.push({ type: 'chapterStarted', chapterId: following });
  }

  return { ok: true, state: next, events };
}

/**
 * For a save that finished its chapter before chapter progression existed
 * (T7.2): while the current chapter's tasks are all complete and another
 * chapter follows, moves `chapterId` on. Returns the same state object when
 * there's nothing to do.
 */
export function catchUpChapter(data: GameData, state: GameState): GameState {
  let next = state;
  for (;;) {
    const chapter = data.chapters.get(next.chapterId);
    const done =
      chapter !== undefined &&
      chapter.tasks.every((t) => next.completedTasks.includes(t.id));
    const following = done ? nextChapterId(data, next.chapterId) : null;
    if (!following) return next;
    next = { ...next, chapterId: following };
  }
}
