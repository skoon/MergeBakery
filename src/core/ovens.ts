/**
 * Oven upgrades for Rise & Shine Bakery (T4.3).
 *
 * Merging two identical, matched ovens in the Kitchen makes the next oven
 * tier, without disturbing running bakes.
 */

import type {
  ActionResult,
  Bake,
  GameData,
  GameState,
  OvenDef,
  OvenId,
  OvenState,
} from './types';

/**
 * The oven one tier up, or null at the top tier. Throws on an unknown id.
 */
export function nextOven(data: GameData, ovenId: OvenId): OvenDef | null {
  const oven = data.ovens.get(ovenId);
  if (!oven) {
    throw new Error(`nextOven: unknown oven id "${ovenId}"`);
  }

  for (const candidate of data.ovens.values()) {
    if (candidate.tier === oven.tier + 1) {
      return candidate;
    }
  }

  return null;
}

/**
 * Merges kitchen.ovens[from] into kitchen.ovens[to]. Throws RangeError for an
 * index that doesn't exist.
 * Rejects, in order: 'sameCell' when from === to; 'ovensDontMatch' when their
 * oven ids differ; 'ovenMaxTier' when there is no next tier; 'slotBusy' when
 * the two ovens hold more bakes (running or finished) than the new oven has
 * slots.
 * Otherwise the upgraded oven takes `to`'s place in the list. Its slots are
 * `to`'s bakes, then `from`'s bakes (each in slot order, skipping empty
 * slots), then null up to its slot count. `from` is removed from the list.
 * Bakes keep their startedAt and endsAt; the new multiplier only applies to
 * bakes loaded later.
 * Event: ovenUpgraded { oven: the upgraded oven's index after `from` is
 * removed, ovenId }.
 */
export function mergeOvens(
  data: GameData,
  state: GameState,
  from: number,
  to: number,
): ActionResult {
  const ovens = state.kitchen.ovens;

  if (from < 0 || from >= ovens.length) {
    throw new RangeError(
      `mergeOvens: from ${from} is out of range [0, ${ovens.length})`,
    );
  }
  if (to < 0 || to >= ovens.length) {
    throw new RangeError(
      `mergeOvens: to ${to} is out of range [0, ${ovens.length})`,
    );
  }

  if (from === to) {
    return { ok: false, reason: 'sameCell' };
  }

  const fromOven = ovens[from];
  const toOven = ovens[to];
  if (!fromOven || !toOven) {
    throw new RangeError(
      `mergeOvens: oven state at index ${from} or ${to} is undefined`,
    );
  }

  if (fromOven.ovenId !== toOven.ovenId) {
    return { ok: false, reason: 'ovensDontMatch' };
  }

  const upgraded = nextOven(data, toOven.ovenId);
  if (!upgraded) {
    return { ok: false, reason: 'ovenMaxTier' };
  }

  const toBakes = toOven.slots.filter((bake): bake is Bake => bake !== null);
  const fromBakes = fromOven.slots.filter(
    (bake): bake is Bake => bake !== null,
  );

  if (toBakes.length + fromBakes.length > upgraded.slots) {
    return { ok: false, reason: 'slotBusy' };
  }

  const newSlots: (Bake | null)[] = [...toBakes, ...fromBakes];
  while (newSlots.length < upgraded.slots) {
    newSlots.push(null);
  }

  const upgradedOvenState: OvenState = { ovenId: upgraded.id, slots: newSlots };

  const newOvens = [...ovens];
  newOvens[to] = upgradedOvenState;
  newOvens.splice(from, 1);

  const upgradedIndex = to > from ? to - 1 : to;

  const newState: GameState = { ...state, kitchen: { ovens: newOvens } };

  return {
    ok: true,
    state: newState,
    events: [
      { type: 'ovenUpgraded', oven: upgradedIndex, ovenId: upgraded.id },
    ],
  };
}
