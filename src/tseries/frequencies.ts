/**
 * tseries/frequencies — frequency string utilities.
 *
 * Mirrors `pandas.tseries.frequencies`:
 * - {@link toOffset} — convert a frequency string (e.g. `"D"`, `"ME"`, `"3h"`) to a
 *   {@link DateOffset} object.
 * - {@link inferFreq} — infer the frequency of a regularly-spaced array of `Date`s.
 * - {@link FREQ_ALIASES} — canonical mapping of frequency alias strings to their
 *   full names.
 *
 * @example
 * ```ts
 * import { toOffset, inferFreq } from "tsb";
 *
 * const off = toOffset("3ME");
 * // => MonthEnd { n: 3 }
 *
 * const dates = [
 *   new Date("2024-01-31"),
 *   new Date("2024-02-29"),
 *   new Date("2024-03-31"),
 * ];
 * inferFreq(dates); // "ME"
 * ```
 *
 * @module
 */

import {
  Day,
  Hour,
  Minute,
  Second,
  Milli,
  Week,
  MonthEnd,
  MonthBegin,
  YearEnd,
  YearBegin,
  BusinessDay,
} from "../core/date_offset.ts";
import type { DateOffset } from "../core/date_offset.ts";
import {
  QuarterEnd,
  QuarterBegin,
  BMonthEnd,
  BMonthBegin,
  BYearEnd,
  BYearBegin,
} from "./offsets.ts";

// ─── Frequency alias table ────────────────────────────────────────────────────

/**
 * Canonical mapping of pandas frequency alias strings to human-readable names.
 *
 * Modern aliases (pandas ≥ 2.2) use lower-case for sub-day frequencies
 * (`"h"`, `"min"`, `"s"`, `"ms"`) and `"ME"` / `"MS"` for month-end / begin.
 * Legacy aliases are supported for backwards compatibility.
 */
export const FREQ_ALIASES: ReadonlyMap<string, string> = new Map([
  // Calendar day
  ["D", "Day"],
  // Business day
  ["B", "BusinessDay"],
  // Week
  ["W", "Week"],
  ["W-SUN", "Week(weekday=6)"],
  ["W-MON", "Week(weekday=0)"],
  ["W-TUE", "Week(weekday=1)"],
  ["W-WED", "Week(weekday=2)"],
  ["W-THU", "Week(weekday=3)"],
  ["W-FRI", "Week(weekday=4)"],
  ["W-SAT", "Week(weekday=5)"],
  // Month end / begin
  ["ME", "MonthEnd"],
  ["M", "MonthEnd"], // legacy
  ["MS", "MonthBegin"],
  // Business month
  ["BME", "BMonthEnd"],
  ["BM", "BMonthEnd"], // legacy
  ["BMS", "BMonthBegin"],
  ["CBME", "BMonthEnd"],
  // Quarter end / begin
  ["QE", "QuarterEnd"],
  ["Q", "QuarterEnd"], // legacy
  ["QS", "QuarterBegin"],
  // Business quarter
  ["BQE", "QuarterEnd"],
  ["BQS", "QuarterBegin"],
  // Year end / begin
  ["YE", "YearEnd"],
  ["Y", "YearEnd"], // legacy
  ["A", "YearEnd"], // legacy
  ["YS", "YearBegin"],
  ["AS", "YearBegin"], // legacy
  // Business year
  ["BYE", "BYearEnd"],
  ["BA", "BYearEnd"], // legacy
  ["BYS", "BYearBegin"],
  ["BAS", "BYearBegin"], // legacy
  // Sub-day (modern lower-case)
  ["h", "Hour"],
  ["min", "Minute"],
  ["s", "Second"],
  ["ms", "Millisecond"],
  // Sub-day (legacy upper-case)
  ["H", "Hour"],
  ["T", "Minute"],
  ["S", "Second"],
  ["L", "Millisecond"],
  ["U", "Microsecond"],
  ["N", "Nanosecond"],
]);

// ─── internal factory map ─────────────────────────────────────────────────────

type OffsetFactory = (n: number) => DateOffset;

