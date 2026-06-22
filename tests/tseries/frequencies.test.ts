/**
 * Tests for tseries/frequencies — toOffset and inferFreq.
 *
 * Covers:
 * - toOffset: various alias strings, multipliers, week anchors, null/invalid inputs
 * - inferFreq: sub-day, daily, weekly, monthly, quarterly, yearly, business-day
 */

import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import { toOffset, inferFreq, FREQ_ALIASES } from "../../src/tseries/frequencies.ts";
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
} from "../../src/core/date_offset.ts";
import {
  QuarterEnd,
  QuarterBegin,
  BMonthEnd,
  BMonthBegin,
  BYearEnd,
  BYearBegin,
} from "../../src/tseries/offsets.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function utc(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

// ─── toOffset ─────────────────────────────────────────────────────────────────

describe("toOffset", () => {
  test("null / undefined / empty string → null", () => {
    expect(toOffset(null)).toBeNull();
    expect(toOffset(undefined)).toBeNull();
    expect(toOffset("")).toBeNull();
    expect(toOffset("   ")).toBeNull();
  });

  test("unknown alias → null", () => {
    expect(toOffset("X")).toBeNull();
    expect(toOffset("xyz")).toBeNull();
  });

  test('"D" → Day(1)', () => {
    const off = toOffset("D");
    expect(off).toBeInstanceOf(Day);
    expect(off?.n).toBe(1);
  });

  test('"3D" → Day(3)', () => {
    const off = toOffset("3D");
    expect(off).toBeInstanceOf(Day);
    expect(off?.n).toBe(3);
  });

  test('"-2D" → Day(-2)', () => {
    const off = toOffset("-2D");
    expect(off).toBeInstanceOf(Day);
    expect(off?.n).toBe(-2);
  });

  test('"ME" → MonthEnd(1)', () => {
    const off = toOffset("ME");
    expect(off).toBeInstanceOf(MonthEnd);
    expect(off?.n).toBe(1);
  });

  test('"M" legacy → MonthEnd(1)', () => {
    expect(toOffset("M")).toBeInstanceOf(MonthEnd);
  });

  test('"MS" → MonthBegin(1)', () => {
    expect(toOffset("MS")).toBeInstanceOf(MonthBegin);
  });

  test('"QE" → QuarterEnd(1)', () => {
    expect(toOffset("QE")).toBeInstanceOf(QuarterEnd);
  });

  test('"Q" legacy → QuarterEnd(1)', () => {
    expect(toOffset("Q")).toBeInstanceOf(QuarterEnd);
  });

  test('"QS" → QuarterBegin(1)', () => {
    expect(toOffset("QS")).toBeInstanceOf(QuarterBegin);
  });

  test('"YE" → YearEnd(1)', () => {
    expect(toOffset("YE")).toBeInstanceOf(YearEnd);
  });

  test('"A" legacy → YearEnd(1)', () => {
    expect(toOffset("A")).toBeInstanceOf(YearEnd);
  });

  test('"YS" → YearBegin(1)', () => {
    expect(toOffset("YS")).toBeInstanceOf(YearBegin);
  });

  test('"AS" legacy → YearBegin(1)', () => {
    expect(toOffset("AS")).toBeInstanceOf(YearBegin);
  });

  test('"B" → BusinessDay(1)', () => {
    expect(toOffset("B")).toBeInstanceOf(BusinessDay);
  });

  test('"BME" → BMonthEnd(1)', () => {
    expect(toOffset("BME")).toBeInstanceOf(BMonthEnd);
  });

  test('"BMS" → BMonthBegin(1)', () => {
    expect(toOffset("BMS")).toBeInstanceOf(BMonthBegin);
  });

  test('"BYE" → BYearEnd(1)', () => {
    expect(toOffset("BYE")).toBeInstanceOf(BYearEnd);
  });

  test('"BYS" → BYearBegin(1)', () => {
    expect(toOffset("BYS")).toBeInstanceOf(BYearBegin);
  });

  test('"h" → Hour(1)', () => {
    const off = toOffset("h");
    expect(off).toBeInstanceOf(Hour);
    expect(off?.n).toBe(1);
  });

  test('"H" legacy → Hour(1)', () => {
    expect(toOffset("H")).toBeInstanceOf(Hour);
  });

  test('"min" → Minute(1)', () => {
    expect(toOffset("min")).toBeInstanceOf(Minute);
  });

  test('"T" legacy → Minute(1)', () => {
    expect(toOffset("T")).toBeInstanceOf(Minute);
  });

  test('"s" → Second(1)', () => {
    expect(toOffset("s")).toBeInstanceOf(Second);
  });

  test('"ms" → Milli(1)', () => {
    expect(toOffset("ms")).toBeInstanceOf(Milli);
  });

  test('"L" legacy → Milli(1)', () => {
    expect(toOffset("L")).toBeInstanceOf(Milli);
  });

  test('"W" → Week(1)', () => {
    const off = toOffset("W");
    expect(off).toBeInstanceOf(Week);
    expect(off?.n).toBe(1);
  });

  test('"W-MON" → Week(1, { weekday: 0 })', () => {
    const off = toOffset("W-MON");
    expect(off).toBeInstanceOf(Week);
    const w = off as Week;
    expect(w.weekday).toBe(0);
  });

  test('"W-SUN" → Week(1, { weekday: 6 })', () => {
    const off = toOffset("W-SUN");
    expect(off).toBeInstanceOf(Week);
    const w = off as Week;
    expect(w.weekday).toBe(6);
  });

  test('"2W-FRI" → Week(2, { weekday: 4 })', () => {
    const off = toOffset("2W-FRI");
    expect(off).toBeInstanceOf(Week);
    expect(off?.n).toBe(2);
    const w = off as Week;
    expect(w.weekday).toBe(4);
  });

  test("multiplier 0 is preserved", () => {
    const off = toOffset("0D");
    expect(off).toBeInstanceOf(Day);
    expect(off?.n).toBe(0);
  });

  test("large multiplier", () => {
    const off = toOffset("365D");
    expect(off).toBeInstanceOf(Day);
    expect(off?.n).toBe(365);
  });
});

