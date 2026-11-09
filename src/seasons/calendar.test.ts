/**
 * Tests for the season calendar (T14.3).
 */

import { describe, expect, it } from 'vitest';
import { isMonthDay, resolveWindow, type OffsetAt } from './calendar';

/** A UTC timestamp, with a 1-based month. */
function at(year: number, month: number, day: number, hour = 0): number {
  return Date.UTC(year, month - 1, day, hour);
}

const HOUR = 3_600_000;

function fixed(offset: number): OffsetAt {
  return () => offset;
}
const UTC = fixed(0);
const PST = fixed(480);
const TOKYO = fixed(-540);

/**
 * US Pacific time: PDT (420) from 2am on the second Sunday in March to 2am on
 * the first Sunday in November, PST (480) otherwise. 2026–2028 only.
 */
const PDT_SPANS = [
  [at(2026, 3, 8, 10), at(2026, 11, 1, 9)],
  [at(2027, 3, 14, 10), at(2027, 11, 7, 9)],
  [at(2028, 3, 12, 10), at(2028, 11, 5, 9)],
] as const;
const pacific: OffsetAt = (t) =>
  PDT_SPANS.some(([from, to]) => t >= from && t < to) ? 420 : 480;

/** Clocks go forward at midnight on Oct 10, 2027: UTC-3 to UTC-2, so 00:00 never happens. */
const SKIPPED_AT = at(2027, 10, 10, 3);
const midnightSkipped: OffsetAt = (t) => (t < SKIPPED_AT ? 180 : 120);

/** Clocks go back at 1am on Oct 10, 2027: UTC-2 to UTC-3, so 00:00 happens twice. */
const midnightTwice: OffsetAt = (t) => (t < at(2027, 10, 10, 3) ? 120 : 180);

const THANKSGIVING = { start: '11-12', end: '11-30' };
const WINTER = { start: '12-20', end: '01-06' };

