/**
 * Hiring, directing and running staff (T10.1, T10.3). A tapper taps its
 * assigned generator chain on its own; a baker shortens bakes (see
 * staffBakeMultiplier in kitchen.ts).
 */

import { tapGenerator } from './generators';
import type {
  ActionResult,
  CellIndex,
  ChainId,
  GameData,
  GameEvent,
  GameState,
  Rng,
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
 * Points a hired tapper at a generator chain, or rests them with null, starting
 * their clock at `now` so time spent idle isn't banked. Throws
 * for someone not hired, a baker (they have no assignment), or a chain that
 * isn't a generator chain.
 */
export function assignStaff(
  data: GameData,
  state: GameState,
  staffId: StaffId,
  chainId: ChainId | null,
  now: Timestamp,
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
        s.staffId === staffId
          ? { ...s, assignedChain: chainId, lastActedAt: now }
          : s,
      ),
    },
    events: [],
  };
}

/**
 * Generator cells on the board for a chain, best tier first, so a tapper works
 * the strongest generator that is ready.
 */
function generatorCells(
  data: GameData,
  state: GameState,
  chainId: ChainId,
): CellIndex[] {
  const found: { cell: CellIndex; tier: number }[] = [];
  state.board.cells.forEach((cell, i) => {
    if (cell.kind !== 'item' || !cell.item.generator) return;
    const item = data.items.get(cell.item.itemId);
    if (item?.chainId === chainId) found.push({ cell: i, tier: item.tier });
  });
  return found.sort((a, b) => b.tier - a.tier).map((f) => f.cell);
}

/**
 * The tick half of staff. Each hired tapper with a chain taps once per
 * intervalSec since they last acted, at most maxCatchUp times (so an absence
 * can't be farmed), spending no energy. A tap that can't happen, because every
 * generator of the chain is resting or the board is full, is lost, not banked.
 * Returns the same state when nobody acted.
 */
export function tickStaff(
  data: GameData,
  state: GameState,
  rng: Rng,
  now: Timestamp,
): ActionResult {
  let next = state;
  const events: GameEvent[] = [];

  for (const hired of state.staff) {
    const def = data.staff.get(hired.staffId);
    if (def?.role !== 'tapper' || hired.assignedChain === null) continue;
    const intervalMs = (def.intervalSec ?? 0) * 1000;
    if (intervalMs <= 0 || now - hired.lastActedAt < intervalMs) continue;

    const due = Math.floor((now - hired.lastActedAt) / intervalMs);
    const taps = Math.min(due, def.maxCatchUp ?? 1);
    for (let k = 0; k < taps; k++) {
      for (const cell of generatorCells(data, next, hired.assignedChain)) {
        // Staff taps are free: top the bar up for the tap, then give it back.
        const energy = next.energy;
        const funded = {
          ...next,
          energy: { value: data.economy.energy.cap, updatedAt: now },
        };
        const r = tapGenerator(data, funded, cell, rng, now);
        if (!r.ok) continue;
        next = { ...r.state, energy };
        events.push(...r.events);
        const spawned = r.events.find((e) => e.type === 'spawned');
        if (spawned?.type === 'spawned') {
          events.push({
            type: 'staffActed',
            staffId: hired.staffId,
            itemId: spawned.itemId,
            cell: spawned.cell,
          });
        }
        break;
      }
    }

    // Keep the beat when under the cap; after a long absence, start fresh.
    const lastActedAt = due > taps ? now : hired.lastActedAt + due * intervalMs;
    next = {
      ...next,
      staff: next.staff.map((s) =>
        s.staffId === hired.staffId ? { ...s, lastActedAt } : s,
      ),
    };
  }

  return { ok: true, state: next, events };
}
