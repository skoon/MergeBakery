/**
 * Tests for the Shop view model (T7.8).
 */

import { describe, it, expect } from 'vitest';
import { shopModel } from './shopModel';
import { stateWith, testData } from '../core/testing';
import type { Order } from '../core/types';

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

describe('shopModel: for your orders (T13)', () => {
  const [a, b] = [...testData.customers.values()];
  const order = (id: number, customerId: string, wants: string[]): Order => ({
    id,
    customerId,
    wants,
    reward: { coins: 10, stars: 1, xp: 1 },
  });

  it('lists what open orders still need, with who wants it and the price', () => {
    const model = shopModel(
      testData,
      stateWith(
        {},
        {
          coins: 800,
          orders: [
            order(1, a!.id, ['croissant']),
            order(2, b!.id, ['croissant', 'berry']),
          ],
        },
      ),
    );

    expect(model.forOrders).toEqual([
      {
        itemId: 'croissant',
        name: 'Croissant',
        spriteKey: 'croissant',
        detail: `For ${a!.name} and ${b!.name}, 2 needed`,
        price: 768,
        affordable: true,
      },
      {
        itemId: 'berry',
        name: testData.items.get('berry')!.name,
        spriteKey: 'berry',
        detail: `For ${b!.name}`,
        price: 25,
        affordable: true,
      },
    ]);
  });

  it('is empty when the player already has everything the orders want', () => {
    const model = shopModel(
      testData,
      stateWith({ 0: 'berry' }, { orders: [order(1, a!.id, ['berry'])] }),
    );
    expect(model.forOrders).toEqual([]);
  });
});
