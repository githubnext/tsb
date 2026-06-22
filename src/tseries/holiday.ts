/**
 * tseries/holiday — pandas-compatible holiday calendar system.
 *
 * Mirrors `pandas.tseries.holiday`:
 * - {@link Holiday} — a named holiday rule (fixed or floating)
 * - {@link AbstractHolidayCalendar} — base class for holiday calendars
 * - {@link get_calendar} / {@link register_calendar} — calendar registry
 * - Observance helpers: {@link nearestWorkday}, {@link sundayToMonday},
 *   {@link nextMonday}, {@link nextMondayOrTuesday}, {@link previousFriday},
 *   {@link previousWorkday}
 * - Weekday offset constructors: {@link MO}, {@link TU}, {@link WE},
 *   {@link TH}, {@link FR}, {@link SA}, {@link SU}
 *
 * @example
 * ```ts
 * import { USFederalHolidayCalendar } from "tsb";
 *
 * const cal = new USFederalHolidayCalendar();
 * const idx = cal.holidays(new Date("2024-01-01"), new Date("2024-12-31"));
 * idx.size; // 11 US federal holidays in 2024
 * ```
 *
 * @module
 */

import { DatetimeIndex } from "../core/date_range.ts";

// ─── Constants ─────────────────────────────────────────────────────────────────

const MS_PER_DAY = 86_400_000;

/** Weekday indices following pandas convention: 0 = Monday … 6 = Sunday. */
const DOW_MON = 0;
const DOW_SAT = 5;
const DOW_SUN = 6;

// ─── Internal Helpers ─────────────────────────────────────────────────────────

/** Return a UTC date `n` days ahead of `d`. Negative `n` goes backward. */
function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * MS_PER_DAY);
}

/**
 * Return the pandas day-of-week index (0=Mon, …, 6=Sun) for a UTC `Date`.
 * JavaScript `getUTCDay()` returns 0=Sun, 1=Mon, …, 6=Sat, so we remap.
 */
function pdDow(d: Date): number {
  const js = d.getUTCDay(); // 0=Sun … 6=Sat
  return js === 0 ? 6 : js - 1;
}

// ─── Public: WeekdayOffset ─────────────────────────────────────────────────────

/**
 * Weekday offset used in holiday rules — mirrors pandas' `relativedelta`
 * weekday anchors (`MO`, `TU`, etc.).
 *
 * When `n > 0` the offset advances the base date to the *n*th occurrence of
 * `weekday` on or after the base date.
 * When `n < 0` it retreats to the *|n|*th occurrence on or before.
 */
export interface WeekdayOffset {
  /** Weekday (pandas convention: 0=Monday … 6=Sunday). */
  readonly weekday: number;
  /**
   * Ordinal occurrence:
   * - `1` → first weekday on/after base date
   * - `3` → third weekday on/after base date
   * - `-1` → last weekday on/before base date
   */
  readonly n: number;
}

/** Construct a Monday weekday offset with ordinal `n`. */
export const MO = (n: number): WeekdayOffset => ({ weekday: 0, n });
/** Construct a Tuesday weekday offset with ordinal `n`. */
export const TU = (n: number): WeekdayOffset => ({ weekday: 1, n });
/** Construct a Wednesday weekday offset with ordinal `n`. */
export const WE = (n: number): WeekdayOffset => ({ weekday: 2, n });
/** Construct a Thursday weekday offset with ordinal `n`. */
export const TH = (n: number): WeekdayOffset => ({ weekday: 3, n });
/** Construct a Friday weekday offset with ordinal `n`. */
export const FR = (n: number): WeekdayOffset => ({ weekday: 4, n });
/** Construct a Saturday weekday offset with ordinal `n`. */
export const SA = (n: number): WeekdayOffset => ({ weekday: 5, n });
/** Construct a Sunday weekday offset with ordinal `n`. */
export const SU = (n: number): WeekdayOffset => ({ weekday: 6, n });

