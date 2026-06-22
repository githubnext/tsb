/**
 * Tests for tseries/offsets — extended date offset classes.
 *
 * Covers:
 * - QuarterEnd: apply, rollforward, rollback, onOffset
 * - QuarterBegin: apply, rollforward, rollback, onOffset
 * - BMonthEnd: apply, rollforward, rollback, onOffset
 * - BMonthBegin: apply, rollforward, rollback, onOffset
 * - BYearEnd: apply, rollforward, rollback, onOffset
 * - BYearBegin: apply, rollforward, rollback, onOffset
 * - Re-exports from date_offset.ts (Day, MonthEnd, etc.)
 */

import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import {
  QuarterEnd,
  QuarterBegin,
  BMonthEnd,
  BMonthBegin,
  BYearEnd,
  BYearBegin,
  // Re-exports
  Day,
  MonthEnd,
  BusinessDay,
} from "../../src/tseries/offsets.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Build a UTC midnight Date from (year, 1-based month, day). */
function utc(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

/** Format a Date as "YYYY-MM-DD". */
function fmt(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ─── QuarterEnd ───────────────────────────────────────────────────────────────

describe("QuarterEnd", () => {
  test("onOffset returns true for quarter-end dates", () => {
    const qe = new QuarterEnd(1);
    expect(qe.onOffset(utc(2024, 3, 31))).toBe(true); // Mar 31
    expect(qe.onOffset(utc(2024, 6, 30))).toBe(true); // Jun 30
    expect(qe.onOffset(utc(2024, 9, 30))).toBe(true); // Sep 30
    expect(qe.onOffset(utc(2024, 12, 31))).toBe(true); // Dec 31
  });

  test("onOffset returns false for non-quarter-end dates", () => {
    const qe = new QuarterEnd(1);
    expect(qe.onOffset(utc(2024, 1, 31))).toBe(false); // Jan 31 — not a QE
    expect(qe.onOffset(utc(2024, 3, 30))).toBe(false); // Mar 30 — not last day
    expect(qe.onOffset(utc(2024, 4, 30))).toBe(false); // Apr 30 — not QE month
  });

  test("apply from non-anchor snaps to current quarter end", () => {
    const qe = new QuarterEnd(1);
    expect(fmt(qe.apply(utc(2024, 2, 15)))).toBe("2024-03-31"); // Q1 end
    expect(fmt(qe.apply(utc(2024, 4, 10)))).toBe("2024-06-30"); // Q2 end
    expect(fmt(qe.apply(utc(2024, 7, 1)))).toBe("2024-09-30"); // Q3 end
    expect(fmt(qe.apply(utc(2024, 10, 15)))).toBe("2024-12-31"); // Q4 end
  });

  test("apply(2) from non-anchor", () => {
    const qe = new QuarterEnd(2);
    // From Feb 15 (Q1), snap to Mar 31 costs 1, +1 more = Jun 30
    expect(fmt(qe.apply(utc(2024, 2, 15)))).toBe("2024-06-30");
  });

  test("apply from anchor advances by n quarters", () => {
    const qe = new QuarterEnd(1);
    expect(fmt(qe.apply(utc(2024, 3, 31)))).toBe("2024-06-30");
    expect(fmt(qe.apply(utc(2024, 12, 31)))).toBe("2025-03-31");
  });

  test("apply with n=-1 from non-anchor", () => {
    const qe = new QuarterEnd(-1);
    // From Feb 15 (Q1), snap to prev QE = Dec 31 2023
    expect(fmt(qe.apply(utc(2024, 2, 15)))).toBe("2023-12-31");
  });

  test("rollforward stays on anchor", () => {
    const qe = new QuarterEnd(1);
    expect(fmt(qe.rollforward(utc(2024, 3, 31)))).toBe("2024-03-31");
  });

  test("rollforward advances from non-anchor to current quarter end", () => {
    const qe = new QuarterEnd(1);
    expect(fmt(qe.rollforward(utc(2024, 1, 15)))).toBe("2024-03-31");
    expect(fmt(qe.rollforward(utc(2024, 4, 1)))).toBe("2024-06-30");
  });

  test("rollback stays on anchor", () => {
    const qe = new QuarterEnd(1);
    expect(fmt(qe.rollback(utc(2024, 6, 30)))).toBe("2024-06-30");
  });

  test("rollback retreats to previous quarter end", () => {
    const qe = new QuarterEnd(1);
    expect(fmt(qe.rollback(utc(2024, 5, 1)))).toBe("2024-03-31");
    expect(fmt(qe.rollback(utc(2024, 1, 1)))).toBe("2023-12-31");
  });

  test("factory static of()", () => {
    const qe = QuarterEnd.of(3);
    expect(qe.n).toBe(3);
    expect(qe.name).toBe("QuarterEnd");
  });

  test("property-based: onOffset dates are always last days of quarter months", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2000, max: 2030 }),
        fc.constantFrom(3, 6, 9, 12),
        (year, month) => {
          const d = new Date(Date.UTC(year, month, 0)); // last day of month
          return new QuarterEnd(1).onOffset(d);
        },
      ),
    );
  });
});