/** Week weekday name → pandas index mapping (0 = Monday). */
const WEEK_ANCHOR_MAP: ReadonlyMap<string, number> = new Map([
  ["MON", 0],
  ["TUE", 1],
  ["WED", 2],
  ["THU", 3],
  ["FRI", 4],
  ["SAT", 5],
  ["SUN", 6],
]);

const ALIAS_FACTORIES: ReadonlyMap<string, OffsetFactory> = new Map([
  ["D", (n) => new Day(n)],
  ["B", (n) => new BusinessDay(n)],
  ["W", (n) => new Week(n)],
  ["ME", (n) => new MonthEnd(n)],
  ["M", (n) => new MonthEnd(n)],
  ["MS", (n) => new MonthBegin(n)],
  ["BME", (n) => new BMonthEnd(n)],
  ["BM", (n) => new BMonthEnd(n)],
  ["BMS", (n) => new BMonthBegin(n)],
  ["QE", (n) => new QuarterEnd(n)],
  ["Q", (n) => new QuarterEnd(n)],
  ["QS", (n) => new QuarterBegin(n)],
  ["BQE", (n) => new QuarterEnd(n)],
  ["BQS", (n) => new QuarterBegin(n)],
  ["YE", (n) => new YearEnd(n)],
  ["Y", (n) => new YearEnd(n)],
  ["A", (n) => new YearEnd(n)],
  ["YS", (n) => new YearBegin(n)],
  ["AS", (n) => new YearBegin(n)],
  ["BYE", (n) => new BYearEnd(n)],
  ["BA", (n) => new BYearEnd(n)],
  ["BYS", (n) => new BYearBegin(n)],
  ["BAS", (n) => new BYearBegin(n)],
  ["h", (n) => new Hour(n)],
  ["H", (n) => new Hour(n)],
  ["min", (n) => new Minute(n)],
  ["T", (n) => new Minute(n)],
  ["s", (n) => new Second(n)],
  ["S", (n) => new Second(n)],
  ["ms", (n) => new Milli(n)],
  ["L", (n) => new Milli(n)],
]);

// ─── toOffset ─────────────────────────────────────────────────────────────────

/**
 * Convert a frequency alias string to a {@link DateOffset} object.
 *
 * Parses an optional integer multiplier prefix (e.g. `"3D"` → `Day(3)`,
 * `"-2ME"` → `MonthEnd(-2)`), and handles anchored week strings like `"W-MON"`.
 *
 * Returns `null` for unrecognised aliases (mirrors `pandas.tseries.frequencies.to_offset`
 * returning `None` for unknown strings when `errors="ignore"`).
 *
 * @example
 * ```ts
 * toOffset("D");    // Day(1)
 * toOffset("3ME");  // MonthEnd(3)
 * toOffset("-1B");  // BusinessDay(-1)
 * toOffset("W-MON"); // Week(1, { weekday: 0 })
 * toOffset("Q");    // QuarterEnd(1)
 * toOffset("xyz");  // null
 * ```
 */
export function toOffset(freq: string | null | undefined): DateOffset | null {
  if (freq == null) {
    return null;
  }

  const trimmed = freq.trim();
  if (trimmed === "") {
    return null;
  }

  // Match optional sign+digits prefix, then the alias (possibly with "-" anchor like "W-MON").
  const match = /^(-?\d*)([A-Za-z][A-Za-z0-9-]*)$/.exec(trimmed);
  if (match === null) {
    return null;
  }

  const nStr = match[1] ?? "";
  const alias = match[2] ?? "";
  const n = nStr === "" || nStr === "-" ? (nStr === "-" ? -1 : 1) : parseInt(nStr, 10);

  // Handle anchored week frequencies: "W-MON", "W-TUE", …
  if (alias.startsWith("W-")) {
    const anchor = alias.slice(2).toUpperCase();
    const weekday = WEEK_ANCHOR_MAP.get(anchor);
    if (weekday === undefined) {
      return null;
    }
    return new Week(n, { weekday });
  }

  const factory = ALIAS_FACTORIES.get(alias);
  if (factory === undefined) {
    return null;
  }
  return factory(n);
}