/**
 * Advance (or retreat) `base` to the *n*th occurrence of the target weekday.
 *
 * - `n > 0`: find the *n*th occurrence on or after `base`.
 * - `n < 0`: find the *|n|*th occurrence on or before `base`.
 * - `n === 0`: return `base` unchanged.
 */
function applyWeekdayOffset(base: Date, { weekday, n }: WeekdayOffset): Date {
  if (n === 0) return base;
  const baseDow = pdDow(base);
  if (n > 0) {
    const daysToFirst = (weekday - baseDow + 7) % 7;
    const first = addDays(base, daysToFirst);
    return addDays(first, (n - 1) * 7);
  }
  // n < 0
  const daysBack = (baseDow - weekday + 7) % 7;
  const last = addDays(base, -daysBack);
  return addDays(last, (n + 1) * 7);
}

// ─── Public: Observance Functions ─────────────────────────────────────────────

/** Function that adjusts a holiday date based on an observance rule. */
export type ObservanceFn = (date: Date) => Date;

/**
 * `nearest_workday`: Saturday → previous Friday; Sunday → next Monday;
 * weekday → unchanged.
 */
export function nearestWorkday(date: Date): Date {
  const dow = pdDow(date);
  if (dow === DOW_SAT) return addDays(date, -1);
  if (dow === DOW_SUN) return addDays(date, 1);
  return date;
}

/**
 * `sunday_to_monday`: Sunday → next Monday; other days unchanged.
 */
export function sundayToMonday(date: Date): Date {
  if (pdDow(date) === DOW_SUN) return addDays(date, 1);
  return date;
}

/**
 * `next_monday`: advance to next Monday (today if already Monday).
 */
export function nextMonday(date: Date): Date {
  const dow = pdDow(date);
  if (dow === DOW_MON) return date;
  return addDays(date, (7 - dow) % 7);
}

/**
 * `next_monday_or_tuesday`: Saturday → Tuesday; Sunday → Monday;
 * other days unchanged.
 */
export function nextMondayOrTuesday(date: Date): Date {
  const dow = pdDow(date);
  if (dow === DOW_SAT) return addDays(date, 3);
  if (dow === DOW_SUN) return addDays(date, 1);
  return date;
}

/**
 * `previous_friday`: retreat to the most recent Friday (today if Friday).
 */
export function previousFriday(date: Date): Date {
  const dow = pdDow(date);
  const fri = 4; // Friday in pandas convention
  const daysBack = (dow - fri + 7) % 7;
  return addDays(date, -daysBack);
}

/**
 * `previous_workday`: retreat to the most recent Mon–Fri day.
 * Saturday → Friday; Sunday → Friday; weekday → unchanged.
 */
export function previousWorkday(date: Date): Date {
  const dow = pdDow(date);
  if (dow === DOW_SAT) return addDays(date, -1);
  if (dow === DOW_SUN) return addDays(date, -2);
  return date;
}

// ─── Public: HolidayOptions ────────────────────────────────────────────────────

/**
 * Options accepted by the {@link Holiday} constructor, mirroring
 * `pandas.tseries.holiday.Holiday`.
 */
export interface HolidayOptions {
  /**
   * Month of the holiday (1–12).
   * Combined with `day` to form the base date for each year.
   */
  readonly month: number;
  /**
   * Day of month (1–31) used as the base date.
   * For floating holidays this is the anchor from which `offset` is computed.
   */
  readonly day: number;
  /**
   * If set, the rule applies only in this calendar year.
   * `null` (default) means the rule applies every year.
   */
  readonly year?: number | null;
  /**
   * Weekday offset applied to the base date to compute the actual holiday
   * date (e.g. `MO(3)` for "3rd Monday").
   * Mutually exclusive with `observance`.
   */
  readonly offset?: WeekdayOffset | null;
  /**
   * Observance function applied after computing the raw holiday date
   * (e.g. `nearestWorkday` to move weekends to the nearest business day).
   * Mutually exclusive with `offset`.
   */
  readonly observance?: ObservanceFn | null;
  /** The rule is only active on or after this date. */
  readonly startDate?: Date | null;
  /** The rule is only active on or before this date. */
  readonly endDate?: Date | null;
  /**
   * Restrict the holiday to these days of the week (pandas convention).
   * Rarely needed; `null` means no restriction.
   */
  readonly daysOfWeek?: readonly number[] | null;
}

