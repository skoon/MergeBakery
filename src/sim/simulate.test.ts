/**
 * Balancing simulator (T-O3). `npm run balance` prints the report; the tests
 * only check the simulator itself, not the balance, so tuning the data never
 * breaks the build.
 */

import { describe, it, expect } from 'vitest';
import { DEFAULT_OPTIONS, simulate, type SimReport } from './simulate';
import { testData } from '../core/testing';

const SEEDS = [1, 2, 3, 4, 5];
const OPTIONS = { ...DEFAULT_OPTIONS, maxSessionMin: 20 };

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
    `\nBalance report: ${reports.length.toString()} seeds, ${OPTIONS.days.toString()} days, sessions at ${OPTIONS.sessionStarts.join(', ')} h\n`,
  );
  lines.push('Per session (mean over seeds):');
  lines.push(
    'day.s   min   taps  merges orders stars tasks  bar-empty@min  orders-on-bar  lvl-ups  ended',
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
        `  ${[...new Set(s.map((x) => x.endedBecause))].join('/')}`,
      ].join(' '),
    );
  });

  lines.push('\nPer seed:');
  for (const r of reports) {
    const done = r.chapterDoneAt
      ? `day ${r.chapterDoneAt.day.toString()}, session ${r.chapterDoneAt.session.toString()}`
      : `not finished (${r.tasksDone.toString()}/20 tasks)`;
    lines.push(
      `  seed ${r.seed.toString()}: chapter ${done}; first croissant after ${r.firstCroissantAtMin === null ? 'never' : `${fmt(r.firstCroissantAtMin)} min played`}; level ${r.finalLevel.toString()}, ${r.finalStars.toString()} stars left, ${r.finalCoins.toString()} coins`,
    );
  }
  console.log(lines.join('\n'));
}

describe('simulate', () => {
  it('is deterministic for a seed', () => {
    const options = { ...OPTIONS, days: 1 };

    expect(simulate(testData, { ...options, seed: 7 })).toEqual(
      simulate(testData, { ...options, seed: 7 }),
    );
  });

  it('plays every session and makes progress', () => {
    const report = simulate(testData, { ...OPTIONS, days: 1 });

    expect(report.sessions).toHaveLength(OPTIONS.sessionStarts.length);
    expect(report.sessions[0]?.taps).toBeGreaterThan(0);
    expect(report.sessions[0]?.merges).toBeGreaterThan(0);
  });

  it('prints the balance report', () => {
    const reports = SEEDS.map((seed) =>
      simulate(testData, { ...OPTIONS, seed }),
    );
    printReport(reports);
    expect(reports).toHaveLength(SEEDS.length);
  });
});
