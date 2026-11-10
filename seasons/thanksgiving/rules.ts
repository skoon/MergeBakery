/**
 * Harvest Supper's rules (T14.9). Pecans turn up at every Flour Mill, and a
 * seasonal order of three items is a Feast, paying half again in coins.
 *
 * Built on its own into rules.js (T14.7): it may only `import type` from the
 * game.
 */

import type { SeasonRules } from '../../src/core/seasonApi';

const FLOUR_MILLS: ReadonlySet<string> = new Set([
  'flour-mill-1',
  'flour-mill-2',
  'flour-mill-3',
]);
/** Against a mill's own table, whose weights add up to 100. */
const PECAN_WEIGHT = 10;
const FEAST_ITEMS = 3;
const FEAST_COINS = 1.5;

const rules = {
  apiVersion: 1,
  extraSpawns: (_ctx, generatorItemId) =>
    FLOUR_MILLS.has(generatorItemId)
      ? [{ itemId: 'thanksgiving-pecan', weight: PECAN_WEIGHT }]
      : [],
  orderReward: (_ctx, order, reward) =>
    order.seasonPoints !== undefined && order.wants.length >= FEAST_ITEMS
      ? { ...reward, coins: Math.round(reward.coins * FEAST_COINS) }
      : reward,
} satisfies SeasonRules;

export default rules;
