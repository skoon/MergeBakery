/**
 * Tests for the Shop view model (T7.8).
 */

import { describe, it, expect } from 'vitest';
import { shopModel } from './shopModel';
import { stateWith, testData } from '../core/testing';

describe('shopModel', () => {
  it("lists the real Chapter 1 rows with each one's art, detail and affordability", () => {
    const model = shopModel(testData, stateWith({}, { coins: 400 }));
    const mill = model.rows.find((r) => r.id === 'shop-flour-mill');
    const snack = model.rows.find((r) => r.id === 'shop-energy-small');

    expect(model.coins).toBe(400);
    expect(mill).toMatchObject({
      spriteKey: 'flour-mill-1',
      price: 400,
      affordable: true,
    });
    expect(mill?.detail).toMatch(/taps/);
    expect(snack).toMatchObject({
      spriteKey: 'energy-jar',
      detail: '+25 energy',
    });
    expect(
      model.rows.find((r) => r.id === 'shop-energy-large')?.affordable,
    ).toBe(false);
  });

  it('offers the next Pantry slot at its price', () => {
    const state = stateWith({}, { coins: 0 });
    const model = shopModel(testData, state);

    expect(model.pantrySlot).toEqual({
      price: testData.economy.pantry.slotCosts[0],
      affordable: false,
      capacity: state.pantry.capacity,
    });
  });

  it('stops offering Pantry slots once the Pantry is at its largest', () => {
    const base = stateWith({});
    const { startSlots, slotCosts } = testData.economy.pantry;
    const state = {
      ...base,
      pantry: { ...base.pantry, capacity: startSlots + slotCosts.length },
    };

    expect(shopModel(testData, state).pantrySlot).toBeNull();
  });
});
