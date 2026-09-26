/**
 * Counter strip model: one card per open order (T3.9).
 * Pure function; no DOM, rendering, or Date.now() calls.
 */

import type { GameData, GameState, ItemId, OrderId } from '../core/types';
import { matchOrderItems } from '../core/deliver';

export interface OrderCard {
  orderId: OrderId;
  customerName: string;
  portraitKey: string;
  wants: { itemId: ItemId; name: string; spriteKey: string; ready: boolean }[];
  coins: number;
  stars: number;
  fillable: boolean;
}

/**
 * One card per open order, in order. `ready` comes from matchOrderItems;
 * fillable when every item is ready.
 */
export function counterCards(data: GameData, state: GameState): OrderCard[] {
  return state.orders.map((order) => {
    const customer = data.customers.get(order.customerId);
    if (customer === undefined) {
      throw new Error(
        `counterCards: unknown customer id "${order.customerId}"`,
      );
    }

    const matches = matchOrderItems(state, order.wants);

    const wants = order.wants.map((itemId, i) => {
      const item = data.items.get(itemId);
      if (item === undefined) {
        throw new Error(`counterCards: unknown item id "${itemId}"`);
      }
      return {
        itemId,
        name: item.name,
        spriteKey: item.spriteKey,
        ready: matches[i] !== null,
      };
    });

    return {
      orderId: order.id,
      customerName: customer.name,
      portraitKey: customer.portraitKey,
      wants,
      coins: order.reward.coins,
      stars: order.reward.stars,
      fillable: wants.every((w) => w.ready),
    };
  });
}
