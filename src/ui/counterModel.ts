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
  /** Hometown Pride this order earns; present only on event orders. */
  eventPoints?: number;
  /** Catering (T9.3) and wholesale (T10.4) orders expire; the card says which and when. */
  timed?: { label: 'Catering' | 'Wholesale'; expiresAt: number };
  /** Wholesale: how many of the batch the player holds, of how many. */
  batch?: { have: number; need: number };
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

    // A wholesale batch counts items in the Pantry too; it shows as one icon and a count.
    const need = order.wants.length;
    const onBoard = matches.filter((m) => m !== null).length;
    const inPantry = order.wholesale
      ? state.pantry.items.filter(
          (p) => p.itemId === order.wants[0] && !p.cobwebbed,
        ).length
      : 0;
    const have = Math.min(need, onBoard + inPantry);

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

    const shownWants = order.wholesale
      ? wants.slice(0, 1).map((w) => ({ ...w, ready: have >= need }))
      : wants;
    return {
      orderId: order.id,
      customerName: customer.name,
      // Regulars have expression portraits (T6.1); the counter shows the neutral one.
      portraitKey:
        customer.kind === 'regular'
          ? `${customer.portraitKey}-neutral`
          : customer.portraitKey,
      wants: shownWants,
      coins: order.reward.coins,
      stars: order.reward.stars,
      ...(order.eventPoints !== undefined && {
        eventPoints: order.eventPoints,
      }),
      ...(order.catering && {
        timed: {
          label: 'Catering' as const,
          expiresAt: order.catering.expiresAt,
        },
      }),
      ...(order.wholesale && {
        timed: {
          label: 'Wholesale' as const,
          expiresAt: order.wholesale.expiresAt,
        },
        batch: { have, need },
      }),
      fillable: order.wholesale ? have >= need : wants.every((w) => w.ready),
    };
  });
}