// ─── QuarterBegin ─────────────────────────────────────────────────────────────

describe("QuarterBegin", () => {
  test("onOffset returns true for quarter-start dates", () => {
    const qb = new QuarterBegin(1);
    expect(qb.onOffset(utc(2024, 1, 1))).toBe(true); // Jan 1
    expect(qb.onOffset(utc(2024, 4, 1))).toBe(true); // Apr 1
    expect(qb.onOffset(utc(2024, 7, 1))).toBe(true); // Jul 1
    expect(qb.onOffset(utc(2024, 10, 1))).toBe(true); // Oct 1
  });

  test("onOffset returns false for non-quarter-start dates", () => {
    const qb = new QuarterBegin(1);
    expect(qb.onOffset(utc(2024, 2, 1))).toBe(false); // Feb 1
    expect(qb.onOffset(utc(2024, 1, 2))).toBe(false); // Jan 2
  });

  test("apply from non-anchor snaps to next quarter begin", () => {
    const qb = new QuarterBegin(1);
    expect(fmt(qb.apply(utc(2024, 2, 15)))).toBe("2024-04-01"); // next Q begin
    expect(fmt(qb.apply(utc(2024, 5, 10)))).toBe("2024-07-01");
    expect(fmt(qb.apply(utc(2024, 8, 1)))).toBe("2024-10-01");
    expect(fmt(qb.apply(utc(2024, 11, 15)))).toBe("2025-01-01");
  });

  test("apply from anchor advances by n quarters", () => {
    const qb = new QuarterBegin(1);
    expect(fmt(qb.apply(utc(2024, 1, 1)))).toBe("2024-04-01");
    expect(fmt(qb.apply(utc(2024, 10, 1)))).toBe("2025-01-01");
  });

  test("apply with n=-1 from non-anchor snaps to current quarter begin", () => {
    const qb = new QuarterBegin(-1);
    expect(fmt(qb.apply(utc(2024, 2, 15)))).toBe("2024-01-01");
  });

  test("rollforward stays on anchor", () => {
    const qb = new QuarterBegin(1);
    expect(fmt(qb.rollforward(utc(2024, 4, 1)))).toBe("2024-04-01");
  });

  test("rollforward advances to next quarter begin", () => {
    const qb = new QuarterBegin(1);
    expect(fmt(qb.rollforward(utc(2024, 2, 15)))).toBe("2024-04-01");
  });

  test("rollback stays on anchor", () => {
    const qb = new QuarterBegin(1);
    expect(fmt(qb.rollback(utc(2024, 7, 1)))).toBe("2024-07-01");
  });

  test("rollback retreats to current quarter begin", () => {
    const qb = new QuarterBegin(1);
    expect(fmt(qb.rollback(utc(2024, 2, 15)))).toBe("2024-01-01");
    expect(fmt(qb.rollback(utc(2024, 5, 10)))).toBe("2024-04-01");
  });
});

// ─── BMonthEnd ────────────────────────────────────────────────────────────────