// ─── Public: Holiday ──────────────────────────────────────────────────────────

/**
 * A single named holiday rule.
 *
 * Mirrors `pandas.tseries.holiday.Holiday`.
 *
 * @example
 * ```ts
 * // Fixed holiday with observance
 * const newYears = new Holiday("New Year's Day", { month: 1, day: 1, observance: nearestWorkday });
 *
 * // Floating holiday using weekday offset
 * const mlk = new Holiday("MLK Day", { month: 1, day: 1, offset: MO(3) });
 * ```
 */
export class Holiday {
  /** Human-readable holiday name. */
  readonly name: string;
  /** Month (1–12) for the base date. */
  readonly month: number;
  /** Day-of-month for the base date. */
  readonly day: number;
  /** Specific calendar year this rule applies to (`null` = every year). */
  readonly year: number | null;
  /** Weekday offset for floating holidays. */
  readonly offset: WeekdayOffset | null;
  /** Observance function for fixed holidays. */
  readonly observance: ObservanceFn | null;
  /** Rule is active only on/after this date. */
  readonly startDate: Date | null;
  /** Rule is active only on/before this date. */
  readonly endDate: Date | null;
  /** Optional day-of-week filter. */
  readonly daysOfWeek: readonly number[] | null;

  constructor(name: string, options: HolidayOptions) {
    this.name = name;
    this.month = options.month;
    this.day = options.day;
    this.year = options.year ?? null;
    this.offset = options.offset ?? null;
    this.observance = options.observance ?? null;
    this.startDate = options.startDate ?? null;
    this.endDate = options.endDate ?? null;
    this.daysOfWeek = options.daysOfWeek ?? null;
  }

  /**
   * Return the observed dates of this holiday within `[rangeStart, rangeEnd]`.
   *
   * @param rangeStart - Inclusive start of the query range (UTC midnight).
   * @param rangeEnd   - Inclusive end of the query range (UTC midnight).
   */
  dates(rangeStart: Date, rangeEnd: Date): Date[] {
    const startYear = rangeStart.getUTCFullYear();
    const endYear = rangeEnd.getUTCFullYear();

    const years: number[] = [];
    if (this.year != null) {
      if (this.year >= startYear && this.year <= endYear) {
        years.push(this.year);
      }
    } else {
      // Include extra years at boundaries so observance doesn't miss cross-year dates
      for (let y = startYear - 1; y <= endYear + 1; y++) {
        years.push(y);
      }
    }

    const result: Date[] = [];
    for (const year of years) {
      // Compute base date at UTC midnight
      let date = new Date(Date.UTC(year, this.month - 1, this.day));

      // Apply weekday offset
      if (this.offset != null) {
        date = applyWeekdayOffset(date, this.offset);
      }

      // Apply observance function
      if (this.observance != null) {
        date = this.observance(date);
      }

      // Check validity range
      if (this.startDate != null && date < this.startDate) continue;
      if (this.endDate != null && date > this.endDate) continue;

      // Check day-of-week filter
      if (this.daysOfWeek != null && !this.daysOfWeek.includes(pdDow(date))) continue;

      // Check within query range
      if (date >= rangeStart && date <= rangeEnd) {
        result.push(date);
      }
    }
    return result;
  }
}

// ─── Public: HolidayCalendarOptions ───────────────────────────────────────────