// ─── inferFreq ────────────────────────────────────────────────────────────────

/** Millisecond constants for common frequencies. */
const MS_SECOND = 1_000;
const MS_MINUTE = 60_000;
const MS_HOUR = 3_600_000;
const MS_DAY = 86_400_000;
const MS_WEEK = 7 * MS_DAY;

/**
 * Infer the frequency of a regularly-spaced array of `Date` objects.
 *
 * Returns a pandas-compatible frequency alias string if the dates form a
 * regular series, or `null` if the spacing is irregular or the array has
 * fewer than two elements.
 *
 * Recognised patterns (in order of detection):
 * - Sub-day: `"ms"`, `"s"`, `"min"`, `"h"` for uniform millisecond diffs.
 * - `"B"` — business-day spacing (exactly 1 or 3 calendar days, skipping weekends).
 * - `"D"` — calendar-day spacing.
 * - `"W"` or `"W-MON"` etc. — seven-day spacing.
 * - `"ME"` — month-end anchored (last day of each calendar month).
 * - `"MS"` — month-begin anchored (first day of each calendar month).
 * - `"QE"` — quarter-end anchored.
 * - `"QS"` — quarter-begin anchored.
 * - `"YE"` — year-end anchored (Dec 31).
 * - `"YS"` — year-begin anchored (Jan 1).
 *
 * @example
 * ```ts
 * inferFreq([new Date("2024-01-31"), new Date("2024-02-29"), new Date("2024-03-31")]); // "ME"
 * inferFreq([new Date("2024-01-01"), new Date("2024-02-01"), new Date("2024-03-01")]); // "MS"
 * inferFreq([new Date("2024-01-01"), new Date("2024-01-02"), new Date("2024-01-03")]); // "D"
 * ```
 */
export function inferFreq(dates: readonly Date[]): string | null {
  if (dates.length < 2) {
    return null;
  }

  // Compute all consecutive differences in ms.
  const diffs: number[] = [];
  for (let i = 1; i < dates.length; i++) {
    const prev = dates[i - 1];
    const curr = dates[i];
    if (prev === undefined || curr === undefined) {
      return null;
    }
    diffs.push(curr.getTime() - prev.getTime());
  }

  // Check for non-positive diffs (unsorted or duplicate dates → can't infer freq).
  for (const d of diffs) {
    if (d <= 0) {
      return null;
    }
  }

  const first = diffs[0];
  if (first === undefined) {
    return null;
  }

  // ── Check if all diffs are equal ──────────────────────────────────────────
  const allEqual = diffs.every((d) => d === first);

  if (allEqual) {
    // Milliseconds
    if (first < MS_SECOND) {
      return first === 1 ? "ms" : `${first}ms`;
    }
    if (first % MS_SECOND === 0 && first < MS_MINUTE) {
      const steps = first / MS_SECOND;
      return steps === 1 ? "s" : `${steps}s`;
    }
    if (first % MS_MINUTE === 0 && first < MS_HOUR) {
      const steps = first / MS_MINUTE;
      return steps === 1 ? "min" : `${steps}min`;
    }
    if (first % MS_HOUR === 0 && first < MS_DAY) {
      const steps = first / MS_HOUR;
      return steps === 1 ? "h" : `${steps}h`;
    }
    if (first === MS_DAY) {
      return "D";
    }
    if (first % MS_WEEK === 0) {
      const steps = first / MS_WEEK;
      // Check weekday anchor on the first date.
      const firstDate = dates[0];
      if (firstDate !== undefined) {
        const dow = firstDate.getUTCDay(); // 0=Sun…6=Sat
        const anchor = _jsDownToWeekAlias(dow);
        if (steps === 1) {
          return anchor;
        }
        return `${steps}${anchor}`;
      }
      return steps === 1 ? "W" : `${steps}W`;
    }
    if (first % MS_DAY === 0) {
      const days = first / MS_DAY;
      return `${days}D`;
    }
  }

  // ── Month / quarter / year anchored patterns ──────────────────────────────
  // These have variable diffs (different month lengths) but regular structure.

  if (_allMonthEnd(dates)) {
    const months = _countMonthsBetween(dates[0], dates[dates.length - 1]);
    const steps = months / (dates.length - 1);
    if (Number.isInteger(steps)) {
      return steps === 1 ? "ME" : `${steps}ME`;
    }
  }

  if (_allMonthBegin(dates)) {
    const months = _countMonthsBetween(dates[0], dates[dates.length - 1]);
    const steps = months / (dates.length - 1);
    if (Number.isInteger(steps)) {
      return steps === 1 ? "MS" : `${steps}MS`;
    }
  }

  if (_allQuarterEnd(dates)) {
    return "QE";
  }

  if (_allQuarterBegin(dates)) {
    return "QS";
  }

  if (_allYearEnd(dates)) {
    return "YE";
  }

  if (_allYearBegin(dates)) {
    return "YS";
  }

  // ── Business day ─────────────────────────────────────────────────────────
  if (_allBusinessDay(dates)) {
    return "B";
  }

  return null;
}

