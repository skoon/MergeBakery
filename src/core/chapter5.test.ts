/**
 * Tests for Chapter 5, Rise & Shine Factory (T11.4).
 */

import { describe, it, expect } from 'vitest';
import { loadGameData } from './data';
import { gameFinished, nextChapterId } from './renovation';
import { stateWith } from './testing';

const data = loadGameData();
const chapter = data.chapters.get('chapter5');
if (!chapter) throw new Error('chapter5 is missing');
const tasks = chapter.tasks;

describe('Chapter 5 tasks', () => {
  it('is the last chapter, Rise & Shine Factory', () => {
    expect(nextChapterId(data, 'chapter4')).toBe('chapter5');
    expect(chapter.name).toBe('Rise & Shine Factory');
    expect(chapter.sceneKey).toBe('factory');
  });

  it('has 20 tasks, all prefixed factory- so they cannot collide with earlier chapters', () => {
    expect(tasks).toHaveLength(20);
    expect(tasks.every((t) => t.id.startsWith('factory-'))).toBe(true);
    expect(new Set(tasks.map((t) => t.id)).size).toBe(20);
  });

  it('only requires earlier tasks', () => {
    const seen = new Set<string>();
    for (const task of tasks) {
      for (const prerequisite of task.prerequisites) {
        expect(seen.has(prerequisite), `${task.id} needs ${prerequisite}`).toBe(
          true,
        );
      }
      seen.add(task.id);
    }
  });

  it('unlocks each new regular once, and ends on the buyout scenes', () => {
    const customers = tasks.flatMap((t) =>
      t.unlocks.flatMap((u) => (u.kind === 'customer' ? [u.customerId] : [])),
    );
    expect(customers.sort()).toEqual(['bex', 'dill', 'moss']);
    // The last chapter stays put, so the finale is a scene on the last task.
    expect(nextChapterId(data, 'chapter5')).toBeNull();
    expect(tasks.at(-2)?.sceneId).toBe('ch5-offer');
    expect(tasks.at(-1)?.sceneId).toBe('ch5-finale');
  });

  it('features only real ingredient or baked items', () => {
    for (const task of tasks) {
      for (const itemId of task.featuredItems) {
        const item = data.items.get(itemId);
        const kind = item && data.chains.get(item.chainId)?.kind;
        expect(['ingredient', 'baked'], `${task.id}: ${itemId}`).toContain(
          kind,
        );
      }
    }
  });

  it('keeps spots in the scene and apart from each other', () => {
    for (const task of tasks) {
      expect(task.spot.x).toBeGreaterThanOrEqual(0.1);
      expect(task.spot.x).toBeLessThanOrEqual(0.9);
      expect(task.spot.y).toBeGreaterThanOrEqual(0.15);
      expect(task.spot.y).toBeLessThanOrEqual(0.85);
    }
    for (let i = 0; i < tasks.length; i++) {
      for (let j = i + 1; j < tasks.length; j++) {
        const a = tasks[i]!;
        const b = tasks[j]!;
        const close =
          Math.abs(a.spot.x - b.spot.x) < 0.1 &&
          Math.abs(a.spot.y - b.spot.y) < 0.1;
        expect(close, `${a.id} and ${b.id}`).toBe(false);
      }
    }
  });

  it('names its art factory-<task>-before/after', () => {
    for (const task of tasks) {
      const slug = task.id.replace(/^factory-/, '');
      expect(task.beforeSpriteKey).toBe(`factory-${slug}-before`);
      expect(task.afterSpriteKey).toBe(`factory-${slug}-after`);
    }
  });
});

describe('gameFinished', () => {
  it('is true only once every task of the last chapter is done', () => {
    const ids = tasks.map((t) => t.id);
    expect(gameFinished(data, stateWith({}, { completedTasks: [] }))).toBe(
      false,
    );
    expect(
      gameFinished(data, stateWith({}, { completedTasks: ids.slice(0, -1) })),
    ).toBe(false);
    expect(gameFinished(data, stateWith({}, { completedTasks: ids }))).toBe(
      true,
    );
  });
});