// ─── inferFreq ────────────────────────────────────────────────────────────────

describe("inferFreq", () => {
  test("empty array → null", () => {
    expect(inferFreq([])).toBeNull();
  });

  test("single element → null", () => {
    expect(inferFreq([new Date("2024-01-01")])).toBeNull();
  });

  test("unsorted dates → null", () => {
    expect(
      inferFreq([new Date("2024-01-03"), new Date("2024-01-01"), new Date("2024-01-02")]),
    ).toBeNull();
  });

  test("calendar daily frequency", () => {
    const dates = [utc(2024, 1, 1), utc(2024, 1, 2), utc(2024, 1, 3), utc(2024, 1, 4)];
    expect(inferFreq(dates)).toBe("D");
  });

  test("hourly frequency", () => {
    const t0 = new Date("2024-01-01T00:00:00Z").getTime();
    const dates = [0, 1, 2, 3].map((h) => new Date(t0 + h * 3_600_000));
    expect(inferFreq(dates)).toBe("h");
  });

  test("minute frequency", () => {
    const t0 = new Date("2024-01-01T00:00:00Z").getTime();
    const dates = [0, 1, 2, 3].map((m) => new Date(t0 + m * 60_000));
    expect(inferFreq(dates)).toBe("min");
  });

  test("second frequency", () => {
    const t0 = new Date("2024-01-01T00:00:00Z").getTime();
    const dates = [0, 1, 2, 3].map((s) => new Date(t0 + s * 1_000));
    expect(inferFreq(dates)).toBe("s");
  });

  test("millisecond frequency", () => {
    const t0 = new Date("2024-01-01T00:00:00Z").getTime();
    const dates = [0, 1, 2, 3].map((ms) => new Date(t0 + ms));
    expect(inferFreq(dates)).toBe("ms");
  });

  test("weekly frequency (W-MON)", () => {
    // All Mondays in January 2024
    const dates = [utc(2024, 1, 1), utc(2024, 1, 8), utc(2024, 1, 15), utc(2024, 1, 22)];
    const freq = inferFreq(dates);
    expect(freq).toContain("W-");
  });

  test("month-end frequency", () => {
    const dates = [utc(2024, 1, 31), utc(2024, 2, 29), utc(2024, 3, 31), utc(2024, 4, 30)];
    expect(inferFreq(dates)).toBe("ME");
  });

  test("month-begin frequency", () => {
    const dates = [utc(2024, 1, 1), utc(2024, 2, 1), utc(2024, 3, 1), utc(2024, 4, 1)];
    expect(inferFreq(dates)).toBe("MS");
  });

  test("quarter-end frequency", () => {
    const dates = [utc(2024, 3, 31), utc(2024, 6, 30), utc(2024, 9, 30), utc(2024, 12, 31)];
    expect(inferFreq(dates)).toBe("QE");
  });

  test("quarter-begin frequency", () => {
    const dates = [utc(2024, 1, 1), utc(2024, 4, 1), utc(2024, 7, 1), utc(2024, 10, 1)];
    expect(inferFreq(dates)).toBe("QS");
  });

  test("year-end frequency", () => {
    const dates = [
      utc(2021, 12, 31),
      utc(2022, 12, 31),
      utc(2023, 12, 31),
      utc(2024, 12, 31),
    ];
    expect(inferFreq(dates)).toBe("YE");
  });

  test("year-begin frequency", () => {
    const dates = [utc(2021, 1, 1), utc(2022, 1, 1), utc(2023, 1, 1), utc(2024, 1, 1)];
    expect(inferFreq(dates)).toBe("YS");
  });

  test("business-day frequency (weekdays only)", () => {
    // Mon–Fri Jan 8–12 2024
    const dates = [
      utc(2024, 1, 8), // Mon
      utc(2024, 1, 9), // Tue
      utc(2024, 1, 10), // Wed
      utc(2024, 1, 11), // Thu
      utc(2024, 1, 12), // Fri
      utc(2024, 1, 15), // Mon (skip weekend)
    ];
    expect(inferFreq(dates)).toBe("B");
  });

  test("irregular spacing → null", () => {
    const dates = [utc(2024, 1, 1), utc(2024, 1, 2), utc(2024, 1, 5)];
    expect(inferFreq(dates)).toBeNull();
  });
});

