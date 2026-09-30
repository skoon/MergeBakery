/**
 * The first-time flow's progress (T5.12): which step a new player is on, and
 * which events finish it. The hints themselves are drawn in the UI.
 */

import type {
  ActionResult,
  GameData,
  GameEvent,
  GameState,
  TutorialStep,
} from './types';

export const TUTORIAL_ORDER: readonly TutorialStep[] = [
  'firstTap',
  'firstMerge',
  'firstOrder',
  'firstRenovation',
  'done',
];

/**
 * Moves tutorialStep forward to `step`. A step at or before the current one
 * returns ok with the same state object and no events: the tutorial never
 * goes back.
 */
export function setTutorialStep(
  _data: GameData,
  state: GameState,
  step: TutorialStep,
): ActionResult {
  if (
    TUTORIAL_ORDER.indexOf(step) <= TUTORIAL_ORDER.indexOf(state.tutorialStep)
  ) {
    return { ok: true, state, events: [] };
  }
  return { ok: true, state: { ...state, tutorialStep: step }, events: [] };
}

/** The event that finishes each step. */
function finishes(step: TutorialStep, event: GameEvent): boolean {
  switch (step) {
    case 'firstTap':
      return event.type === 'spawned' && !event.rare;
    case 'firstMerge':
      return event.type === 'merged';
    case 'firstOrder':
      return event.type === 'orderDelivered';
    case 'firstRenovation':
      return event.type === 'taskCompleted';
    case 'done':
      return false;
  }
}

/**
 * The step these events finish, or `current` when they finish nothing. At
 * most one step, so an event that happens to finish a later step can't skip
 * the hints in between.
 */
export function tutorialStepAfter(
  current: TutorialStep,
  events: readonly GameEvent[],
): TutorialStep {
  if (!events.some((event) => finishes(current, event))) {
    return current;
  }
  return TUTORIAL_ORDER[TUTORIAL_ORDER.indexOf(current) + 1] ?? 'done';
}

/**
 * For a save from before the tutorial existed, still on 'firstTap': 'done'
 * when it has any XP or completed tasks (the player is past the basics), else
 * unchanged.
 */
export function catchUpTutorial(state: GameState): TutorialStep {
  if (
    state.tutorialStep === 'firstTap' &&
    (state.xp > 0 || state.completedTasks.length > 0)
  ) {
    return 'done';
  }
  return state.tutorialStep;
}
