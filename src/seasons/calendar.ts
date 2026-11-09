/**
 * Season calendar (T14.3): a pack's yearly "MM-DD" window resolved to real
 * timestamps in the player's local dates.
 *
 * Pure. The time zone arrives as `offsetAt`, asked per instant so a window
 * that crosses a daylight-saving change still starts and ends at local
 * midnight. The loader (T14.6) passes `(at) => new Date(at).getTimezoneOffset()`.
 */

import type { SeasonWindow, Timestamp } from '../core/types';

/** Minutes in the `Date.getTimezoneOffset` convention: UTC minus local, so 480 for PST. */
export type OffsetAt = (at: Timestamp) => number;

/** One year's run of a window. Open while `startsAt <= now < endsAt`. */
export interface WindowOccurrence {
  /** Local midnight starting the first day. */
  readonly startsAt: Timestamp;
  /** Local midnight after the last day. */
  readonly endsAt: Timestamp;
}

const MINUTE = 60_000;
const DAY = 86_400_000;
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

interface MonthDay {
  /** 1–12. */
  readonly month: number;
  readonly day: number;
}

function parseMonthDay(value: string): MonthDay | null {
  const match = /^(\d{2})-(\d{2})$/.exec(value);
  if (match === null) return null;
  const month = Number(match[1]);
  const day = Number(match[2]);
  const days = DAYS_IN_MONTH[month - 1];
  return days !== undefined && day >= 1 && day <= days ? { month, day } : null;
}

/** "MM-DD" naming a real day. Feb 29 is refused: the window has to exist every year. */
export function isMonthDay(value: string): boolean {
  return parseMonthDay(value) !== null;
}

function requireMonthDay(value: string): MonthDay {
  const monthDay = parseMonthDay(value);
  if (monthDay === null) {
    throw new Error(
      `resolveWindow: "${value}" is not a month-day like "11-26"`,
    );
  }
  return monthDay;
}

/** The first instant of a local date. `day` may run past the month's end. */
function localMidnight(
  year: number,
  month: number,
  day: number,
  offsetAt: OffsetAt,
): Timestamp {
  const wallClock = Date.UTC(year, month - 1, day);
  const before = offsetAt(wallClock - DAY);
  const offsets = [before, offsetAt(wallClock), offsetAt(wallClock + DAY)];
  // Instants that read as midnight under their own offset. A clock going back
  // across midnight makes two; the day starts at the first.
  const midnights = offsets
    .map((offset) => wallClock + offset * MINUTE)
    .filter((at) => wallClock + offsetAt(at) * MINUTE === at);
  if (midnights.length > 0) return Math.min(...midnights);
  // A clock going forward at midnight skips it; read with the old offset,
  // midnight lands on the change, where the day starts.
  return wallClock + before * MINUTE;
}

/**
 * The occurrence of `window` that contains `now`, or else the next one. A
 * window whose end is before its start runs into the next year.
 */
export function resolveWindow(
  window: SeasonWindow,
  now: Timestamp,
  offsetAt: OffsetAt,
): WindowOccurrence {
  const start = requireMonthDay(window.start);
  const end = requireMonthDay(window.end);
  const wraps = window.end < window.start;
  const localYear = new Date(now - offsetAt(now) * MINUTE).getUTCFullYear();

  // Occurrences don't overlap, so the first one still running is the answer.
  for (const year of [localYear - 1, localYear, localYear + 1]) {
    const endsAt = localMidnight(
      wraps ? year + 1 : year,
      end.month,
      end.day + 1,
      offsetAt,
    );
    if (now < endsAt) {
      return {
        startsAt: localMidnight(year, start.month, start.day, offsetAt),
        endsAt,
      };
    }
  }
  throw new Error(`resolveWindow: no occurrence ends after ${now}`);
}
