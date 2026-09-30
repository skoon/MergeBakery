/**
 * Tests for the Bakery location view model (T5.3).
 */

import { describe, it, expect } from 'vitest';
import { locationModel } from './locationModel';
import { stateWith, testData } from '../core/testing';

describe('locationModel', () => {
  it('shows a new game: one available spot, the rest locked', () => {
    const model = locationModel(testData, stateWith({}, { stars: 0 }));

    expect(model.chapterName).toBe("Grandma's Corner Shop");
    expect(model.total).toBe(20);
    expect(model.doneCount).toBe(0);
    expect(
      model.spots.filter((s) => s.state === 'available').map((s) => s.taskId),
    ).toEqual(['sweep-cobwebs']);
    expect(model.spots.filter((s) => s.state === 'locked')).toHaveLength(19);
  });

  it('marks a finished task done with its after sprite, and opens the next two', () => {
    const model = locationModel(
      testData,
      stateWith({}, { completedTasks: ['sweep-cobwebs'] }),
    );
    const first = model.spots[0];

    expect(first).toMatchObject({
      taskId: 'sweep-cobwebs',
      state: 'done',
      spriteKey: 'corner-shop-sweep-cobwebs-after',
    });
    expect(model.doneCount).toBe(1);
    expect(
      model.spots.filter((s) => s.state === 'available').map((s) => s.taskId),
    ).toEqual(['wash-window', 'clear-counter']);
    expect(model.spots[1]?.spriteKey).toBe('corner-shop-wash-window-before');
  });

  it('says what a locked spot is waiting for', () => {
    const model = locationModel(testData, stateWith({}));

    expect(
      model.spots.find((s) => s.taskId === 'wash-window')?.waitingFor,
    ).toBe('Sweep out the cobwebs');
    expect(model.spots[0]?.waitingFor).toBeNull();
  });

  it('knows whether each task is affordable', () => {
    const model = locationModel(testData, stateWith({}, { stars: 4 }));

    // sweep-cobwebs costs 3; reopening-day costs 8.
    expect(model.spots[0]?.canAfford).toBe(true);
    expect(model.spots.at(-1)?.canAfford).toBe(false);
    expect(model.stars).toBe(4);
  });

  it('keeps chapter order', () => {
    const model = locationModel(testData, stateWith({}));
    const chapter = testData.chapters.get('chapter1');

    expect(model.spots.map((s) => s.taskId)).toEqual(
      chapter?.tasks.map((t) => t.id),
    );
  });
});
