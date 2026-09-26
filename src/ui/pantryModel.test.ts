/**
 * Tests for the Pantry drawer view model (T3.11).
 */

import { describe, it, expect } from 'vitest';
import { pantryModel } from './pantryModel';
import { stateWith, testData } from '../core/testing';

describe('pantryModel', () => {
  it('describes an empty 4-slot Pantry', () => {
    const state = stateWith({});
    const model = pantryModel(testData, state);

    expect(model.capacity).toBe(testData.economy.pantry.startSlots);
    expect(model.used).toBe(0);
    expect(model.slots.length).toBe(testData.economy.pantry.startSlots);
    expect(model.slots.every((slot) => slot === null)).toBe(true);
  });

  it('describes a partly filled Pantry', () => {
    const state = stateWith(
      {},
      {
        pantry: {
          capacity: 4,
          items: [
            { itemId: 'wheat-stalk', cobwebbed: false, generator: null },
            { itemId: 'milk-splash', cobwebbed: false, generator: null },
          ],
        },
      },
    );
    const model = pantryModel(testData, state);

    expect(model.capacity).toBe(4);
    expect(model.used).toBe(2);
    expect(model.slots.length).toBe(4);

    const wheatItem = testData.items.get('wheat-stalk');
    const milkItem = testData.items.get('milk-splash');

    expect(model.slots[0]).toEqual({
      itemId: 'wheat-stalk',
      name: wheatItem?.name,
      spriteKey: wheatItem?.spriteKey,
    });
    expect(model.slots[1]).toEqual({
      itemId: 'milk-splash',
      name: milkItem?.name,
      spriteKey: milkItem?.spriteKey,
    });
    expect(model.slots[2]).toBeNull();
    expect(model.slots[3]).toBeNull();
  });

  it("gives the next slot's cost", () => {
    const startSlots = testData.economy.pantry.startSlots;
    const slotCosts = testData.economy.pantry.slotCosts;

    const state = stateWith(
      {},
      { pantry: { capacity: startSlots, items: [] }, coins: 999999 },
    );
    const model = pantryModel(testData, state);

    expect(model.nextSlotCost).toBe(slotCosts[0]);
    expect(model.canAffordSlot).toBe(true);
  });

  it('reports canAffordSlot false with too few coins', () => {
    const startSlots = testData.economy.pantry.startSlots;
    const slotCosts = testData.economy.pantry.slotCosts;
    const cost = slotCosts[0];
    if (cost === undefined) throw new Error('slotCosts[0] not found');

    const state = stateWith(
      {},
      { pantry: { capacity: startSlots, items: [] }, coins: cost - 1 },
    );
    const model = pantryModel(testData, state);

    expect(model.nextSlotCost).toBe(cost);
    expect(model.canAffordSlot).toBe(false);
  });

  it('has a null nextSlotCost once every slot is bought', () => {
    const startSlots = testData.economy.pantry.startSlots;
    const slotCosts = testData.economy.pantry.slotCosts;
    const maxSlots = startSlots + slotCosts.length;

    const state = stateWith(
      {},
      { pantry: { capacity: maxSlots, items: [] }, coins: 999999 },
    );
    const model = pantryModel(testData, state);

    expect(model.nextSlotCost).toBeNull();
    expect(model.canAffordSlot).toBe(false);
    expect(model.slots.length).toBe(maxSlots);
  });
});
