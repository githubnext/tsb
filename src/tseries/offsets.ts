/**
 * tseries/offsets — extended date offset classes for tsb.
 *
 * Mirrors `pandas.tseries.offsets`, providing quarter-based and
 * business-calendar month/year offsets not included in the base
 * `date_offset` module:
 *
 * | Class | pandas equivalent | Description |
 * |---|---|---|
 * | {@link QuarterEnd} | `QuarterEnd(n)` | n quarter-ends (Mar 31, Jun 30, Sep 30, Dec 31) |
 * | {@link QuarterBegin} | `QuarterBegin(n)` | n quarter-starts (Jan 1, Apr 1, Jul 1, Oct 1) |
 * | {@link BMonthEnd} | `BMonthEnd(n)` | n business-month-ends (last business day of month) |
 * | {@link BMonthBegin} | `BMonthBegin(n)` | n business-month-begins (first business day of month) |
 * | {@link BYearEnd} | `BYearEnd(n)` | n business-year-ends (last business day of Dec) |
 * | {@link BYearBegin} | `BYearBegin(n)` | n business-year-begins (first business day of Jan) |
 *
 * All operations work in **UTC** to avoid DST ambiguity.
 *
 * @example
 * ```ts
 * import { QuarterEnd, BMonthEnd } from "tsb";
 *
 * const d = new Date(Date.UTC(2024, 1, 15)); // 2024-02-15
 * new QuarterEnd(1).apply(d);   // 2024-03-31
 * new BMonthEnd(1).apply(d);    // 2024-02-29 (last biz day of Feb 2024)
 * ```
 *
 * @module
 */

import type { DateOffset } from "../core/date_offset.ts";

