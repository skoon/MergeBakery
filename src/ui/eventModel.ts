/**
 * MegaBun event display data (T8.5). Pure; no DOM and no clock of its own.
 */

import { megabunScore } from '../core/events';
import type { GameData, GameState, Timestamp } from '../core/types';

export interface MilestoneView {
  readonly index: number;
  readonly points: number;
  /** "50 coins, 2 gems". */
  readonly rewardText: string;
  readonly status: 'claimed' | 'ready' | 'locked';
}

export interface EventModel {
  readonly name: string;
  /** "2 d 4 h", "3 h 12 min", "5 min". */
  readonly timeLeft: string;
  readonly points: number;
  /** MegaBun's score now, rounded down. */
  readonly megabun: number;
  /** What the player must reach to win: MegaBun's final score. */
  readonly target: number;
  /** Bar lengths, 0–1, on one shared scale. */
  readonly playerProgress: number;
  readonly megabunProgress: number;
  readonly ahead: boolean;
  readonly milestones: readonly MilestoneView[];
  /** Milestones ready to claim, for the button badge. */
  readonly claimable: number;
}

export function formatTimeLeft(ms: number): string {
  const minutes = Math.max(0, Math.ceil(ms / 60_000));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days.toString()} d ${(hours % 24).toString()} h`;
  if (hours > 0) {
    return `${hours.toString()} h ${(minutes % 60).toString()} min`;
  }
  return `${minutes.toString()} min`;
}

function rewardText(coins: number, gems: number): string {
  const parts: string[] = [];
  if (coins > 0) parts.push(`${coins.toString()} coins`);
  if (gems > 0) parts.push(`${gems.toString()} gems`);
  return parts.join(', ');
}

/** Null when no event is running. */
export function eventModel(
  data: GameData,
  state: GameState,
  now: Timestamp,
): EventModel | null {
  const active = state.event;
  if (!active) return null;
  const def = data.events.get(active.eventId);
  if (!def) throw new Error(`eventModel: unknown event "${active.eventId}"`);

  const elapsedSec = Math.max(0, (now - active.startedAt) / 1000);
  const megabun = Math.floor(megabunScore(def, elapsedSec));
  const target = megabunScore(def, def.durationSec);
  const scale = Math.max(
    target,
    active.points,
    def.milestones[def.milestones.length - 1]?.points ?? 0,
    1,
  );

  const milestones = def.milestones.map((m, index): MilestoneView => {
    const claimed = active.claimedMilestones.includes(index);
    return {
      index,
      points: m.points,
      rewardText: rewardText(m.reward.coins, m.reward.gems),
      status: claimed
        ? 'claimed'
        : active.points >= m.points
          ? 'ready'
          : 'locked',
    };
  });

  return {
    name: def.name,
    timeLeft: formatTimeLeft(active.endsAt - now),
    points: active.points,
    megabun,
    target: Math.round(target),
    playerProgress: Math.min(1, active.points / scale),
    megabunProgress: Math.min(1, megabun / scale),
    ahead: active.points >= megabun,
    milestones,
    claimable: milestones.filter((m) => m.status === 'ready').length,
  };
}

/** The result card's lines; null when there is no result to show. */
export function eventResultLines(
  data: GameData,
  state: GameState,
): { title: string; lines: string[] } | null {
  const result = state.eventResult;
  if (!result) return null;
  const name = data.events.get(result.eventId)?.name ?? 'The event';
  const lines = [`Hometown Pride: ${result.points.toString()}`];
  if (result.coins > 0) {
    lines.push(`Event items sold for ${result.coins.toString()} coins`);
  }
  return {
    title: result.won ? `${name}: you won!` : `${name} is over`,
    lines: result.won
      ? lines
      : [...lines, 'MegaBun took this one. The town still loves you.'],
  };
}
