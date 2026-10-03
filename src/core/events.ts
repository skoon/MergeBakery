/**
 * MegaBun events: the schedule, MegaBun's score, and the milestone and result
 * actions (T8.1, T8.2). The event generator comes in T8.3, event orders in T8.4.
 */

import type {
  ActionResult,
  EventDef,
  GameData,
  GameEvent,
  GameState,
  Rng,
  Timestamp,
} from './types';

/** MegaBun's score `elapsedSec` into an event: linear between curve points, flat after the last. */
export function megabunScore(def: EventDef, elapsedSec: number): number {
  const curve = def.megabunCurve;
  for (let i = 1; i < curve.length; i++) {
    const a = curve[i - 1];
    const b = curve[i];
    if (!a || !b) continue;
    if (elapsedSec <= b.atSec) {
      const t = (Math.max(elapsedSec, a.atSec) - a.atSec) / (b.atSec - a.atSec);
      return a.score + (b.score - a.score) * t;
    }
  }
  return curve[curve.length - 1]?.score ?? 0;
}

/**
 * The tick half of events. Ends the running event once its time is up (win if
 * the points reach MegaBun's final score; a win pays trophyGems and is recorded
 * in `trophies`), schedules the next one `gapAfterSec` after the end, and starts
 * it when due, drawing from the events the player's chapter has reached.
 * Nothing starts while one is running, so events never overlap.
 */
export function tickEvents(
  data: GameData,
  state: GameState,
  rng: Rng,
  now: Timestamp,
): ActionResult {
  const events: GameEvent[] = [];
  let next = state;
  const active = next.event;

  if (active && now >= active.endsAt) {
    const def = data.events.get(active.eventId);
    if (!def) throw new Error(`tickEvents: unknown event "${active.eventId}"`);
    const won = active.points >= megabunScore(def, def.durationSec);
    next = {
      ...next,
      event: null,
      eventResult: { eventId: def.id, won, points: active.points },
      gems: next.gems + (won ? def.trophyGems : 0),
      trophies: won ? [...next.trophies, def.id] : next.trophies,
      nextEventAt: active.endsAt + def.gapAfterSec * 1000,
    };
    events.push({ type: 'eventEnded', eventId: def.id, won });
  }

  if (!next.event) {
    const chapterIds = [...data.chapters.keys()];
    const reached = chapterIds.indexOf(next.chapterId);
    const eligible = [...data.events.values()].filter(
      (e) => chapterIds.indexOf(e.minChapter) <= reached,
    );
    if (eligible.length > 0) {
      // The first event comes one gap after the player first qualifies.
      if (next.nextEventAt === null) {
        const first = eligible[0];
        if (first) {
          next = { ...next, nextEventAt: now + first.gapAfterSec * 1000 };
        }
      } else if (now >= next.nextEventAt) {
        const def = eligible[Math.floor(rng.next() * eligible.length)];
        if (def) {
          next = {
            ...next,
            nextEventAt: null,
            event: {
              eventId: def.id,
              startedAt: now,
              endsAt: now + def.durationSec * 1000,
              points: 0,
              claimedMilestones: [],
            },
          };
          events.push({ type: 'eventStarted', eventId: def.id });
        }
      }
    }
  }

  return { ok: true, state: next, events };
}

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
