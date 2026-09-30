/**
 * Tests for Chapter 1's renovation tasks (T5.1).
 */

import { describe, it, expect } from 'vitest';
import { loadGameData } from './data';
import { nextTask } from './orders';
import { stateWith } from './testing';

const data = loadGameData();
const chapter = data.chapters.get('chapter1');
if (!chapter) throw new Error('chapter1 is missing');
const tasks = chapter.tasks;

describe('Chapter 1 tasks', () => {
  it('has the 20 tasks, unique, in order', () => {
    expect(tasks.map((t) => t.id)).toEqual([
      'sweep-cobwebs',
      'wash-window',
      'clear-counter',
      'fix-stool',
      'patch-roof',
      'repaint-door',
      'recipe-board',
      'shop-bell',
      'flour-bins',
      'scrub-tiles',
      'mend-awning',
      'second-oven',
      'display-case',
      'fix-lights',
      'varnish-shelves',
      'window-boxes',
      'repaint-sign',
      'cafe-table',
      'first-recipe-page',
      'reopening-day',
    ]);
  });

  // Doubled from 3–8 (106) by the T-O3 balancing pass.
  it('costs 6–16 stars each and 212 in total', () => {
    for (const task of tasks) {
      expect(task.starCost, task.id).toBeGreaterThanOrEqual(6);
      expect(task.starCost, task.id).toBeLessThanOrEqual(16);
    }
    expect(tasks.reduce((sum, t) => sum + t.starCost, 0)).toBe(212);
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

  it('unlocks only things that exist, and each regular exactly once', () => {
    const customerUnlocks: string[] = [];
    for (const task of tasks) {
      for (const unlock of task.unlocks) {
        if (unlock.kind === 'customer') {
          expect(data.customers.has(unlock.customerId)).toBe(true);
          customerUnlocks.push(unlock.customerId);
        } else if (unlock.kind === 'generator') {
          expect(data.items.has(unlock.itemId)).toBe(true);
          expect(data.generators.has(unlock.itemId)).toBe(true);
        } else {
          expect(data.ovens.has(unlock.ovenId)).toBe(true);
        }
      }
    }
    expect(customerUnlocks.sort()).toEqual(['dex', 'edith', 'gus', 'mina']);
  });

  it('features only real ingredient or baked items', () => {
    for (const task of tasks) {
      for (const itemId of task.featuredItems) {
        const item = data.items.get(itemId);
        expect(item, `${task.id}: ${itemId}`).toBeDefined();
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

  it('starts at sweep-cobwebs, then wash-window', () => {
    expect(nextTask(data, stateWith({}))?.id).toBe('sweep-cobwebs');
    expect(
      nextTask(data, stateWith({}, { completedTasks: ['sweep-cobwebs'] }))?.id,
    ).toBe('wash-window');
  });
});
