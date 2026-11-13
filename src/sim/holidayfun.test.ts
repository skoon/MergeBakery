/**
 * Holiday fun! through the simulator (T14.12): the bot plays from a week
 * before the window to the day it closes, once joining the season and once
 * not, with the same seeds. Prints the season report; checks that every seed
 * reaches the last milestone and that not joining changes nothing seasonal.
 */

import { describe, expect, it } from 'vitest';
import { testData } from '../core/testing';
import { parseSeasonPack, withSeasons } from '../seasons/pack';
import json from '../../seasons/holidayfun/season.json';
import rules from '../../seasons/holidayfun/rules';
import { DEFAULT_OPTIONS, simulate, type SimReport } from './simulate';

/** Day 1 is Nov 24; the window opens on day 8 (Dec 1) and closes as day 33 (Dec 26) begins. */
const START = Date.UTC(2026, 10, 24);
const OPENS = Date.UTC(2026, 11, 1);
const CLOSES = Date.UTC(2026, 11, 26);
const DAYS = 33;
const SEEDS = [1, 2, 3];
const OPTIONS = {
  ...DEFAULT_OPTIONS,
  maxSessionMin: 20,
  days: DAYS,
  start: START,
};

const data = withSeasons(testData, [
  {
    pack: parseSeasonPack(testData, json),
    startsAt: OPENS,
    endsAt: CLOSES,
    rules,
  },
]);
const milestones = data.seasons.get('holidayfun')?.def.milestones ?? [];
const lastChapter = [...data.chapters.keys()].at(-1) ?? '';

/** The day the base game's last chapter was finished, or "—". */
function finishedDay(run: SimReport | undefined): string {
  const done = run?.chapterDoneAt[lastChapter];
  return done ? done.day.toString() : '—';
}

function printSeasonReport(joined: SimReport[], notJoined: SimReport[]): void {
  const lines = [
    '',
    'Holiday fun! (window: days 8–32)',
    `Milestones: ${milestones.map((m) => m.points.toString()).join(', ')} points`,
  ];
  joined.forEach((run, i) => {
    const s = run.season;
    const other = notJoined[i];
    lines.push(
      `seed ${run.seed.toString()}: joined day ${String(s.joinedDay)}, ${s.points.toString()} points; ` +
        `milestones on days ${s.milestoneDays.map((d) => (d === null ? '—' : d.toString())).join(', ')}; ` +
        `keepsakes ${s.keepsakes.join(', ') || 'none'}`,
      // The simulator counts every seasonal order of three or more items as a
      // Feast; for this pack that is a Gift order.
      `  seasonal orders ${s.ordersDelivered.toString()}/${s.ordersArrived.toString()} delivered, ` +
        `${s.feasts.toString()} Gift orders, ${s.orderCoins.toString()} coins from them, ${s.endCoins.toString()} for items left at the end`,
      `  joined vs not: tasks done ${run.tasksDone.toString()} vs ${String(other?.tasksDone)}, ` +
        `last chapter finished on day ${finishedDay(run)} vs ${finishedDay(other)}, ` +
        `level ${run.finalLevel.toString()} vs ${String(other?.finalLevel)}, ` +
        `coins ${run.finalCoins.toString()} vs ${String(other?.finalCoins)}`,
    );
  });
  console.log(lines.join('\n'));
}

describe('Holiday fun! in the simulator', () => {
  it(
    'reaches the last milestone in the window, and changes nothing when not joined',
    { timeout: 900_000 },
    () => {
      const joined = SEEDS.map((seed) =>
        simulate(data, { ...OPTIONS, seed, joinSeason: 'holidayfun' }),
      );
      const notJoined = SEEDS.map((seed) =>
        simulate(data, { ...OPTIONS, seed }),
      );
      printSeasonReport(joined, notJoined);

      for (const run of joined) {
        const s = run.season;
        expect(s.joinedDay, `seed ${run.seed.toString()}`).toBe(8);
        expect(
          s.milestoneDays.at(-1),
          `seed ${run.seed.toString()} never reached the last milestone`,
        ).not.toBeNull();
        expect(s.keepsakes).toEqual([
          'holidayfun-star',
          'holidayfun-gingerbread-house',
        ]);
        expect(run.finalState.season).toBeNull();
        expect(run.finalState.seasonResult?.seasonId).toBe('holidayfun');
      }
      for (const run of notJoined) {
        expect(run.season).toMatchObject({
          joinedDay: null,
          points: 0,
          keepsakes: [],
          ordersArrived: 0,
          ordersDelivered: 0,
        });
        expect(
          run.finalState.discovered.some((id) => id.startsWith('holidayfun-')),
        ).toBe(false);
      }
    },
  );
});
