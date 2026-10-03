/**
 * MegaBun event actions (T8.1): claiming a milestone and dismissing the result
 * card. Scheduling, expiry and event orders come in T8.2–T8.4.
 */

import type { ActionResult, GameData, GameState } from './types';

/** Pays a reached milestone of the running event, once. */
export function claimMilestone(
  data: GameData,
  state: GameState,
  index: number,
): ActionResult {
  const active = state.event;
  if (!active) return { ok: false, reason: 'noActiveEvent' };

  const def = data.events.get(active.eventId);
  if (!def)
    throw new Error(`claimMilestone: unknown event "${active.eventId}"`);
  const milestone = def.milestones[index];
  if (!milestone)
    throw new Error(`claimMilestone: no milestone ${index.toString()}`);

  if (active.claimedMilestones.includes(index)) {
    return { ok: false, reason: 'alreadyCompleted' };
  }
  if (active.points < milestone.points) {
    return { ok: false, reason: 'milestoneNotReached' };
  }

  return {
    ok: true,
    state: {
      ...state,
      coins: state.coins + milestone.reward.coins,
      gems: state.gems + milestone.reward.gems,
      event: {
        ...active,
        claimedMilestones: [...active.claimedMilestones, index],
      },
    },
    events: [
      {
        type: 'milestoneClaimed',
        eventId: active.eventId,
        index,
        reward: milestone.reward,
      },
    ],
  };
}

/** Clears the result card. Nothing to dismiss changes nothing. */
export function dismissEventResult(state: GameState): ActionResult {
  if (!state.eventResult) return { ok: true, state, events: [] };
  return { ok: true, state: { ...state, eventResult: null }, events: [] };
}
