/**
 * Tests for energy management (T3.1).
 */

import { describe, it, expect } from 'vitest';
import { loadGameData } from './data';
import {
  currentEnergy,
  settleEnergy,
  spendEnergy,
  addEnergy,
  msToNextEnergy,
} from './energy';
import type { EnergyState } from './types';

const data = loadGameData();
const cap = data.economy.energy.cap;
const regenSec = data.economy.energy.regenSec;
const regenMs = regenSec * 1000;

describe('energy', () => {
  describe('currentEnergy', () => {
    it('returns stored value if no time has passed', () => {
      const energy: EnergyState = { value: 50, updatedAt: 1000 };
      expect(currentEnergy(data, energy, 1000)).toBe(50);
    });

    it('adds regen points per full period', () => {
      const energy: EnergyState = { value: 50, updatedAt: 1000 };
      const now = 1000 + regenMs;
      expect(currentEnergy(data, energy, now)).toBe(51);
    });

    it('partial regen gives 1 point and keeps partial progress', () => {
      const energy: EnergyState = { value: 50, updatedAt: 1000 };
      // 1.5 periods: 1 full period gains 1 point, 0.5 periods is kept for next time
      const now = 1000 + Math.floor(1.5 * regenMs);
      expect(currentEnergy(data, energy, now)).toBe(51);
    });

    it('caps at cap', () => {
      const energy: EnergyState = { value: cap - 1, updatedAt: 1000 };
      const now = 1000 + 2 * regenMs;
      expect(currentEnergy(data, energy, now)).toBe(cap);
    });

    it('does not regen if value is at cap', () => {
      const energy: EnergyState = { value: cap, updatedAt: 1000 };
      const now = 1000 + regenMs;
      expect(currentEnergy(data, energy, now)).toBe(cap);
    });

    it('value above cap stays put without capping', () => {
      const energy: EnergyState = { value: cap + 5, updatedAt: 1000 };
      const now = 1000 + regenMs;
      expect(currentEnergy(data, energy, now)).toBe(cap + 5);
    });

    it('returns stored value if clock goes backwards', () => {
      const energy: EnergyState = { value: 50, updatedAt: 1000 };
      expect(currentEnergy(data, energy, 900)).toBe(50);
    });
  });

  describe('settleEnergy', () => {
    it('returns unchanged if no time has passed', () => {
      const energy: EnergyState = { value: 50, updatedAt: 1000 };
      const settled = settleEnergy(data, energy, 1000);
      expect(settled).toEqual(energy);
    });

    it('keeps partial progress (1.5 periods)', () => {
      const energy: EnergyState = { value: 50, updatedAt: 1000 };
      const now = 1000 + Math.floor(1.5 * regenMs);
      const settled = settleEnergy(data, energy, now);
      expect(settled.value).toBe(51);
      expect(settled.updatedAt).toBe(1000 + regenMs);
    });

    it('reaches cap', () => {
      const energy: EnergyState = { value: cap - 1, updatedAt: 1000 };
      const now = 1000 + 2 * regenMs;
      const settled = settleEnergy(data, energy, now);
      expect(settled.value).toBe(cap);
      // updatedAt advanced by 2 periods to reach cap
      expect(settled.updatedAt).toBe(1000 + 2 * regenMs);
    });

    it('stops regen at cap', () => {
      const energy: EnergyState = { value: cap, updatedAt: 1000 };
      const now = 1000 + regenMs;
      const settled = settleEnergy(data, energy, now);
      expect(settled.value).toBe(cap);
      expect(settled.updatedAt).toBe(now);
    });

    it('value above cap stays put at cap', () => {
      const energy: EnergyState = { value: cap + 5, updatedAt: 1000 };
      const now = 1000 + regenMs;
      const settled = settleEnergy(data, energy, now);
      expect(settled.value).toBe(cap + 5);
      expect(settled.updatedAt).toBe(now);
    });

    it('does not change on backward clock', () => {
      const energy: EnergyState = { value: 50, updatedAt: 1000 };
      const settled = settleEnergy(data, energy, 900);
      expect(settled).toEqual(energy);
    });
  });

  describe('spendEnergy', () => {
    it('spends when enough energy', () => {
      const energy: EnergyState = { value: 50, updatedAt: 1000 };
      const result = spendEnergy(data, energy, 10, 1000);
      expect(result).not.toBeNull();
      expect(result!.value).toBe(40);
      expect(result!.updatedAt).toBe(1000);
    });

    it('returns null when not enough energy', () => {
      const energy: EnergyState = { value: 10, updatedAt: 1000 };
      const result = spendEnergy(data, energy, 20, 1000);
      expect(result).toBeNull();
    });

    it('settles before spending', () => {
      const energy: EnergyState = { value: 50, updatedAt: 1000 };
      const now = 1000 + regenMs;
      const result = spendEnergy(data, energy, 1, now);
      expect(result).not.toBeNull();
      expect(result!.value).toBe(50); // Gained 1, spent 1
      expect(result!.updatedAt).toBe(now);
    });

    it('spends from cap starting regen at now', () => {
      const energy: EnergyState = { value: cap, updatedAt: 1000 };
      const now = 2000;
      const spent = spendEnergy(data, energy, 1, now);
      expect(spent).not.toBeNull();
      expect(spent!.value).toBe(cap - 1);
      expect(spent!.updatedAt).toBe(now);
    });

    it('regen works after spending from cap', () => {
      const energy: EnergyState = { value: cap, updatedAt: 1000 };
      const now = 2000;
      const spent = spendEnergy(data, energy, 1, now)!;
      // After spending, we have 99 energy at time 2000
      // At time 2000 + regenMs, should have gained 1, back to cap
      const later = now + regenMs;
      expect(currentEnergy(data, spent, later)).toBe(cap);
    });
  });

  describe('addEnergy', () => {
    it('adds energy', () => {
      const energy: EnergyState = { value: 50, updatedAt: 1000 };
      const result = addEnergy(data, energy, 10, 1000);
      expect(result.value).toBe(60);
      expect(result.updatedAt).toBe(1000);
    });

    it('settles before adding', () => {
      const energy: EnergyState = { value: 50, updatedAt: 1000 };
      const now = 1000 + regenMs;
      const result = addEnergy(data, energy, 5, now);
      expect(result.value).toBe(56); // 50 + 1 regen + 5 added
      expect(result.updatedAt).toBe(now);
    });

    it('goes above cap', () => {
      const energy: EnergyState = { value: cap - 5, updatedAt: 1000 };
      const result = addEnergy(data, energy, 10, 1000);
      expect(result.value).toBe(cap + 5);
    });

    it('adding at cap stops regen', () => {
      const energy: EnergyState = { value: cap - 5, updatedAt: 1000 };
      const result = addEnergy(data, energy, 10, 1000);
      // Now at cap + 5
      const later = 1000 + regenMs;
      expect(currentEnergy(data, result, later)).toBe(cap + 5);
    });
  });

  describe('msToNextEnergy', () => {
    it('returns full period at start', () => {
      const energy: EnergyState = { value: 50, updatedAt: 0 };
      expect(msToNextEnergy(data, energy, 0)).toBe(regenMs);
    });

    it('counts down', () => {
      const energy: EnergyState = { value: 50, updatedAt: 0 };
      const quarter = Math.floor(regenMs / 4);
      const msUntil = msToNextEnergy(data, energy, quarter);
      expect(msUntil).toBe(regenMs - quarter);
    });

    it('counts down further', () => {
      const energy: EnergyState = { value: 50, updatedAt: 0 };
      const threeQuarters = Math.floor((3 * regenMs) / 4);
      const msUntil = msToNextEnergy(data, energy, threeQuarters);
      expect(msUntil).toBe(regenMs - threeQuarters);
    });

    it('returns 1 ms before reaching cap', () => {
      const energy: EnergyState = { value: cap - 1, updatedAt: 0 };
      const almost = regenMs - 1;
      expect(msToNextEnergy(data, energy, almost)).toBe(1);
    });

    it('returns null at cap', () => {
      const energy: EnergyState = { value: cap, updatedAt: 0 };
      expect(msToNextEnergy(data, energy, 0)).toBeNull();
    });

    it('returns null above cap', () => {
      const energy: EnergyState = { value: cap + 5, updatedAt: 0 };
      expect(msToNextEnergy(data, energy, 0)).toBeNull();
    });

    it('returns null after reaching cap', () => {
      const energy: EnergyState = { value: cap - 1, updatedAt: 0 };
      const now = regenMs;
      expect(msToNextEnergy(data, energy, now)).toBeNull();
    });

    it('time until next resets after gaining a point', () => {
      const energy: EnergyState = { value: cap - 2, updatedAt: 0 };
      const now = regenMs;
      // At regenMs, should have gained 1, now at cap - 1
      // Next point is at 2*regenMs
      const msUntil = msToNextEnergy(data, energy, now);
      expect(msUntil).toBe(regenMs);
    });
  });
});
