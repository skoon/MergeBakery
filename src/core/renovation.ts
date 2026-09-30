/**
 * Completing renovation tasks (T5.2): spending stars on the current
 * chapter's tasks and applying what they unlock.
 */

import { nearestEmpty, setCell, toIndex } from './board';
import { discover } from './discovery';
import type {
  ActionResult,
  BoardItem,
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

/** The cell collected bakes and unlocked generators aim for. */
function middleCell(state: GameState): number {
  return toIndex(
    state.board,
    Math.floor(state.board.cols / 2),
    Math.floor(state.board.rows / 2),
  );
}

/**
 * Throws for an unknown task. Rejects, in order: 'alreadyCompleted',
 * 'prerequisitesMissing', 'notEnoughStars', and 'boardFull' when a generator
 * unlock would find no empty board cell and a full Pantry — checked before
 * anything changes, so a rejected task costs nothing.
 *
 * Otherwise spends the stars, records the task, and applies its unlocks in
 * order. Events: `spawned` for each generator placed on the board, any
 * `discovered`, then `taskCompleted`.
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
  const room =
    state.board.cells.filter((c) => c.kind === 'empty').length +
    (state.pantry.capacity - state.pantry.items.length);
  if (generatorUnlocks.length > room) {
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
      const def = data.generators.get(unlock.itemId);
      if (!def) {
        throw new Error(
          `completeTask: "${unlock.itemId}" has no generator definition`,
        );
      }
      const item: BoardItem = {
        itemId: unlock.itemId,
        cobwebbed: false,
        generator: { charges: def.charges, cooldownEndsAt: null },
      };
      const cell = nearestEmpty(next.board, middleCell(next));
      if (cell !== null) {
        next = {
          ...next,
          board: setCell(next.board, cell, { kind: 'item', item }),
        };
        events.push({
          type: 'spawned',
          itemId: unlock.itemId,
          cell,
          rare: false,
        });
      } else {
        next = {
          ...next,
          pantry: { ...next.pantry, items: [...next.pantry.items, item] },
        };
      }
      const found = discover(data, next, unlock.itemId);
      next = found.state;
      events.push(...found.events);
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
  return { ok: true, state: next, events };
}
