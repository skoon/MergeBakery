/**
 * Holiday fun!'s rules (T14.12). A seasonal order of three items is a Gift
 * order, paying half again in coins: Harvest Supper's Feast rule under a new
 * name.
 *
 * Built on its own into rules.js (T14.7): it may only `import type` from the
 * game.
 */

import type { SeasonRules } from '../../src/core/seasonApi';

const GIFT_ITEMS = 3;
const GIFT_COINS = 1.5;

const rules = {
  apiVersion: 1,
  orderReward: (_ctx, order, reward) =>
    order.seasonPoints !== undefined && order.wants.length >= GIFT_ITEMS
      ? { ...reward, coins: Math.round(reward.coins * GIFT_COINS) }
      : reward,
} satisfies SeasonRules;

export default rules;