describe("BMonthEnd", () => {
  test("onOffset on last business day of month", () => {
    const bme = new BMonthEnd(1);
    // Feb 2024 ends on Thu Feb 29 (2024 is a leap year)
    expect(bme.onOffset(utc(2024, 2, 29))).toBe(true);
    // Jan 2024 ends on Wed Jan 31
    expect(bme.onOffset(utc(2024, 1, 31))).toBe(true);
  });

  test("onOffset returns false for non-last-biz-day", () => {
    const bme = new BMonthEnd(1);
    expect(bme.onOffset(utc(2024, 1, 30))).toBe(false);
    expect(bme.onOffset(utc(2024, 1, 31))).toBe(true);
  });

  test("apply from non-anchor moves to month's last biz day", () => {
    const bme = new BMonthEnd(1);
    // Jan 2024: last biz day is Jan 31 (Wed)
    expect(fmt(bme.apply(utc(2024, 1, 15)))).toBe("2024-01-31");
  });

  test("apply(2) skips two business month ends", () => {
    const bme = new BMonthEnd(2);
    // From Jan 15: snap to Jan 31 (costs 1), +1 more = Feb 29
    expect(fmt(bme.apply(utc(2024, 1, 15)))).toBe("2024-02-29");
  });

  test("apply from anchor advances by n", () => {
    const bme = new BMonthEnd(1);
    expect(fmt(bme.apply(utc(2024, 1, 31)))).toBe("2024-02-29");
    expect(fmt(bme.apply(utc(2024, 12, 31)))).toBe("2025-01-31");
  });

  test("rollforward stays on anchor", () => {
    const bme = new BMonthEnd(1);
    expect(fmt(bme.rollforward(utc(2024, 1, 31)))).toBe("2024-01-31");
  });

  test("rollforward moves to this month's last biz day", () => {
    const bme = new BMonthEnd(1);
    expect(fmt(bme.rollforward(utc(2024, 1, 15)))).toBe("2024-01-31");
  });

  test("rollback retreats to previous month's last biz day", () => {
    const bme = new BMonthEnd(1);
    expect(fmt(bme.rollback(utc(2024, 1, 15)))).toBe("2023-12-29");
  });

  test("rollback stays on anchor", () => {
    const bme = new BMonthEnd(1);
    expect(fmt(bme.rollback(utc(2024, 1, 31)))).toBe("2024-01-31");
  });
});

// ─── BMonthBegin ──────────────────────────────────────────────────────────────

describe("BMonthBegin", () => {
  test("onOffset on first business day of month", () => {
    const bmb = new BMonthBegin(1);
    // Jan 2024 starts Mon Jan 1 → first biz day = Jan 1
    expect(bmb.onOffset(utc(2024, 1, 1))).toBe(true);
    // Apr 2024: Apr 1 = Mon → first biz day = Apr 1
    expect(bmb.onOffset(utc(2024, 4, 1))).toBe(true);
  });

  test("onOffset false when not on first biz day", () => {
    const bmb = new BMonthBegin(1);
    expect(bmb.onOffset(utc(2024, 1, 2))).toBe(false);
  });

  test("apply from non-anchor moves to next month's first biz day", () => {
    const bmb = new BMonthBegin(1);
    // From Jan 15 → next month's first biz day = Feb 1
    expect(fmt(bmb.apply(utc(2024, 1, 15)))).toBe("2024-02-01");
  });

  test("apply from anchor advances by n", () => {
    const bmb = new BMonthBegin(1);
    expect(fmt(bmb.apply(utc(2024, 1, 1)))).toBe("2024-02-01");
  });

  test("rollforward stays on anchor", () => {
    const bmb = new BMonthBegin(1);
    expect(fmt(bmb.rollforward(utc(2024, 1, 1)))).toBe("2024-01-01");
  });

  test("rollforward moves to next month's first biz day from mid-month", () => {
    const bmb = new BMonthBegin(1);
    expect(fmt(bmb.rollforward(utc(2024, 1, 15)))).toBe("2024-02-01");
  });

  test("rollback stays on anchor", () => {
    const bmb = new BMonthBegin(1);
    expect(fmt(bmb.rollback(utc(2024, 2, 1)))).toBe("2024-02-01");
  });

  test("rollback retreats to current month's first biz day", () => {
    const bmb = new BMonthBegin(1);
    expect(fmt(bmb.rollback(utc(2024, 1, 15)))).toBe("2024-01-01");
  });
});

// ─── BYearEnd ─────────────────────────────────────────────────────────────────

