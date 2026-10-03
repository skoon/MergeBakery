/**
 * Tests for Chapter 4, The Wholesale Kitchen (T10.7).
 */

import { describe, it, expect } from 'vitest';
import { loadGameData } from './data';
import { nextChapterId } from './renovation';

const data = loadGameData();
const chapter = data.chapters.get('chapter4');
if (!chapter) throw new Error('chapter4 is missing');
const tasks = chapter.tasks;

describe('Chapter 4 tasks', () => {
  it('follows Chapter 3 and is The Wholesale Kitchen', () => {
    expect(nextChapterId(data, 'chapter3')).toBe('chapter4');
    expect(chapter.name).toBe('The Wholesale Kitchen');
    expect(chapter.sceneKey).toBe('wholesale-kitchen');
  });

  it('has 20 tasks, all prefixed wholesale- so they cannot collide with earlier chapters', () => {
    expect(tasks).toHaveLength(20);
    expect(tasks.every((t) => t.id.startsWith('wholesale-'))).toBe(true);
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

  it('unlocks the Deck Oven by the eighth task, and each new regular once', () => {
    const ovenAt = tasks.findIndex((t) =>
      t.unlocks.some((u) => u.kind === 'oven' && u.ovenId === 'deck-oven'),
    );
    expect(ovenAt).toBeGreaterThanOrEqual(0);
    expect(ovenAt).toBeLessThan(8);

    const customers = tasks.flatMap((t) =>
      t.unlocks.flatMap((u) => (u.kind === 'customer' ? [u.customerId] : [])),
    );
    expect(customers.sort()).toEqual(['harlow', 'lou', 'okafor']);
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

  it('names its art wholesale-kitchen-<task>-before/after', () => {
    for (const task of tasks) {
      const slug = task.id.replace(/^wholesale-/, '');
      expect(task.beforeSpriteKey).toBe(`wholesale-kitchen-${slug}-before`);
      expect(task.afterSpriteKey).toBe(`wholesale-kitchen-${slug}-after`);
    }
  });
});
