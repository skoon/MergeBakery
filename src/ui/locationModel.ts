/**
 * What the Bakery location view shows (T5.3). Pure, no DOM.
 */

import { availableTasks } from '../core/renovation';
import type { GameData, GameState, TaskId } from '../core/types';

export type SpotState = 'done' | 'available' | 'locked';

export interface SpotView {
  taskId: TaskId;
  name: string;
  starCost: number;
  /** Fractions 0–1 of the scene's width and height. */
  x: number;
  y: number;
  state: SpotState;
  /** afterSpriteKey when done, else beforeSpriteKey. */
  spriteKey: string;
  canAfford: boolean;
  /** For a locked spot: the first prerequisite not yet done, by name. */
  waitingFor: string | null;
}

export interface LocationModel {
  chapterName: string;
  sceneKey: string;
  /** Chapter order. */
  spots: SpotView[];
  doneCount: number;
  total: number;
  stars: number;
  /** Names of the events won, each once, for the trophy shelf. */
  trophies: string[];
}

export function locationModel(data: GameData, state: GameState): LocationModel {
  const chapter = data.chapters.get(state.chapterId);
  if (!chapter) {
    throw new Error(`locationModel: unknown chapter id "${state.chapterId}"`);
  }
  const available = new Set(availableTasks(data, state).map((t) => t.id));
  const names = new Map(chapter.tasks.map((t) => [t.id, t.name]));

  const spots = chapter.tasks.map((task): SpotView => {
    const done = state.completedTasks.includes(task.id);
    const spotState: SpotState = done
      ? 'done'
      : available.has(task.id)
        ? 'available'
        : 'locked';
    const blocker =
      spotState === 'locked'
        ? task.prerequisites.find((p) => !state.completedTasks.includes(p))
        : undefined;
    return {
      taskId: task.id,
      name: task.name,
      starCost: task.starCost,
      x: task.spot.x,
      y: task.spot.y,
      state: spotState,
      spriteKey: done ? task.afterSpriteKey : task.beforeSpriteKey,
      canAfford: state.stars >= task.starCost,
      waitingFor: blocker ? (names.get(blocker) ?? blocker) : null,
    };
  });

  return {
    chapterName: chapter.name,
    sceneKey: chapter.sceneKey,
    spots,
    doneCount: spots.filter((s) => s.state === 'done').length,
    total: spots.length,
    stars: state.stars,
    trophies: [...new Set(state.trophies)].map(
      (id) => data.events.get(id)?.name ?? id,
    ),
  };
}