// Re-export base offset classes for convenience so callers can import
// everything from a single location.
export {
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
export type { DateOffset, WeekOptions } from "../core/date_offset.ts";

// ─── constants ────────────────────────────────────────────────────────────────

const MS_PER_DAY = 86_400_000;

// ─── internal helpers ─────────────────────────────────────────────────────────

/** True if `date` is the last day of its UTC month. */
function isMonthEnd(date: Date): boolean {
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
  return date.getUTCDate() === last.getUTCDate();
}

/** True if `d` falls on a business day (Monday–Friday UTC). */
function isBizDay(d: Date): boolean {
  const dow = d.getUTCDay();
  return dow >= 1 && dow <= 5;
}

/** Return the last business day (Mon–Fri) of the given UTC year/month. */
function lastBizDay(year: number, month: number): Date {
  let d = new Date(Date.UTC(year, month + 1, 0));
  while (!isBizDay(d)) {
    d = new Date(d.getTime() - MS_PER_DAY);
  }
  return d;
}

/** Return the first business day (Mon–Fri) of the given UTC year/month. */
function firstBizDay(year: number, month: number): Date {
  let d = new Date(Date.UTC(year, month, 1));
  while (!isBizDay(d)) {
    d = new Date(d.getTime() + MS_PER_DAY);
  }
  return d;
}

/** True if `date` equals the last business day of its UTC month. */
function isBMonthEnd(date: Date): boolean {
  const lbd = lastBizDay(date.getUTCFullYear(), date.getUTCMonth());
  return (
    date.getUTCFullYear() === lbd.getUTCFullYear() &&
    date.getUTCMonth() === lbd.getUTCMonth() &&
    date.getUTCDate() === lbd.getUTCDate()
  );
}

/** True if `date` equals the first business day of its UTC month. */
function isBMonthBegin(date: Date): boolean {
  const fbd = firstBizDay(date.getUTCFullYear(), date.getUTCMonth());
  return (
    date.getUTCFullYear() === fbd.getUTCFullYear() &&
    date.getUTCMonth() === fbd.getUTCMonth() &&
    date.getUTCDate() === fbd.getUTCDate()
  );
}

/** True if `date` is the last day of a quarter end month (Mar/Jun/Sep/Dec). */
function isQuarterEnd(date: Date): boolean {
  const m = date.getUTCMonth(); // 0-based
  if (m !== 2 && m !== 5 && m !== 8 && m !== 11) {
    return false;
  }
  return isMonthEnd(date);
}

/** True if `date` is the first day of a quarter start month (Jan/Apr/Jul/Oct). */
function isQuarterBegin(date: Date): boolean {
  const m = date.getUTCMonth(); // 0-based
  return (m === 0 || m === 3 || m === 6 || m === 9) && date.getUTCDate() === 1;
}

/** 0-based quarter index (0–3) for a date. */
function getQuarter(date: Date): number {
  return Math.floor(date.getUTCMonth() / 3);
}

/** Last day of the `q`-th quarter (0-based) of `year`. */
function quarterEndDate(year: number, q: number): Date {
  return new Date(Date.UTC(year, (q + 1) * 3, 0));
}

/** First day of the `q`-th quarter (0-based) of `year`. */
function quarterBeginDate(year: number, q: number): Date {
  return new Date(Date.UTC(year, q * 3, 1));
}

// ─── QuarterEnd ───────────────────────────────────────────────────────────────

/**
 * n quarter-ends.
 *
 * Anchors on the last day of each quarter-end month (March 31, June 30,
 * September 30, December 31), mirroring `pandas.tseries.offsets.QuarterEnd`.
 *
 * @example
 * ```ts
 * const d = new Date(Date.UTC(2024, 1, 15)); // 2024-02-15
 * new QuarterEnd(1).apply(d);  // 2024-03-31
 * new QuarterEnd(2).apply(d);  // 2024-06-30
 * new QuarterEnd(-1).apply(d); // 2023-12-31
 * ```
 */
export class QuarterEnd implements DateOffset {
  readonly name = "QuarterEnd";
  readonly n: number;

  constructor(n = 1) {
    this.n = n;
  }

  /** Factory shorthand: `QuarterEnd.of(2)` === `new QuarterEnd(2)`. */
  static of(n = 1): QuarterEnd {
    return new QuarterEnd(n);
  }

  apply(date: Date): Date {
    if (this.n === 0) {
      return new Date(date.getTime());
    }
    const y = date.getUTCFullYear();
    const q = getQuarter(date);
    if (isQuarterEnd(date)) {
      // On anchor: advance n full quarters.
      const totalQ = q + this.n;
      const newY = y + Math.floor(totalQ / 4);
      const newQ = ((totalQ % 4) + 4) % 4;
      return quarterEndDate(newY, newQ);
    }
    // Not on anchor: snap to nearest quarter end (costs 1) then advance n-1 more.
    if (this.n > 0) {
      const snapped = quarterEndDate(y, q);
      if (this.n === 1) {
        return snapped;
      }
      const remain = this.n - 1;
      const totalQ = q + remain;
      const newY = y + Math.floor(totalQ / 4);
      const newQ = ((totalQ % 4) + 4) % 4;
      return quarterEndDate(newY, newQ);
    }
    // n < 0: snap to previous quarter end.
    const prevQ = q - 1;
    const prevY = prevQ < 0 ? y - 1 : y;
    const adjustedQ = ((prevQ % 4) + 4) % 4;
    const snapped = quarterEndDate(prevY, adjustedQ);
    if (this.n === -1) {
      return snapped;
    }
    const remain = this.n + 1;
    const totalQ = adjustedQ + remain;
    const baseY = prevQ < 0 ? y - 1 : y;
    const newY = baseY + Math.floor(totalQ / 4);
    const newQ = ((totalQ % 4) + 4) % 4;
    return quarterEndDate(newY, newQ);
  }

  rollforward(date: Date): Date {
    if (isQuarterEnd(date)) {
      return new Date(date.getTime());
    }
    const y = date.getUTCFullYear();
    const q = getQuarter(date);
    return quarterEndDate(y, q);
  }

  rollback(date: Date): Date {
    if (isQuarterEnd(date)) {
      return new Date(date.getTime());
    }
    const y = date.getUTCFullYear();
    const q = getQuarter(date);
    const prevQ = q - 1;
    if (prevQ < 0) {
      return quarterEndDate(y - 1, 3);
    }
    return quarterEndDate(y, prevQ);
  }

  onOffset(date: Date): boolean {
    return isQuarterEnd(date);
  }
}

// ─── QuarterBegin ─────────────────────────────────────────────────────────────

/**
 * n quarter-begins.
 *
 * Anchors on the first day of each quarter-start month (January 1, April 1,
 * July 1, October 1), mirroring `pandas.tseries.offsets.QuarterBegin`.
 *
 * @example
 * ```ts
 * const d = new Date(Date.UTC(2024, 1, 15)); // 2024-02-15
 * new QuarterBegin(1).apply(d);  // 2024-04-01
 * new QuarterBegin(2).apply(d);  // 2024-07-01
 * new QuarterBegin(-1).apply(d); // 2024-01-01
 * ```
 */
export class QuarterBegin implements DateOffset {
  readonly name = "QuarterBegin";
  readonly n: number;

  constructor(n = 1) {
    this.n = n;
  }

  /** Factory shorthand: `QuarterBegin.of(2)` === `new QuarterBegin(2)`. */
  static of(n = 1): QuarterBegin {
    return new QuarterBegin(n);
  }

  apply(date: Date): Date {
    if (this.n === 0) {
      return new Date(date.getTime());
    }
    const y = date.getUTCFullYear();
    const q = getQuarter(date);
    if (isQuarterBegin(date)) {
      const totalQ = q + this.n;
      const newY = y + Math.floor(totalQ / 4);
      const newQ = ((totalQ % 4) + 4) % 4;
      return quarterBeginDate(newY, newQ);
    }
    if (this.n > 0) {
      const nextQ = q + 1;
      const nextY = nextQ >= 4 ? y + 1 : y;
      const adjustedQ = nextQ >= 4 ? 0 : nextQ;
      const snapped = quarterBeginDate(nextY, adjustedQ);
      if (this.n === 1) {
        return snapped;
      }
      const remain = this.n - 1;
      const totalQ = adjustedQ + remain;
      const newY = nextY + Math.floor(totalQ / 4);
      const newQ = ((totalQ % 4) + 4) % 4;
      return quarterBeginDate(newY, newQ);
    }
    // n < 0: snap to current quarter begin.
    const snapped = quarterBeginDate(y, q);
    if (this.n === -1) {
      return snapped;
    }
    const remain = this.n + 1;
    const totalQ = q + remain;
    const newY = y + Math.floor(totalQ / 4);
    const newQ = ((totalQ % 4) + 4) % 4;
    return quarterBeginDate(newY, newQ);
  }

  rollforward(date: Date): Date {
    if (isQuarterBegin(date)) {
      return new Date(date.getTime());
    }
    const y = date.getUTCFullYear();
    const q = getQuarter(date);
    const nextQ = q + 1;
    if (nextQ >= 4) {
      return quarterBeginDate(y + 1, 0);
    }
    return quarterBeginDate(y, nextQ);
  }

  rollback(date: Date): Date {
    if (isQuarterBegin(date)) {
      return new Date(date.getTime());
    }
    const y = date.getUTCFullYear();
    const q = getQuarter(date);
    return quarterBeginDate(y, q);
  }

  onOffset(date: Date): boolean {
    return isQuarterBegin(date);
  }
}

// ─── BMonthEnd ────────────────────────────────────────────────────────────────

/**
 * n business-month-ends.
 *
 * Anchors on the **last business day** (Monday–Friday) of each calendar month,
 * mirroring `pandas.tseries.offsets.BMonthEnd`.
 *
 * @example
 * ```ts
 * const d = new Date(Date.UTC(2024, 1, 15)); // 2024-02-15
 * new BMonthEnd(1).apply(d);   // 2024-02-29 (last biz day of Feb 2024)
 * new BMonthEnd(2).apply(d);   // 2024-03-29
 * new BMonthEnd(-1).apply(d);  // 2024-01-31
 * ```
 */
export class BMonthEnd implements DateOffset {
  readonly name = "BMonthEnd";
  readonly n: number;

  constructor(n = 1) {
    this.n = n;
  }

  /** Factory shorthand. */
  static of(n = 1): BMonthEnd {
    return new BMonthEnd(n);
  }

  apply(date: Date): Date {
    if (this.n === 0) {
      return new Date(date.getTime());
    }
    const y = date.getUTCFullYear();
    const m = date.getUTCMonth();
    if (isBMonthEnd(date)) {
      const totalM = y * 12 + m + this.n;
      const newY = Math.floor(totalM / 12);
      const newM = totalM - newY * 12;
      return lastBizDay(newY, newM);
    }
    if (this.n > 0) {
      const snapped = lastBizDay(y, m);
      if (this.n === 1) {
        return snapped;
      }
      const remain = this.n - 1;
      const totalM = y * 12 + m + remain;
      const newY = Math.floor(totalM / 12);
      const newM = totalM - newY * 12;
      return lastBizDay(newY, newM);
    }
    // n < 0: snap to prev month.
    const prevTotalM = y * 12 + m - 1;
    const prevY = Math.floor(prevTotalM / 12);
    const prevM = prevTotalM - prevY * 12;
    const snapped = lastBizDay(prevY, prevM);
    if (this.n === -1) {
      return snapped;
    }
    const remain = this.n + 1;
    const totalM = prevY * 12 + prevM + remain;
    const newY = Math.floor(totalM / 12);
    const newM = totalM - newY * 12;
    return lastBizDay(newY, newM);
  }

  rollforward(date: Date): Date {
    if (isBMonthEnd(date)) {
      return new Date(date.getTime());
    }
    const y = date.getUTCFullYear();
    const m = date.getUTCMonth();
    return lastBizDay(y, m);
  }

  rollback(date: Date): Date {
    if (isBMonthEnd(date)) {
      return new Date(date.getTime());
    }
    const y = date.getUTCFullYear();
    const m = date.getUTCMonth();
    const prevTotalM = y * 12 + m - 1;
    const prevY = Math.floor(prevTotalM / 12);
    const prevM = prevTotalM - prevY * 12;
    return lastBizDay(prevY, prevM);
  }

  onOffset(date: Date): boolean {
    return isBMonthEnd(date);
  }
}

// ─── BMonthBegin ──────────────────────────────────────────────────────────────

/**
 * n business-month-begins.
 *
 * Anchors on the **first business day** (Monday–Friday) of each calendar month,
 * mirroring `pandas.tseries.offsets.BMonthBegin`.
 *
 * @example
 * ```ts
 * const d = new Date(Date.UTC(2024, 1, 15)); // 2024-02-15
 * new BMonthBegin(1).apply(d);   // 2024-03-01
 * new BMonthBegin(2).apply(d);   // 2024-04-01
 * new BMonthBegin(-1).apply(d);  // 2024-02-01
 * ```
 */
export class BMonthBegin implements DateOffset {
  readonly name = "BMonthBegin";
  readonly n: number;

  constructor(n = 1) {
    this.n = n;
  }

  /** Factory shorthand. */
  static of(n = 1): BMonthBegin {
    return new BMonthBegin(n);
  }

  apply(date: Date): Date {
    if (this.n === 0) {
      return new Date(date.getTime());
    }
    const y = date.getUTCFullYear();
    const m = date.getUTCMonth();
    if (isBMonthBegin(date)) {
      const totalM = y * 12 + m + this.n;
      const newY = Math.floor(totalM / 12);
      const newM = totalM - newY * 12;
      return firstBizDay(newY, newM);
    }
    if (this.n > 0) {
      const nextTotalM = y * 12 + m + 1;
      const nextY = Math.floor(nextTotalM / 12);
      const nextM = nextTotalM - nextY * 12;
      const snapped = firstBizDay(nextY, nextM);
      if (this.n === 1) {
        return snapped;
      }
      const remain = this.n - 1;
      const totalM = nextY * 12 + nextM + remain;
      const newY = Math.floor(totalM / 12);
      const newM = totalM - newY * 12;
      return firstBizDay(newY, newM);
    }
    // n < 0: snap to current month's begin.
    const snapped = firstBizDay(y, m);
    if (this.n === -1) {
      return snapped;
    }
    const remain = this.n + 1;
    const totalM = y * 12 + m + remain;
    const newY = Math.floor(totalM / 12);
    const newM = totalM - newY * 12;
    return firstBizDay(newY, newM);
  }

  rollforward(date: Date): Date {
    if (isBMonthBegin(date)) {
      return new Date(date.getTime());
    }
    const y = date.getUTCFullYear();
    const m = date.getUTCMonth();
    const nextTotalM = y * 12 + m + 1;
    const nextY = Math.floor(nextTotalM / 12);
    const nextM = nextTotalM - nextY * 12;
    return firstBizDay(nextY, nextM);
  }

  rollback(date: Date): Date {
    if (isBMonthBegin(date)) {
      return new Date(date.getTime());
    }
    const y = date.getUTCFullYear();
    const m = date.getUTCMonth();
    return firstBizDay(y, m);
  }

  onOffset(date: Date): boolean {
    return isBMonthBegin(date);
  }
}

/** True if `date` is the last business day of December. */
function isBYearEnd(date: Date): boolean {
  if (date.getUTCMonth() !== 11) {
    return false;
  }
  return isBMonthEnd(date);
}

/** True if `date` is the first business day of January. */
function isBYearBegin(date: Date): boolean {
  if (date.getUTCMonth() !== 0) {
    return false;
  }
  return isBMonthBegin(date);
}

// ─── BYearEnd ─────────────────────────────────────────────────────────────────

/**
 * n business-year-ends.
 *
 * Anchors on the **last business day** of December each year,
 * mirroring `pandas.tseries.offsets.BYearEnd`.
 *
 * @example
 * ```ts
 * const d = new Date(Date.UTC(2024, 5, 15)); // 2024-06-15
 * new BYearEnd(1).apply(d);   // 2024-12-31 (last biz day of Dec 2024)
 * new BYearEnd(2).apply(d);   // 2025-12-31
 * new BYearEnd(-1).apply(d);  // 2023-12-29
 * ```
 */
export class BYearEnd implements DateOffset {
  readonly name = "BYearEnd";
  readonly n: number;

  constructor(n = 1) {
    this.n = n;
  }

  /** Factory shorthand. */
  static of(n = 1): BYearEnd {
    return new BYearEnd(n);
  }

  apply(date: Date): Date {
    if (this.n === 0) {
      return new Date(date.getTime());
    }
    const y = date.getUTCFullYear();
    if (isBYearEnd(date)) {
      return lastBizDay(y + this.n, 11);
    }
    if (this.n > 0) {
      const snapped = lastBizDay(y, 11);
      const snapMs = snapped.getTime();
      const dateMs = date.getTime();
      if (snapMs > dateMs) {
        if (this.n === 1) {
          return snapped;
        }
        return lastBizDay(y + this.n - 1, 11);
      }
      return lastBizDay(y + this.n, 11);
    }
    // n < 0
    const snapped = lastBizDay(y - 1, 11);
    if (this.n === -1) {
      return snapped;
    }
    return lastBizDay(y + this.n, 11);
  }

  rollforward(date: Date): Date {
    if (isBYearEnd(date)) {
      return new Date(date.getTime());
    }
    const y = date.getUTCFullYear();
    const candidate = lastBizDay(y, 11);
    if (candidate.getTime() >= date.getTime()) {
      return candidate;
    }
    return lastBizDay(y + 1, 11);
  }

  rollback(date: Date): Date {
    if (isBYearEnd(date)) {
      return new Date(date.getTime());
    }
    const y = date.getUTCFullYear();
    const candidate = lastBizDay(y, 11);
    if (candidate.getTime() <= date.getTime()) {
      return candidate;
    }
    return lastBizDay(y - 1, 11);
  }

  onOffset(date: Date): boolean {
    return isBYearEnd(date);
  }
}

// ─── BYearBegin ───────────────────────────────────────────────────────────────

/**
 * n business-year-begins.
 *
 * Anchors on the **first business day** of January each year,
 * mirroring `pandas.tseries.offsets.BYearBegin`.
 *
 * @example
 * ```ts
 * const d = new Date(Date.UTC(2024, 5, 15)); // 2024-06-15
 * new BYearBegin(1).apply(d);   // 2025-01-02 (first biz day of Jan 2025)
 * new BYearBegin(-1).apply(d);  // 2024-01-02 (first biz day of Jan 2024)
 * ```
 */
export class BYearBegin implements DateOffset {
  readonly name = "BYearBegin";
  readonly n: number;

  constructor(n = 1) {
    this.n = n;
  }

  /** Factory shorthand. */
  static of(n = 1): BYearBegin {
    return new BYearBegin(n);
  }

  apply(date: Date): Date {
    if (this.n === 0) {
      return new Date(date.getTime());
    }
    const y = date.getUTCFullYear();
    if (isBYearBegin(date)) {
      return firstBizDay(y + this.n, 0);
    }
    if (this.n > 0) {
      const snapped = firstBizDay(y + 1, 0);
      if (this.n === 1) {
        return snapped;
      }
      return firstBizDay(y + this.n, 0);
    }
    // n < 0
    const snapped = firstBizDay(y, 0);
    const snapMs = snapped.getTime();
    const dateMs = date.getTime();
    if (snapMs < dateMs) {
      if (this.n === -1) {
        return snapped;
      }
      return firstBizDay(y + this.n + 1, 0);
    }
    return firstBizDay(y + this.n, 0);
  }

  rollforward(date: Date): Date {
    if (isBYearBegin(date)) {
      return new Date(date.getTime());
    }
    const y = date.getUTCFullYear();
    const candidate = firstBizDay(y + 1, 0);
    return candidate;
  }

  rollback(date: Date): Date {
    if (isBYearBegin(date)) {
      return new Date(date.getTime());
    }
    const y = date.getUTCFullYear();
    const candidate = firstBizDay(y, 0);
    if (candidate.getTime() <= date.getTime()) {
      return candidate;
    }
    return firstBizDay(y - 1, 0);
  }

  onOffset(date: Date): boolean {
    return isBYearBegin(date);
  }
}
