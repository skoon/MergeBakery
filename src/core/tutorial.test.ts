/**
 * Tests for the first-time flow's progress (T5.12).
 */

import { describe, it, expect } from 'vitest';
import {
  catchUpTutorial,
  setTutorialStep,
  tutorialStepAfter,
} from './tutorial';
import { stateWith, testData } from './testing';
import type { GameEvent } from './types';

const tap: GameEvent = {
  type: 'spawned',
  itemId: 'wheat-stalk',
  cell: 0,
  rare: false,
};
const rareTap: GameEvent = {
  type: 'spawned',
  itemId: 'energy-jar',
  cell: 0,
  rare: true,
};
const merge: GameEvent = {
  type: 'merged',
  itemId: 'wheat-bundle',
  cells: [0, 1],
};
const delivery: GameEvent = {
  type: 'orderDelivered',
  orderId: 1,
  reward: { coins: 5, stars: 1, xp: 2 },
};
const renovation: GameEvent = {
  type: 'taskCompleted',
  taskId: 'sweep-cobwebs',
};

describe('setTutorialStep', () => {
  it('moves forward', () => {
    const result = setTutorialStep(testData, stateWith({}), 'firstMerge');

    expect(result.ok && result.state.tutorialStep).toBe('firstMerge');
  });

  it('never goes back, returning the same state object', () => {
    const state = stateWith({}, { tutorialStep: 'firstOrder' });

    const back = setTutorialStep(testData, state, 'firstTap');
    const same = setTutorialStep(testData, state, 'firstOrder');

    expect(back.ok && back.state).toBe(state);
    expect(same.ok && same.state).toBe(state);
  });

  it('can jump straight to done', () => {
    const result = setTutorialStep(testData, stateWith({}), 'done');

    expect(result.ok && result.state.tutorialStep).toBe('done');
  });
});

describe('tutorialStepAfter', () => {
  it('finishes each step on its event', () => {
    expect(tutorialStepAfter('firstTap', [tap])).toBe('firstMerge');
    expect(tutorialStepAfter('firstMerge', [merge])).toBe('firstOrder');
    expect(tutorialStepAfter('firstOrder', [delivery])).toBe('firstRenovation');
    expect(tutorialStepAfter('firstRenovation', [renovation])).toBe('done');
  });

  it('does not finish the tap step on a rare drop', () => {
    expect(tutorialStepAfter('firstTap', [rareTap])).toBe('firstTap');
  });

  it("does not skip ahead on a later step's event", () => {
    expect(tutorialStepAfter('firstTap', [merge, delivery])).toBe('firstTap');
  });

  it('finishes only one step however many events arrive', () => {
    expect(tutorialStepAfter('firstTap', [tap, merge, delivery])).toBe(
      'firstMerge',
    );
  });

  it('stays done', () => {
    expect(tutorialStepAfter('done', [tap, merge])).toBe('done');
  });
});

describe('catchUpTutorial', () => {
  it('leaves a new save on the first step', () => {
    expect(catchUpTutorial(stateWith({}))).toBe('firstTap');
  });

  it('skips the tutorial for a save with XP', () => {
    expect(catchUpTutorial(stateWith({}, { xp: 12 }))).toBe('done');
  });

  it('skips the tutorial for a save with a completed task', () => {
    expect(
      catchUpTutorial(stateWith({}, { completedTasks: ['sweep-cobwebs'] })),
    ).toBe('done');
  });

  it('leaves a save already partway through the tutorial alone', () => {
    expect(
      catchUpTutorial(stateWith({}, { xp: 12, tutorialStep: 'firstOrder' })),
    ).toBe('firstOrder');
  });
});
