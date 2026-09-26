/**
 * Tests for HUD model (T3.10).
 */

import { describe, it, expect } from 'vitest';
import { hudModel } from './hudModel';
import { testData, stateWith } from '../core/testing';
import type { EnergyState } from '../core/types';

const data = testData;
const cap = data.economy.energy.cap;
const regenSec = data.economy.energy.regenSec;
const regenMs = regenSec * 1000;

describe('hudModel', () => {
  describe('full energy', () => {
    it('shows null countdown when at cap', () => {
      const state = stateWith({}, { energy: { value: cap, updatedAt: 0 } });
      const model = hudModel(data, state, 0);

      expect(model.energy).toBe(cap);
      expect(model.energyCap).toBe(cap);
      expect(model.nextEnergyIn).toBeNull();
    });

    it('shows null countdown when above cap', () => {
      const state = stateWith({}, { energy: { value: cap + 5, updatedAt: 0 } });
      const model = hudModel(data, state, 0);

      expect(model.energy).toBe(cap + 5);
      expect(model.energyCap).toBe(cap);
      expect(model.nextEnergyIn).toBeNull();
    });
  });

  describe('energy regen countdown', () => {
    it('shows 1:59 just after spending from full', () => {
      // Start at full energy, then spend 1 point
      // Energy regen starts immediately, but at time 0 we're 0ms into the period
      // So we have the full regenMs to the next point
      // But the test says "just after spending from full, 1:59"
      // This means we spent, have 99 energy, and the regenMs (120s) minus almost nothing gives us 1:59
      // So we're testing when we're 1 second into the regen period
      const energy: EnergyState = { value: cap - 1, updatedAt: 0 };
      const state = stateWith({}, { energy });

      // At 1 second (1000 ms), we've just spent 1 second out of 120 seconds
      // Time until next: 120 - 1 = 119 seconds = 1:59
      const model = hudModel(data, state, 1000);

      expect(model.energy).toBe(cap - 1);
      expect(model.nextEnergyIn).toBe('1:59');
    });

    it('shows 0:01 near the end of a regen period', () => {
      const energy: EnergyState = { value: 50, updatedAt: 0 };
      const state = stateWith({}, { energy });

      // At regenMs - 1000 (almost at the end of the period)
      // Time until next: 1000 ms = 0:01 (rounded up)
      const model = hudModel(data, state, regenMs - 1000);

      expect(model.nextEnergyIn).toBe('0:01');
    });

    it('shows correct countdown partway through a period', () => {
      const energy: EnergyState = { value: 50, updatedAt: 0 };
      const state = stateWith({}, { energy });

      // At 30 seconds (30000 ms), time until next is 120 - 30 = 90 seconds = 1:30
      const model = hudModel(data, state, 30000);

      expect(model.nextEnergyIn).toBe('1:30');
    });

    it('rounds up milliseconds to whole seconds', () => {
      const energy: EnergyState = { value: 50, updatedAt: 0 };

      // At 1 ms (rounds up to 1 second remaining out of 120)
      // That's still 119 seconds + almost all of the 120th second = 1:59 + a bit
      // But we round up, so ceil(119999) = 120000 ms = 120 seconds = 2:00
      // Actually, let me recalculate: regenMs = 120000
      // At 1000 ms elapsed, next point at 120000
      // Time until next = 120000 - 1000 = 119000 ms
      // ceil(119000) = 119000 ms = 119 seconds
      // But we rounded up via ceil, so it's still 119s = 1:59
      // Let me test at 999 ms: ceil(119001) = 119001 ms rounds up to 120 seconds? No.
      // ceil(119001 / 1000) = ceil(119.001) = 120 seconds
      // So at 999 ms elapsed, we should see "2:00"
      const atAlmost1Second = regenMs - 1;
      const model = hudModel(data, stateWith({}, { energy }), atAlmost1Second);

      // At regenMs - 1 ms, we have 1 ms left
      // ceil(1 / 1000) = 1 second, which is 0:01
      expect(model.nextEnergyIn).toBe('0:01');
    });
  });

  describe('level progress', () => {
    it('shows 0 progress at the start of a level', () => {
      // At level 1 with 0 xp (just created)
      const levels = data.economy.levels;
      const level1Xp = levels[0]?.xpTotal ?? 0;
      const state = stateWith({}, { level: 1, xp: level1Xp });

      const model = hudModel(data, state, 0);

      expect(model.level).toBe(1);
      expect(model.levelProgress).toBe(0);
    });

    it('shows 0.5 progress halfway through a level', () => {
      const levels = data.economy.levels;
      const level1Xp = levels[0]?.xpTotal ?? 0;
      const level2Xp = levels[1]?.xpTotal ?? 0;
      const midpoint = level1Xp + (level2Xp - level1Xp) / 2;

      const state = stateWith({}, { level: 1, xp: midpoint });
      const model = hudModel(data, state, 0);

      expect(model.level).toBe(1);
      expect(model.levelProgress).toBeCloseTo(0.5, 5);
    });

    it('shows 1.0 progress at the last level', () => {
      const levels = data.economy.levels;
      const lastLevel = levels[levels.length - 1]!;
      const state = stateWith(
        {},
        { level: lastLevel.level, xp: lastLevel.xpTotal },
      );

      const model = hudModel(data, state, 0);

      expect(model.level).toBe(lastLevel.level);
      expect(model.levelProgress).toBe(1);
    });

    it('shows 1.0 progress even if xp exceeds next level when at last level', () => {
      const levels = data.economy.levels;
      const lastLevel = levels[levels.length - 1]!;
      const state = stateWith(
        {},
        {
          level: lastLevel.level,
          xp: lastLevel.xpTotal + 1000,
        },
      );

      const model = hudModel(data, state, 0);

      expect(model.level).toBe(lastLevel.level);
      expect(model.levelProgress).toBe(1);
    });

    it('shows progress approaching next level', () => {
      const levels = data.economy.levels;
      const level1Xp = levels[0]?.xpTotal ?? 0;
      const level2Xp = levels[1]?.xpTotal ?? 0;
      const almostNext = level1Xp + (level2Xp - level1Xp) * 0.9;

      const state = stateWith({}, { level: 1, xp: almostNext });
      const model = hudModel(data, state, 0);

      expect(model.level).toBe(1);
      expect(model.levelProgress).toBeCloseTo(0.9, 5);
    });
  });

  describe('currencies', () => {
    it('shows coins from state', () => {
      const state = stateWith({}, { coins: 1234 });
      const model = hudModel(data, state, 0);

      expect(model.coins).toBe(1234);
    });

    it('shows stars from state', () => {
      const state = stateWith({}, { stars: 56 });
      const model = hudModel(data, state, 0);

      expect(model.stars).toBe(56);
    });

    it('shows gems from state', () => {
      const state = stateWith({}, { gems: 12 });
      const model = hudModel(data, state, 0);

      expect(model.gems).toBe(12);
    });

    it('shows all currencies together', () => {
      const state = stateWith(
        {},
        {
          coins: 5000,
          stars: 100,
          gems: 50,
        },
      );
      const model = hudModel(data, state, 0);

      expect(model.coins).toBe(5000);
      expect(model.stars).toBe(100);
      expect(model.gems).toBe(50);
    });
  });

  describe('integration', () => {
    it('shows full model with all fields', () => {
      const energy: EnergyState = { value: 50, updatedAt: 0 };
      const levels = data.economy.levels;
      const level1Xp = levels[0]?.xpTotal ?? 0;
      const level2Xp = levels[1]?.xpTotal ?? 0;
      const midpoint = level1Xp + (level2Xp - level1Xp) / 2;

      const state = stateWith(
        {},
        {
          energy,
          coins: 9999,
          stars: 42,
          gems: 7,
          level: 1,
          xp: midpoint,
        },
      );

      const model = hudModel(data, state, 60000);

      expect(model.energy).toBe(50);
      expect(model.energyCap).toBe(cap);
      expect(model.nextEnergyIn).toBe('1:00');
      expect(model.coins).toBe(9999);
      expect(model.stars).toBe(42);
      expect(model.gems).toBe(7);
      expect(model.level).toBe(1);
      expect(model.levelProgress).toBeCloseTo(0.5, 5);
    });
  });
});