describe("BYearEnd", () => {
  test("last business day of December 2024 is Dec 31 (Tue)", () => {
    // Dec 31 2024 = Tuesday → is a business day
    const bye = new BYearEnd(1);
    expect(bye.onOffset(utc(2024, 12, 31))).toBe(true);
  });

  test("last business day of December 2023 is Dec 29 (Fri)", () => {
    // Dec 31 2023 = Sunday → last biz day = Dec 29
    const bye = new BYearEnd(1);
    expect(bye.onOffset(utc(2023, 12, 29))).toBe(true);
    expect(bye.onOffset(utc(2023, 12, 31))).toBe(false);
  });

  test("apply forward to this year's BYearEnd", () => {
    const bye = new BYearEnd(1);
    const result = bye.apply(utc(2024, 6, 15));
    expect(result.getUTCFullYear()).toBe(2024);
    expect(result.getUTCMonth()).toBe(11); // December
  });

  test("rollforward finds next BYearEnd on or after date", () => {
    const bye = new BYearEnd(1);
    const d = utc(2024, 6, 1);
    const result = bye.rollforward(d);
    expect(result.getUTCFullYear()).toBe(2024);
    expect(result.getUTCMonth()).toBe(11);
  });

  test("rollback finds previous BYearEnd on or before date", () => {
    const bye = new BYearEnd(1);
    const d = utc(2024, 6, 1);
    const result = bye.rollback(d);
    expect(result.getUTCFullYear()).toBe(2023);
    expect(result.getUTCMonth()).toBe(11);
  });
});

// ─── BYearBegin ───────────────────────────────────────────────────────────────

describe("BYearBegin", () => {
  test("first business day of January 2024 is Jan 2 (Mon)", () => {
    // Jan 1 2024 = Mon → first biz day = Jan 1
    const byb = new BYearBegin(1);
    expect(byb.onOffset(utc(2024, 1, 1))).toBe(true);
  });

  test("first business day of January 2023 is Jan 2 (Mon)", () => {
    // Jan 1 2023 = Sunday → first biz day = Jan 2
    const byb = new BYearBegin(1);
    expect(byb.onOffset(utc(2023, 1, 2))).toBe(true);
    expect(byb.onOffset(utc(2023, 1, 1))).toBe(false);
  });

  test("apply forward to next year's BYearBegin", () => {
    const byb = new BYearBegin(1);
    const result = byb.apply(utc(2024, 6, 15));
    expect(result.getUTCFullYear()).toBe(2025);
    expect(result.getUTCMonth()).toBe(0); // January
  });

  test("rollforward finds next BYearBegin", () => {
    const byb = new BYearBegin(1);
    const d = utc(2024, 6, 1);
    const result = byb.rollforward(d);
    expect(result.getUTCFullYear()).toBe(2025);
    expect(result.getUTCMonth()).toBe(0);
  });

  test("rollback finds previous BYearBegin", () => {
    const byb = new BYearBegin(1);
    const d = utc(2024, 6, 1);
    const result = byb.rollback(d);
    expect(result.getUTCFullYear()).toBe(2024);
    expect(result.getUTCMonth()).toBe(0);
  });
});

// ─── Re-exports ───────────────────────────────────────────────────────────────

describe("Re-exports from date_offset", () => {
  test("Day is re-exported", () => {
    const d = new Day(3);
    expect(d.n).toBe(3);
    expect(d.name).toBe("Day");
  });

  test("MonthEnd is re-exported", () => {
    const me = new MonthEnd(1);
    expect(me.n).toBe(1);
    expect(me.name).toBe("MonthEnd");
  });

  test("BusinessDay is re-exported", () => {
    const bd = new BusinessDay(2);
    expect(bd.n).toBe(2);
  });
});

// ─── Property-based tests ─────────────────────────────────────────────────────

describe("property-based: offsets are consistent", () => {
  test("QuarterEnd: rollforward(d).getTime() >= d.getTime() always", () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date("2000-01-01"), max: new Date("2030-12-31") }),
        (d) => {
          const qe = new QuarterEnd(1);
          const rolled = qe.rollforward(d);
          return rolled.getTime() >= d.getTime();
        },
      ),
    );
  });

  test("BMonthEnd: rollforward(d) is always on offset", () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date("2000-01-01"), max: new Date("2030-12-31") }),
        (d) => {
          const bme = new BMonthEnd(1);
          const rolled = bme.rollforward(d);
          return bme.onOffset(rolled);
        },
      ),
    );
  });

  test("BMonthBegin: rollforward(d) is always on offset", () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date("2000-01-01"), max: new Date("2030-12-31") }),
        (d) => {
          const bmb = new BMonthBegin(1);
          const rolled = bmb.rollforward(d);
          return bmb.onOffset(rolled);
        },
      ),
    );
  });
});