/** Options for {@link AbstractHolidayCalendar.holidays}. */
export interface HolidayCalendarOptions {
  /**
   * When `true`, return a `Map` from holiday name to observed `Date` instead
   * of a `DatetimeIndex`.  Default: `false`.
   */
  readonly returnName?: boolean;
}

// ─── Public: AbstractHolidayCalendar ─────────────────────────────────────────

/**
 * Base class for holiday calendars.
 *
 * Subclasses must provide a `name` and a `rules` array of {@link Holiday}
 * objects.  Call {@link holidays} to get a `DatetimeIndex` of observed holiday
 * dates within a date range.
 *
 * @example
 * ```ts
 * class MyCalendar extends AbstractHolidayCalendar {
 *   readonly name = "MyCalendar";
 *   readonly rules = [
 *     new Holiday("Christmas", { month: 12, day: 25, observance: nearestWorkday }),
 *   ];
 * }
 * const cal = new MyCalendar();
 * cal.holidays(new Date("2024-01-01"), new Date("2024-12-31"));
 * ```
 */
export abstract class AbstractHolidayCalendar {
  /** Unique calendar name used in the registry. */
  abstract readonly name: string;

  /** The list of holiday rules that define this calendar. */
  abstract readonly rules: readonly Holiday[];

  /**
   * Return a `DatetimeIndex` of all observed holiday dates within
   * `[start, end]` (inclusive).
   *
   * @param start - Range start — a `Date` object or ISO 8601 string.
   * @param end   - Range end — a `Date` object or ISO 8601 string.
   */
  holidays(start: Date | string, end: Date | string): DatetimeIndex {
    const s = typeof start === "string" ? new Date(start) : start;
    const e = typeof end === "string" ? new Date(end) : end;

    // Normalize to UTC midnight
    const sUTC = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate()));
    const eUTC = new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate()));

    const allDates: Date[] = [];
    const seen = new Set<number>();

    for (const rule of this.rules) {
      for (const d of rule.dates(sUTC, eUTC)) {
        const t = d.getTime();
        if (!seen.has(t)) {
          seen.add(t);
          allDates.push(d);
        }
      }
    }

    allDates.sort((a, b) => a.getTime() - b.getTime());
    return DatetimeIndex.fromDates(allDates);
  }

  /**
   * Return a map from holiday name → observed `Date` for all holidays within
   * `[start, end]`.  When multiple rules share the same date, only the last
   * one (by rule order) is kept.
   */
  holidayNames(start: Date | string, end: Date | string): Map<string, Date> {
    const s = typeof start === "string" ? new Date(start) : start;
    const e = typeof end === "string" ? new Date(end) : end;

    const sUTC = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate()));
    const eUTC = new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate()));

    const result = new Map<string, Date>();
    for (const rule of this.rules) {
      for (const d of rule.dates(sUTC, eUTC)) {
        result.set(rule.name, d);
      }
    }
    return result;
  }
}

// ─── Calendar Registry ────────────────────────────────────────────────────────

const _registry = new Map<string, () => AbstractHolidayCalendar>();

/**
 * Register a calendar factory under `name`.
 *
 * Registered calendars can later be retrieved via {@link get_calendar}.
 *
 * @example
 * ```ts
 * register_calendar("MyCalendar", () => new MyCalendar());
 * ```
 */
export function register_calendar(name: string, factory: () => AbstractHolidayCalendar): void {
  _registry.set(name, factory);
}

/**
 * Retrieve a registered holiday calendar by name.
 *
 * Returns `null` if no calendar with that name has been registered.
 *
 * @example
 * ```ts
 * const cal = get_calendar("USFederalHolidayCalendar");
 * cal?.holidays(new Date("2024-01-01"), new Date("2024-12-31"));
 * ```
 */
export function get_calendar(name: string): AbstractHolidayCalendar | null {
  const factory = _registry.get(name);
  return factory != null ? factory() : null;
}
