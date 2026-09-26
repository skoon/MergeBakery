/**
 * Tests for seeded RNG and weighted picker (T1.9).
 */

import { describe, it, expect } from 'vitest';
import { createRng, weightedPick } from './rng';
import type { WeightedEntry } from './types';

describe('createRng', () => {
  it('same seed produces the same 100 values', () => {
    const rng1 = createRng(12345);
    const rng2 = createRng(12345);

    const values1: number[] = [];
    const values2: number[] = [];

    for (let i = 0; i < 100; i++) {
      values1.push(rng1.next());
      values2.push(rng2.next());
    }

    expect(values1).toEqual(values2);
  });

  it('different seeds produce different sequences', () => {
    const rng1 = createRng(12345);
    const rng2 = createRng(54321);

    const values1: number[] = [];
    const values2: number[] = [];

    for (let i = 0; i < 100; i++) {
      values1.push(rng1.next());
      values2.push(rng2.next());
    }

    // The sequences should be different (with overwhelming probability)
    expect(values1).not.toEqual(values2);
  });

  it('all values are in [0, 1)', () => {
    const rng = createRng(99999);

    for (let i = 0; i < 1000; i++) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('resuming from getState() continues the sequence exactly', () => {
    const rng1 = createRng(42);

    // Generate 50 values
    const values1: number[] = [];
    for (let i = 0; i < 50; i++) {
      values1.push(rng1.next());
    }

    // Save state and generate 50 more
    const savedState = rng1.getState();
    const values2: number[] = [];
    for (let i = 0; i < 50; i++) {
      values2.push(rng1.next());
    }

    // Create a new RNG from the saved state and generate 50 more
    const rng2 = createRng(savedState);
    const values3: number[] = [];
    for (let i = 0; i < 50; i++) {
      values3.push(rng2.next());
    }

    // The third sequence should match the second sequence exactly
    expect(values3).toEqual(values2);
  });
});

describe('weightedPick', () => {
  it('10,000 picks from a 60/30/10 table land within 2 percentage points', () => {
    const rng = createRng(777);
    const table: WeightedEntry[] = [
      { itemId: 'a', weight: 60 },
      { itemId: 'b', weight: 30 },
      { itemId: 'c', weight: 10 },
    ];

    const counts = { a: 0, b: 0, c: 0 };

    for (let i = 0; i < 10000; i++) {
      const picked = weightedPick(table, rng);
      counts[picked as keyof typeof counts]++;
    }

    const percentA = (counts.a / 10000) * 100;
    const percentB = (counts.b / 10000) * 100;
    const percentC = (counts.c / 10000) * 100;

    // Within 2 percentage points
    expect(percentA).toBeGreaterThan(58);
    expect(percentA).toBeLessThan(62);

    expect(percentB).toBeGreaterThan(28);
    expect(percentB).toBeLessThan(32);

    expect(percentC).toBeGreaterThan(8);
    expect(percentC).toBeLessThan(12);
  });

  it('throws when table is empty', () => {
    const rng = createRng(123);
    const table: WeightedEntry[] = [];

    expect(() => weightedPick(table, rng)).toThrow(
      /weightedPick: table is empty/,
    );
  });

  it('throws when any weight is negative', () => {
    const rng = createRng(123);
    const table: WeightedEntry[] = [
      { itemId: 'a', weight: 50 },
      { itemId: 'b', weight: -10 },
      { itemId: 'c', weight: 50 },
    ];

    expect(() => weightedPick(table, rng)).toThrow(
      /weightedPick: negative weight/,
    );
  });

  it('throws when total weight is 0', () => {
    const rng = createRng(123);
    const table: WeightedEntry[] = [
      { itemId: 'a', weight: 0 },
      { itemId: 'b', weight: 0 },
    ];

    expect(() => weightedPick(table, rng)).toThrow(
      /weightedPick: total weight is 0/,
    );
  });

  it('always picks from a single-item table', () => {
    const rng = createRng(555);
    const table: WeightedEntry[] = [{ itemId: 'onlyItem', weight: 1 }];

    for (let i = 0; i < 100; i++) {
      expect(weightedPick(table, rng)).toBe('onlyItem');
    }
  });

  it('picks first item when random value is in its weight range', () => {
    // Create a mock RNG that always returns 0.1
    const mockRng = {
      next: () => 0.1,
      getState: () => 0,
    };

    const table: WeightedEntry[] = [
      { itemId: 'first', weight: 50 }, // 0-50
      { itemId: 'second', weight: 30 }, // 50-80
      { itemId: 'third', weight: 20 }, // 80-100
    ];

    // 0.1 * 100 = 10, which falls in first item's range (0-50)
    expect(weightedPick(table, mockRng)).toBe('first');
  });

  it('picks second item when random value is in its weight range', () => {
    const mockRng = {
      next: () => 0.6, // 60% of total weight
      getState: () => 0,
    };

    const table: WeightedEntry[] = [
      { itemId: 'first', weight: 50 }, // 0-50
      { itemId: 'second', weight: 30 }, // 50-80
      { itemId: 'third', weight: 20 }, // 80-100
    ];

    // 0.6 * 100 = 60, which falls in second item's range (50-80)
    expect(weightedPick(table, mockRng)).toBe('second');
  });

  it('picks last item when random value is in its weight range', () => {
    const mockRng = {
      next: () => 0.9,
      getState: () => 0,
    };

    const table: WeightedEntry[] = [
      { itemId: 'first', weight: 50 }, // 0-50
      { itemId: 'second', weight: 30 }, // 50-80
      { itemId: 'third', weight: 20 }, // 80-100
    ];

    // 0.9 * 100 = 90, which falls in third item's range (80-100)
    expect(weightedPick(table, mockRng)).toBe('third');
  });

  it('handles weights that do not sum to 100', () => {
    const rng = createRng(888);
    const table: WeightedEntry[] = [
      { itemId: 'a', weight: 1 },
      { itemId: 'b', weight: 2 },
      { itemId: 'c', weight: 3 },
    ];

    // Total weight is 6, not 100
    const counts = { a: 0, b: 0, c: 0 };

    for (let i = 0; i < 1000; i++) {
      const picked = weightedPick(table, rng);
      counts[picked as keyof typeof counts]++;
    }

    // Should still distribute roughly correctly
    const percentA = (counts.a / 1000) * 100;
    const percentB = (counts.b / 1000) * 100;
    const percentC = (counts.c / 1000) * 100;

    // ~16.67% for a, ~33.33% for b, ~50% for c
    expect(percentA).toBeGreaterThan(10);
    expect(percentA).toBeLessThan(23);

    expect(percentB).toBeGreaterThan(27);
    expect(percentB).toBeLessThan(40);

    expect(percentC).toBeGreaterThan(43);
    expect(percentC).toBeLessThan(57);
  });
});