// ─── internal helpers for inferFreq ───────────────────────────────────────────

function _jsDownToWeekAlias(jsDay: number): string {
  // jsDay: 0=Sun,1=Mon,…,6=Sat
  const aliases = ["W-SUN", "W-MON", "W-TUE", "W-WED", "W-THU", "W-FRI", "W-SAT"];
  return aliases[jsDay] ?? "W";
}

function isMonthEndDate(d: Date): boolean {
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  return d.getUTCDate() === last.getUTCDate();
}

function isMonthBeginDate(d: Date): boolean {
  return d.getUTCDate() === 1;
}

function _allMonthEnd(dates: readonly Date[]): boolean {
  return dates.every(isMonthEndDate);
}

function _allMonthBegin(dates: readonly Date[]): boolean {
  return dates.every(isMonthBeginDate);
}

function _countMonthsBetween(a: Date | undefined, b: Date | undefined): number {
  if (a === undefined || b === undefined) {
    return 0;
  }
  return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
}

function _allQuarterEnd(dates: readonly Date[]): boolean {
  for (const d of dates) {
    const m = d.getUTCMonth();
    if (m !== 2 && m !== 5 && m !== 8 && m !== 11) {
      return false;
    }
    if (!isMonthEndDate(d)) {
      return false;
    }
  }
  return true;
}

function _allQuarterBegin(dates: readonly Date[]): boolean {
  for (const d of dates) {
    const m = d.getUTCMonth();
    if (m !== 0 && m !== 3 && m !== 6 && m !== 9) {
      return false;
    }
    if (d.getUTCDate() !== 1) {
      return false;
    }
  }
  return true;
}

function _allYearEnd(dates: readonly Date[]): boolean {
  return dates.every((d) => d.getUTCMonth() === 11 && d.getUTCDate() === 31);
}

function _allYearBegin(dates: readonly Date[]): boolean {
  return dates.every((d) => d.getUTCMonth() === 0 && d.getUTCDate() === 1);
}

function _allBusinessDay(dates: readonly Date[]): boolean {
  for (let i = 1; i < dates.length; i++) {
    const prev = dates[i - 1];
    const curr = dates[i];
    if (prev === undefined || curr === undefined) {
      return false;
    }
    const diffMs = curr.getTime() - prev.getTime();
    const diffDays = diffMs / 86_400_000;
    // Business-day step can be 1 day (Mon→Tue … Thu→Fri) or
    // 3 days (Fri→Mon) or fail.
    if (diffDays !== 1 && diffDays !== 3) {
      return false;
    }
    // Verify prev is a business day.
    const dow = prev.getUTCDay();
    if (dow === 0 || dow === 6) {
      return false;
    }
  }
  // Verify last date is also a business day.
  const last = dates[dates.length - 1];
  if (last === undefined) {
    return false;
  }
  const lastDow = last.getUTCDay();
  return lastDow !== 0 && lastDow !== 6;
}
