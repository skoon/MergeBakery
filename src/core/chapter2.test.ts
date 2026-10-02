/**
 * Tests for Chapter 2, The Café Terrace (T7.4).
 */

import { describe, it, expect } from 'vitest';
import { loadGameData } from './data';
import { nextChapterId } from './renovation';

const data = loadGameData();
const chapter = data.chapters.get('chapter2');
if (!chapter) throw new Error('chapter2 is missing');
const tasks = chapter.tasks;

describe('Chapter 2 tasks', () => {
  it('follows Chapter 1 and is The Café Terrace', () => {
    expect(nextChapterId(data, 'chapter1')).toBe('chapter2');
    expect(chapter.name).toBe('The Café Terrace');
    expect(chapter.sceneKey).toBe('cafe-terrace');
  });

  it('has 20 tasks, all prefixed cafe- so they cannot collide with Chapter 1', () => {
    expect(tasks).toHaveLength(20);
    expect(tasks.every((t) => t.id.startsWith('cafe-'))).toBe(true);
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

  it('unlocks the Hen Coop and Sugar Tin early, and each new regular once', () => {
    const generatorAt = (itemId: string) =>
      tasks.findIndex((t) =>
        t.unlocks.some((u) => u.kind === 'generator' && u.itemId === itemId),
      );
    // Within the first five tasks, so Cookie and Cupcake open up quickly.
    expect(generatorAt('hen-coop-1')).toBeLessThan(5);
    expect(generatorAt('sugar-tin-1')).toBeLessThan(5);

    const customers = tasks.flatMap((t) =>
      t.unlocks.flatMap((u) => (u.kind === 'customer' ? [u.customerId] : [])),
    );
    expect(customers.sort()).toEqual(['bramble', 'priya', 'theo']);
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

  it('names its art cafe-terrace-<task>-before/after', () => {
    for (const task of tasks) {
      const slug = task.id.replace(/^cafe-/, '');
      expect(task.beforeSpriteKey).toBe(`cafe-terrace-${slug}-before`);
      expect(task.afterSpriteKey).toBe(`cafe-terrace-${slug}-after`);
    }
  });
});