// ─── FREQ_ALIASES ─────────────────────────────────────────────────────────────

describe("FREQ_ALIASES", () => {
  test("is a Map", () => {
    expect(FREQ_ALIASES).toBeInstanceOf(Map);
  });

  test("contains common aliases", () => {
    expect(FREQ_ALIASES.has("D")).toBe(true);
    expect(FREQ_ALIASES.has("ME")).toBe(true);
    expect(FREQ_ALIASES.has("B")).toBe(true);
    expect(FREQ_ALIASES.has("QE")).toBe(true);
    expect(FREQ_ALIASES.has("YE")).toBe(true);
  });
});

// ─── property-based ───────────────────────────────────────────────────────────

describe("property-based: toOffset", () => {
  const validAliases = ["D", "B", "ME", "MS", "QE", "QS", "YE", "YS", "h", "min", "s", "ms"];

  test("toOffset(alias) is never null for valid alias", () => {
    fc.assert(
      fc.property(fc.constantFrom(...validAliases), (alias) => {
        return toOffset(alias) !== null;
      }),
    );
  });

  test("toOffset(nAlias) preserves the multiplier", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.constantFrom(...validAliases),
        (n, alias) => {
          const off = toOffset(`${n}${alias}`);
          return off !== null && off.n === n;
        },
      ),
    );
  });
});