describe('resolveWindow', () => {
  it('gives the coming occurrence before the window opens', () => {
    expect(resolveWindow(THANKSGIVING, at(2026, 11, 8), UTC)).toEqual({
      startsAt: at(2026, 11, 12),
      endsAt: at(2026, 12, 1),
    });
  });

  it('gives the running occurrence inside the window', () => {
    expect(resolveWindow(THANKSGIVING, at(2026, 11, 20, 15), UTC)).toEqual({
      startsAt: at(2026, 11, 12),
      endsAt: at(2026, 12, 1),
    });
  });

  it('is open from the first instant of the first day to the end of the last day', () => {
    const thisYear = { startsAt: at(2026, 11, 12), endsAt: at(2026, 12, 1) };
    expect(resolveWindow(THANKSGIVING, thisYear.startsAt, UTC)).toEqual(
      thisYear,
    );
    expect(resolveWindow(THANKSGIVING, thisYear.endsAt - 1, UTC)).toEqual(
      thisYear,
    );
    expect(resolveWindow(THANKSGIVING, thisYear.endsAt, UTC)).toEqual({
      startsAt: at(2027, 11, 12),
      endsAt: at(2027, 12, 1),
    });
  });

  it("gives next year's occurrence once the window has closed", () => {
    expect(resolveWindow(THANKSGIVING, at(2026, 12, 5), UTC)).toEqual({
      startsAt: at(2027, 11, 12),
      endsAt: at(2027, 12, 1),
    });
  });

  it('runs a one-day window for 24 hours', () => {
    const { startsAt, endsAt } = resolveWindow(
      { start: '11-26', end: '11-26' },
      at(2026, 11, 8),
      UTC,
    );
    expect(startsAt).toBe(at(2026, 11, 26));
    expect(endsAt - startsAt).toBe(24 * HOUR);
  });

  describe('a window that wraps into the next year', () => {
    const occurrence = { startsAt: at(2026, 12, 20), endsAt: at(2027, 1, 7) };

    it('gives the coming occurrence before it opens', () => {
      expect(resolveWindow(WINTER, at(2026, 11, 8), UTC)).toEqual(occurrence);
    });

    it('is open in December', () => {
      expect(resolveWindow(WINTER, at(2026, 12, 25), UTC)).toEqual(occurrence);
    });

    it('is open in January, having started the December before', () => {
      expect(resolveWindow(WINTER, at(2027, 1, 3), UTC)).toEqual(occurrence);
    });

    it('gives the next December once it has closed', () => {
      expect(resolveWindow(WINTER, at(2027, 1, 10), UTC)).toEqual({
        startsAt: at(2027, 12, 20),
        endsAt: at(2028, 1, 7),
      });
    });

    it('a window ending Dec 31 ends at New Year', () => {
      expect(
        resolveWindow({ start: '12-01', end: '12-31' }, at(2026, 12, 9), UTC),
      ).toEqual({ startsAt: at(2026, 12, 1), endsAt: at(2027, 1, 1) });
    });
  });

  describe('local time', () => {
    it('starts and ends at local midnight west of UTC', () => {
      expect(resolveWindow(THANKSGIVING, at(2026, 11, 8), PST)).toEqual({
        startsAt: at(2026, 11, 12, 8),
        endsAt: at(2026, 12, 1, 8),
      });
    });

    it('starts and ends at local midnight east of UTC', () => {
      expect(resolveWindow(THANKSGIVING, at(2026, 11, 8), TOKYO)).toEqual({
        startsAt: at(2026, 11, 11, 15),
        endsAt: at(2026, 11, 30, 15),
      });
    });

    it('goes by the local date, not the UTC date', () => {
      // 5am UTC on Nov 12 is still 9pm on Nov 11 in California.
      const now = at(2026, 11, 12, 5);
      expect(resolveWindow(THANKSGIVING, now, PST).startsAt).toBeGreaterThan(
        now,
      );
      expect(resolveWindow(THANKSGIVING, now, UTC).startsAt).toBeLessThan(now);
    });

    it('goes by the local year on New Year’s Eve', () => {
      // 3am UTC on Jan 1, 2027 is still Dec 31, 2026 in California.
      const now = at(2027, 1, 1, 3);
      const newYear = { start: '01-01', end: '01-05' };
      expect(resolveWindow(newYear, now, PST)).toEqual({
        startsAt: at(2027, 1, 1, 8),
        endsAt: at(2027, 1, 6, 8),
      });
      expect(resolveWindow(newYear, now, UTC).startsAt).toBe(at(2027, 1, 1));
    });
  });

  describe('daylight saving', () => {
    it('ends at local midnight after the clocks go forward', () => {
      expect(
        resolveWindow(
          { start: '03-01', end: '04-15' },
          at(2027, 2, 1),
          pacific,
        ),
      ).toEqual({ startsAt: at(2027, 3, 1, 8), endsAt: at(2027, 4, 16, 7) });
    });

    it('ends at local midnight after the clocks go back', () => {
      expect(
        resolveWindow(
          { start: '10-20', end: '11-10' },
          at(2027, 10, 1),
          pacific,
        ),
      ).toEqual({ startsAt: at(2027, 10, 20, 7), endsAt: at(2027, 11, 11, 8) });
    });

    it('can start on the day the clocks go forward', () => {
      expect(
        resolveWindow(
          { start: '03-14', end: '03-20' },
          at(2027, 2, 1),
          pacific,
        ),
      ).toEqual({ startsAt: at(2027, 3, 14, 8), endsAt: at(2027, 3, 21, 7) });
    });

    it('runs 25 hours on a day the clocks go back', () => {
      const { startsAt, endsAt } = resolveWindow(
        { start: '11-07', end: '11-07' },
        at(2027, 10, 1),
        pacific,
      );
      expect(startsAt).toBe(at(2027, 11, 7, 7));
      expect(endsAt - startsAt).toBe(25 * HOUR);
    });

    it('starts a day whose midnight is skipped at the change', () => {
      expect(
        resolveWindow(
          { start: '10-10', end: '10-12' },
          at(2027, 9, 1),
          midnightSkipped,
        ),
      ).toEqual({ startsAt: SKIPPED_AT, endsAt: at(2027, 10, 13, 2) });
    });

    it('ends the day before a skipped midnight at the change', () => {
      expect(
        resolveWindow(
          { start: '10-01', end: '10-09' },
          at(2027, 9, 1),
          midnightSkipped,
        ),
      ).toEqual({ startsAt: at(2027, 10, 1, 3), endsAt: SKIPPED_AT });
    });

    it('starts a day whose midnight happens twice at the first one', () => {
      const { startsAt, endsAt } = resolveWindow(
        { start: '10-10', end: '10-10' },
        at(2027, 9, 1),
        midnightTwice,
      );
      expect(startsAt).toBe(at(2027, 10, 10, 2));
      expect(endsAt).toBe(at(2027, 10, 11, 3));
      expect(endsAt - startsAt).toBe(25 * HOUR);
    });
  });

  it.each([
    ['02-29', '03-05'],
    ['11-12', '11-31'],
    ['11-12', '11/30'],
  ])('refuses the window %s to %s', (start, end) => {
    expect(() => resolveWindow({ start, end }, at(2026, 11, 8), UTC)).toThrow(
      /is not a month-day/,
    );
  });
});

describe('isMonthDay', () => {
  it.each(['01-01', '02-28', '11-26', '12-31'])('accepts "%s"', (value) => {
    expect(isMonthDay(value)).toBe(true);
  });

  it.each(['02-29', '13-01', '00-05', '04-31', '1-05', '11/26', ''])(
    'refuses "%s"',
    (value) => {
      expect(isMonthDay(value)).toBe(false);
    },
  );
});
