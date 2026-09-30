/**
 * Tests for completing renovation tasks (T5.2).
 */

import { describe, it, expect } from 'vitest';
import { availableTasks, completeTask, taskById } from './renovation';
import { nextTask } from './orders';
import { getCell } from './board';
import { stateWith, testData, type CellSpec } from './testing';
import type { BoardItem, GameState } from './types';

/** Every board cell holds an egg. */
function fullBoard(): Record<number, CellSpec> {
  const cells: Record<number, CellSpec> = {};
  for (let i = 0; i < 63; i++) cells[i] = 'egg';
  return cells;
}

const EGG: BoardItem = { itemId: 'egg', cobwebbed: false, generator: null };

function withPrereqsFor(
  taskId: string,
  overrides: Partial<GameState> = {},
  cells: Record<number, CellSpec> = {},
): GameState {
  const task = taskById(testData, stateWith({}), taskId);
  return stateWith(cells, {
    stars: 50,
    completedTasks: [...task.prerequisites],
    ...overrides,
  });
}

describe('taskById', () => {
  it('finds a task in the current chapter', () => {
    expect(taskById(testData, stateWith({}), 'patch-roof').starCost).toBe(4);
  });

  it('throws for an unknown task', () => {
    expect(() => taskById(testData, stateWith({}), 'build-a-moat')).toThrow(
      /no task "build-a-moat"/,
    );
  });
});

describe('availableTasks', () => {
  it('starts with only the first task', () => {
    const state = stateWith({});

    expect(availableTasks(testData, state).map((t) => t.id)).toEqual([
      'sweep-cobwebs',
    ]);
    expect(availableTasks(testData, state)[0]).toBe(nextTask(testData, state));
  });

  it('opens the next two after the first is done', () => {
    const state = stateWith({}, { completedTasks: ['sweep-cobwebs'] });

    expect(availableTasks(testData, state).map((t) => t.id)).toEqual([
      'wash-window',
      'clear-counter',
    ]);
    expect(availableTasks(testData, state)[0]).toBe(nextTask(testData, state));
  });
});

describe('completeTask', () => {
  it('spends the stars and records the task', () => {
    const state = stateWith({}, { stars: 10 });

    const result = completeTask(testData, state, 'sweep-cobwebs');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.stars).toBe(7);
    expect(result.state.completedTasks).toEqual(['sweep-cobwebs']);
    expect(result.events).toEqual([
      { type: 'taskCompleted', taskId: 'sweep-cobwebs' },
    ]);
  });

  it('unlocks a customer', () => {
    const result = completeTask(
      testData,
      withPrereqsFor('wash-window'),
      'wash-window',
    );

    expect(result.ok && result.state.unlockedCustomers).toEqual(['gus']);
  });

  it('does not add a customer twice', () => {
    const state = withPrereqsFor('wash-window', { unlockedCustomers: ['gus'] });

    const result = completeTask(testData, state, 'wash-window');

    expect(result.ok && result.state.unlockedCustomers).toEqual(['gus']);
  });

  it('places an unlocked generator, charged, on the empty cell nearest the middle', () => {
    const result = completeTask(
      testData,
      withPrereqsFor('patch-roof'),
      'patch-roof',
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // 7 x 9 board: column 3, row 4.
    const middle = 4 * 7 + 3;
    const cell = getCell(result.state.board, middle);
    expect(cell).toEqual({
      kind: 'item',
      item: {
        itemId: 'dairy-fridge-1',
        cobwebbed: false,
        generator: {
          charges: testData.generators.get('dairy-fridge-1')?.charges,
          cooldownEndsAt: null,
        },
      },
    });
    expect(result.events[0]).toEqual({
      type: 'spawned',
      itemId: 'dairy-fridge-1',
      cell: middle,
      rare: false,
    });
    expect(result.events.at(-1)).toEqual({
      type: 'taskCompleted',
      taskId: 'patch-roof',
    });
  });

  it('sends an unlocked generator to the Pantry when the board is full', () => {
    const state = withPrereqsFor('patch-roof', {}, fullBoard());

    const result = completeTask(testData, state, 'patch-roof');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.pantry.items.map((i) => i.itemId)).toEqual([
      'dairy-fridge-1',
    ]);
    expect(result.events.some((e) => e.type === 'spawned')).toBe(false);
  });

  it("rejects 'boardFull' without spending when the board and Pantry are both full", () => {
    const base = withPrereqsFor('patch-roof', {}, fullBoard());
    const state: GameState = {
      ...base,
      pantry: {
        ...base.pantry,
        items: Array.from({ length: base.pantry.capacity }, () => EGG),
      },
    };

    expect(completeTask(testData, state, 'patch-roof')).toEqual({
      ok: false,
      reason: 'boardFull',
    });
  });

  it('adds an empty Toaster Oven for an oven unlock', () => {
    const state = withPrereqsFor('second-oven');

    const result = completeTask(testData, state, 'second-oven');

    expect(result.ok && result.state.kitchen.ovens).toEqual([
      ...state.kitchen.ovens,
      { ovenId: 'toaster-oven', slots: [null] },
    ]);
  });

  it('rejects in order: already completed, prerequisites, stars', () => {
    const completedAndBroke = stateWith(
      {},
      { stars: 0, completedTasks: ['sweep-cobwebs'] },
    );
    expect(completeTask(testData, completedAndBroke, 'sweep-cobwebs')).toEqual({
      ok: false,
      reason: 'alreadyCompleted',
    });

    const lockedAndBroke = stateWith({}, { stars: 0 });
    expect(completeTask(testData, lockedAndBroke, 'wash-window')).toEqual({
      ok: false,
      reason: 'prerequisitesMissing',
    });

    const broke = stateWith({}, { stars: 2 });
    expect(completeTask(testData, broke, 'sweep-cobwebs')).toEqual({
      ok: false,
      reason: 'notEnoughStars',
    });
  });

  it('throws for an unknown task', () => {
    expect(() =>
      completeTask(testData, stateWith({}, { stars: 99 }), 'nope'),
    ).toThrow();
  });

  it('never mutates its input', () => {
    const state = withPrereqsFor('patch-roof');
    const before = JSON.stringify(state);

    completeTask(testData, state, 'patch-roof');

    expect(JSON.stringify(state)).toBe(before);
  });
});
