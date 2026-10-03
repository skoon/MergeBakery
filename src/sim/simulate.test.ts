/**
 * Balancing simulator (T-O3). `npm run balance` prints the report; the tests
 * only check the simulator itself, not the balance, so tuning the data never
 * breaks the build.
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_OPTIONS,
  simulate,
  type EventRun,
  type SimReport,
} from './simulate';
import { testData } from '../core/testing';

const SEEDS = [1, 2, 3, 4, 5];
const OPTIONS = { ...DEFAULT_OPTIONS, maxSessionMin: 20 };
// Long enough for the bot to get through Chapter 2 as well.
const REPORT_DAYS = 10;

function mean(values: number[]): number {
  return values.length === 0
    ? NaN
    : values.reduce((a, b) => a + b, 0) / values.length;
}

function fmt(value: number, digits = 1): string {
  return Number.isNaN(value) ? '—' : value.toFixed(digits);
}

function printReport(reports: SimReport[]): void {
  const lines: string[] = [];
  const first = reports[0];
  if (!first) return;

  lines.push(
    `\nBalance report: ${reports.length.toString()} seeds, ${REPORT_DAYS.toString()} days, sessions at ${OPTIONS.sessionStarts.join(', ')} h\n`,
  );
  lines.push('Per session (mean over seeds):');
  lines.push(
    'day.s   min   taps  merges orders stars tasks  bar-empty@min  orders-on-bar  lvl-ups  coins  bought  ended',
  );
  first.sessions.forEach((_, i) => {
    const s = reports.map((r) => r.sessions[i]).filter((x) => x !== undefined);
    const ref = s[0];
    if (!ref) return;
    const empty = s
      .map((x) => x.energyEmptyAtMin)
      .filter((x): x is number => x !== null);
    lines.push(
      [
        `${ref.day.toString()}.${ref.index.toString()}`.padEnd(6),
        fmt(mean(s.map((x) => x.minutes))).padStart(5),
        fmt(mean(s.map((x) => x.taps)), 0).padStart(6),
        fmt(mean(s.map((x) => x.merges)), 0).padStart(7),
        fmt(mean(s.map((x) => x.orders))).padStart(6),
        fmt(mean(s.map((x) => x.stars))).padStart(6),
        fmt(mean(s.map((x) => x.tasks.length))).padStart(6),
        (empty.length ? fmt(mean(empty)) : 'never').padStart(14),
        fmt(mean(s.map((x) => x.ordersOnFullBar))).padStart(14),
        fmt(mean(s.map((x) => x.levelUps))).padStart(8),
        fmt(mean(s.map((x) => x.coinsAtEnd)), 0).padStart(6),
        fmt(mean(s.map((x) => x.bought.length))).padStart(7),
        `  ${[...new Set(s.map((x) => x.endedBecause))].join('/')}`,
      ].join(' '),
    );
  });

  lines.push('\nPer seed:');
  for (const r of reports) {
    const done = Object.entries(r.chapterDoneAt)
      .map(([id, at]) => `${id} d${at.day.toString()}s${at.session.toString()}`)
      .join(', ');
    lines.push(
      `  seed ${r.seed.toString()}: chapters done: ${done || 'none'} (${r.tasksDone.toString()} tasks); first croissant after ${r.firstCroissantAtMin === null ? 'never' : `${fmt(r.firstCroissantAtMin)} min played`}; level ${r.finalLevel.toString()}, ${r.finalStars.toString()} stars left, ${r.finalCoins.toString()} coins`,
    );
  }
  console.log(lines.join('\n'));
}

/** Each event on its own, with a short gap so it starts as soon as Chapter 2 does. */
function printEventReport(): EventRun[] {
  const lines = [
    '\nEvent balance: the bot, one event at a time (2 seeds, 10 days)\n',
  ];
  const all: EventRun[] = [];
  for (const def of testData.events.values()) {
    const only = {
      ...testData,
      events: new Map([[def.id, { ...def, gapAfterSec: 3600 }]]),
    };
    for (const seed of [1, 2]) {
      const report = simulate(only, { ...OPTIONS, days: REPORT_DAYS, seed });
      for (const run of report.events) {
        all.push(run);
        lines.push(
          `  ${def.id.padEnd(16)} seed ${seed.toString()}: started day ${run.startDay.toString()}, ${run.points.toString()}/${run.target.toString()} points, ${run.won ? 'won' : 'lost'}, target reached after ${run.sessionsToTarget === null ? 'never' : run.sessionsToTarget.toString()} of ${run.sessionsRun.toString()} sessions`,
        );
      }
      if (report.events.length === 0) {
        lines.push(
          `  ${def.id.padEnd(16)} seed ${seed.toString()}: no event finished`,
        );
      }
    }
  }
  console.log(lines.join('\n'));
  return all;
}

describe('simulate', () => {
  // Whole simulated days of play: slower than a unit test, especially under the
  // full suite's parallel load.
  it('is deterministic for a seed', { timeout: 60_000 }, () => {
    const options = { ...OPTIONS, days: 1 };

    expect(simulate(testData, { ...options, seed: 7 })).toEqual(
      simulate(testData, { ...options, seed: 7 }),
    );
  });

  it('plays every session and makes progress', { timeout: 60_000 }, () => {
    const report = simulate(testData, { ...OPTIONS, days: 1 });

    expect(report.sessions).toHaveLength(OPTIONS.sessionStarts.length);
    expect(report.sessions[0]?.taps).toBeGreaterThan(0);
    expect(report.sessions[0]?.merges).toBeGreaterThan(0);
  });

  it('prints the balance report', { timeout: 300_000 }, () => {
    const reports = SEEDS.map((seed) =>
      simulate(testData, { ...OPTIONS, days: REPORT_DAYS, seed }),
    );
    printReport(reports);
    expect(reports).toHaveLength(SEEDS.length);
  });

  it('prints the event balance report', { timeout: 600_000 }, () => {
    const runs = printEventReport();
    expect(runs.length).toBeGreaterThanOrEqual(0);
  });
});
