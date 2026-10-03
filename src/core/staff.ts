/**
 * Hiring and directing staff (T10.1). What a hired tapper or baker actually
 * does comes in T10.3.
 */

import type {
  ActionResult,
  ChainId,
  GameData,
  GameState,
  StaffId,
  Timestamp,
} from './types';

/** Hires someone: needs the chapter, the reputation and the coins, and only once. */
export function hireStaff(
  data: GameData,
  state: GameState,
  staffId: StaffId,
  now: Timestamp,
): ActionResult {
  const def = data.staff.get(staffId);
  if (!def) throw new Error(`hireStaff: unknown staff "${staffId}"`);

  if (state.staff.some((s) => s.staffId === staffId)) {
    return { ok: false, reason: 'alreadyCompleted' };
  }
  const chapterIds = [...data.chapters.keys()];
  if (
    chapterIds.indexOf(state.chapterId) < chapterIds.indexOf(def.minChapter)
  ) {
    return { ok: false, reason: 'prerequisitesMissing' };
  }
  if (state.reputation < def.minReputation) {
    return { ok: false, reason: 'notEnoughReputation' };
  }
  if (state.coins < def.hireCost) {
    return { ok: false, reason: 'notEnoughCoins' };
  }

  return {
    ok: true,
    state: {
      ...state,
      coins: state.coins - def.hireCost,
      staff: [
        ...state.staff,
        { staffId, assignedChain: null, lastActedAt: now },
      ],
    },
    events: [{ type: 'staffHired', staffId }],
  };
}

/**
 * Points a hired tapper at a generator chain, or rests them with null. Throws
 * for someone not hired, a baker (they have no assignment), or a chain that
 * isn't a generator chain.
 */
export function assignStaff(
  data: GameData,
  state: GameState,
  staffId: StaffId,
  chainId: ChainId | null,
): ActionResult {
  const hired = state.staff.find((s) => s.staffId === staffId);
  if (!hired) throw new Error(`assignStaff: "${staffId}" is not hired`);
  if (data.staff.get(staffId)?.role !== 'tapper') {
    throw new Error(`assignStaff: "${staffId}" is not a tapper`);
  }
  if (chainId !== null && data.chains.get(chainId)?.kind !== 'generator') {
    throw new Error(`assignStaff: "${chainId}" is not a generator chain`);
  }
  if (hired.assignedChain === chainId) return { ok: true, state, events: [] };

  return {
    ok: true,
    state: {
      ...state,
      staff: state.staff.map((s) =>
        s.staffId === staffId ? { ...s, assignedChain: chainId } : s,
      ),
    },
    events: [],
  };
}
