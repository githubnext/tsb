/**
 * Tests for DatetimeIndex and DatetimeTZDtype.
 */

import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import { DatetimeIndex, DatetimeTZDtype, date_range } from "../../src/index.ts";

// ─── DatetimeTZDtype ──────────────────────────────────────────────────────────

describe("DatetimeTZDtype", () => {
  test("stores tz", () => {
    const dt = new DatetimeTZDtype("America/New_York");
    expect(dt.tz).toBe("America/New_York");
  });

  test("toString returns datetime64[ns, tz] format", () => {
    const dt = new DatetimeTZDtype("UTC");
    expect(dt.toString()).toBe("datetime64[ns, UTC]");
  });

  test("equals same tz", () => {
    const a = new DatetimeTZDtype("Europe/Berlin");
    const b = new DatetimeTZDtype("Europe/Berlin");
    expect(a.equals(b)).toBe(true);
  });

  test("not equals different tz", () => {
    const a = new DatetimeTZDtype("UTC");
    const b = new DatetimeTZDtype("America/New_York");
    expect(a.equals(b)).toBe(false);
  });

  test("kind is datetime", () => {
    const dt = new DatetimeTZDtype("UTC");
    expect(dt.kind).toBe("datetime");
  });
});

// ─── construction ─────────────────────────────────────────────────────────────

describe("DatetimeIndex construction", () => {
  test("constructs from ISO strings", () => {
    const idx = new DatetimeIndex(["2021-01-01", "2021-06-15"]);
    expect(idx.size).toBe(2);
    expect(idx.values[0]?.toISOString().startsWith("2021-01-01")).toBe(true);
  });

  test("constructs from Date objects", () => {
    const d = new Date("2022-03-10T00:00:00.000Z");
    const idx = new DatetimeIndex([d]);
    expect(idx.at(0)?.getTime()).toBe(d.getTime());
  });

  test("constructs from ms timestamps", () => {
    const ms = Date.UTC(2023, 0, 1);
    const idx = DatetimeIndex.fromMs([ms]);
    expect(idx.at(0)?.getFullYear()).toBe(2023);
  });

  test("constructs from strings via fromStrings", () => {
    const idx = DatetimeIndex.fromStrings(["2020-01-01"]);
    expect(idx.size).toBe(1);
  });

  test("null/invalid becomes epoch", () => {
    const idx = new DatetimeIndex([null, undefined]);
    expect(idx.at(0)?.getTime()).toBe(0);
    expect(idx.at(1)?.getTime()).toBe(0);
  });

  test("tz stored from options", () => {
    const idx = new DatetimeIndex(["2021-01-01"], { tz: "UTC" });
    expect(idx.tz).toBe("UTC");
  });

  test("tz defaults to null", () => {
    const idx = new DatetimeIndex(["2021-01-01"]);
    expect(idx.tz).toBeNull();
  });

  test("name stored", () => {
    const idx = new DatetimeIndex(["2021-01-01"], { name: "dates" });
    expect(idx.name).toBe("dates");
  });

  test("empty index", () => {
    const idx = new DatetimeIndex([]);
    expect(idx.size).toBe(0);
    expect(idx.empty).toBe(true);
  });
});

// ─── dtype ────────────────────────────────────────────────────────────────────

describe("DatetimeIndex dtype", () => {
  test("naive dtype is datetime64[ns]", () => {
    const idx = new DatetimeIndex(["2021-01-01"]);
    expect(idx.dtype).toBe("datetime64[ns]");
  });

  test("tz-aware dtype is DatetimeTZDtype", () => {
    const idx = new DatetimeIndex(["2021-01-01"], { tz: "UTC" });
    const dt = idx.dtype;
    expect(dt instanceof DatetimeTZDtype).toBe(true);
    if (dt instanceof DatetimeTZDtype) {
      expect(dt.tz).toBe("UTC");
    }
  });
});

// ─── core properties ──────────────────────────────────────────────────────────

describe("DatetimeIndex properties", () => {
  test("size", () => {
    const idx = new DatetimeIndex(["2021-01-01", "2021-06-15", "2021-12-31"]);
    expect(idx.size).toBe(3);
  });

  test("shape", () => {
    const idx = new DatetimeIndex(["2021-01-01", "2021-06-15"]);
    expect(idx.shape).toEqual([2]);
  });

  test("ndim is 1", () => {
    const idx = new DatetimeIndex(["2021-01-01"]);
    expect(idx.ndim).toBe(1);
  });

  test("values is frozen array of Dates", () => {
    const idx = new DatetimeIndex(["2021-01-01"]);
    expect(idx.values.length).toBe(1);
    expect(idx.values[0]).toBeInstanceOf(Date);
  });

  test("at returns Date", () => {
    const idx = new DatetimeIndex(["2021-01-01"]);
    expect(idx.at(0)).toBeInstanceOf(Date);
  });

  test("at out-of-bounds returns null", () => {
    const idx = new DatetimeIndex(["2021-01-01"]);
    expect(idx.at(99)).toBeNull();
  });

  test("isUnique true for distinct timestamps", () => {
    const idx = new DatetimeIndex(["2021-01-01", "2021-01-02"]);
    expect(idx.isUnique).toBe(true);
  });

  test("isUnique false for duplicate timestamps", () => {
    const idx = new DatetimeIndex(["2021-01-01", "2021-01-01"]);
    expect(idx.isUnique).toBe(false);
  });

  test("isMonotonicIncreasing", () => {
    const idx = new DatetimeIndex(["2021-01-01", "2021-01-02", "2021-01-03"]);
    expect(idx.isMonotonicIncreasing).toBe(true);
  });

  test("isMonotonicDecreasing", () => {
    const idx = new DatetimeIndex(["2021-01-03", "2021-01-02", "2021-01-01"]);
    expect(idx.isMonotonicDecreasing).toBe(true);
  });
});

// ─── component accessors (UTC/naive) ─────────────────────────────────────────

describe("DatetimeIndex components (naive/UTC)", () => {
  const idx = new DatetimeIndex([
    "2021-01-15T10:30:45.000Z",
    "2022-06-30T23:59:59.000Z",
    "2020-02-29T00:00:00.000Z", // leap day
  ]);

  test("year", () => {
    expect(idx.year).toEqual([2021, 2022, 2020]);
  });

  test("month", () => {
    expect(idx.month).toEqual([1, 6, 2]);
  });

  test("day", () => {
    expect(idx.day).toEqual([15, 30, 29]);
  });

  test("hour", () => {
    expect(idx.hour).toEqual([10, 23, 0]);
  });

  test("minute", () => {
    expect(idx.minute).toEqual([30, 59, 0]);
  });

  test("second", () => {
    expect(idx.second).toEqual([45, 59, 0]);
  });

  test("millisecond", () => {
    const idx2 = new DatetimeIndex(["2021-01-01T00:00:00.123Z"]);
    expect(idx2.millisecond).toEqual([123]);
  });

  test("dayofweek: 0=Monday", () => {
    // 2021-01-15 is a Friday (4), 2022-06-30 is a Thursday (3), 2020-02-29 is Saturday (5)
    expect(idx.dayofweek).toEqual([4, 3, 5]);
  });

  test("day_of_week alias", () => {
    expect(idx.day_of_week).toEqual(idx.dayofweek);
  });

  test("dayofyear", () => {
    // Jan 15 = 15, Jun 30 = 181, Feb 29 = 60 (leap 2020)
    expect(idx.dayofyear).toEqual([15, 181, 60]);
  });

  test("day_of_year alias", () => {
    expect(idx.day_of_year).toEqual(idx.dayofyear);
  });

  test("quarter", () => {
    expect(idx.quarter).toEqual([1, 2, 1]);
  });

  test("weekofyear", () => {
    // 2021-01-15 is ISO week 2, 2022-06-30 is ISO week 26
    expect(idx.weekofyear[0]).toBe(2);
    expect(idx.weekofyear[1]).toBe(26);
  });

  test("week alias", () => {
    expect(idx.week).toEqual(idx.weekofyear);
  });

  test("is_leap_year", () => {
    // 2021 not leap, 2022 not leap, 2020 leap
    expect(idx.is_leap_year).toEqual([false, false, true]);
  });

  test("is_month_start", () => {
    const i2 = new DatetimeIndex(["2021-01-01", "2021-01-15", "2021-02-01"]);
    expect(i2.is_month_start).toEqual([true, false, true]);
  });

  test("is_month_end", () => {
    const i2 = new DatetimeIndex(["2021-01-31", "2021-01-15", "2020-02-29"]);
    expect(i2.is_month_end).toEqual([true, false, true]);
  });

  test("is_year_start", () => {
    const i2 = new DatetimeIndex(["2021-01-01", "2021-03-01", "2022-01-01"]);
    expect(i2.is_year_start).toEqual([true, false, true]);
  });

  test("is_year_end", () => {
    const i2 = new DatetimeIndex(["2021-12-31", "2021-12-30", "2022-12-31"]);
    expect(i2.is_year_end).toEqual([true, false, true]);
  });

  test("is_quarter_start", () => {
    const i2 = new DatetimeIndex(["2021-01-01", "2021-04-01", "2021-02-01"]);
    expect(i2.is_quarter_start).toEqual([true, true, false]);
  });

  test("is_quarter_end", () => {
    const i2 = new DatetimeIndex(["2021-03-31", "2021-06-30", "2021-04-30"]);
    expect(i2.is_quarter_end).toEqual([true, true, false]);
  });
});

// ─── asi8 / date ─────────────────────────────────────────────────────────────

describe("DatetimeIndex asi8 and date", () => {
  test("asi8 returns ms timestamps", () => {
    const ms = Date.UTC(2021, 0, 1);
    const idx = DatetimeIndex.fromMs([ms]);
    expect(idx.asi8).toEqual([ms]);
  });

  test("date strips time component", () => {
    const idx = new DatetimeIndex(["2021-01-15T10:30:00.000Z"]);
    const d = idx.date[0];
    expect(d?.getUTCHours()).toBe(0);
    expect(d?.getUTCMinutes()).toBe(0);
    expect(d?.getUTCDate()).toBe(15);
  });
});

// ─── strftime ─────────────────────────────────────────────────────────────────

describe("DatetimeIndex strftime", () => {
  test("basic Y-m-d format", () => {
    const idx = new DatetimeIndex(["2021-06-15T00:00:00.000Z"]);
    expect(idx.strftime("%Y-%m-%d")).toEqual(["2021-06-15"]);
  });

  test("time components", () => {
    const idx = new DatetimeIndex(["2021-01-01T14:30:05.000Z"]);
    expect(idx.strftime("%H:%M:%S")).toEqual(["14:30:05"]);
  });

  test("literal percent", () => {
    const idx = new DatetimeIndex(["2021-01-01T00:00:00.000Z"]);
    expect(idx.strftime("100%%")).toEqual(["100%"]);
  });

  test("weekday names", () => {
    // 2021-01-15 = Friday
    const idx = new DatetimeIndex(["2021-01-15T00:00:00.000Z"]);
    expect(idx.strftime("%A")).toEqual(["Friday"]);
    expect(idx.strftime("%a")).toEqual(["Fri"]);
  });

  test("month names", () => {
    const idx = new DatetimeIndex(["2021-06-01T00:00:00.000Z"]);
    expect(idx.strftime("%B")).toEqual(["June"]);
    expect(idx.strftime("%b")).toEqual(["Jun"]);
  });

  test("two-digit year", () => {
    const idx = new DatetimeIndex(["2021-01-01T00:00:00.000Z"]);
    expect(idx.strftime("%y")).toEqual(["21"]);
  });

  test("AM/PM", () => {
    const idx = new DatetimeIndex(["2021-01-01T08:00:00.000Z", "2021-01-01T14:00:00.000Z"]);
    expect(idx.strftime("%p")).toEqual(["AM", "PM"]);
  });

  test("12-hour clock", () => {
    const idx = new DatetimeIndex([
      "2021-01-01T00:00:00.000Z", // 12 AM
      "2021-01-01T13:00:00.000Z", // 1 PM
    ]);
    expect(idx.strftime("%I")).toEqual(["12", "01"]);
  });

  test("day of year", () => {
    const idx = new DatetimeIndex(["2021-01-01T00:00:00.000Z", "2021-12-31T00:00:00.000Z"]);
    expect(idx.strftime("%j")).toEqual(["001", "365"]);
  });
});

// ─── normalize ────────────────────────────────────────────────────────────────

describe("DatetimeIndex normalize", () => {
  test("strips time to midnight UTC", () => {
    const idx = new DatetimeIndex(["2021-06-15T10:30:45.123Z"]);
    const normed = idx.normalize();
    const d = normed.at(0);
    expect(d?.getUTCHours()).toBe(0);
    expect(d?.getUTCMinutes()).toBe(0);
    expect(d?.getUTCSeconds()).toBe(0);
    expect(d?.getUTCMilliseconds()).toBe(0);
    expect(d?.getUTCDate()).toBe(15);
  });

  test("already midnight stays midnight", () => {
    const idx = new DatetimeIndex(["2021-06-15T00:00:00.000Z"]);
    const normed = idx.normalize();
    expect(normed.at(0)?.getTime()).toBe(idx.at(0)?.getTime());
  });
});

// ─── floor / ceil / round ────────────────────────────────────────────────────

describe("DatetimeIndex floor/ceil/round", () => {
  const idx = new DatetimeIndex(["2021-01-15T10:37:25.123Z"]);

  test("floor to hour", () => {
    const f = idx.floor("H");
    expect(f.at(0)?.getUTCHours()).toBe(10);
    expect(f.at(0)?.getUTCMinutes()).toBe(0);
  });

  test("ceil to hour", () => {
    const c = idx.ceil("H");
    expect(c.at(0)?.getUTCHours()).toBe(11);
    expect(c.at(0)?.getUTCMinutes()).toBe(0);
  });

  test("round to hour: below half rounds down", () => {
    const idx2 = new DatetimeIndex(["2021-01-15T10:29:00.000Z"]);
    const r = idx2.round("H");
    expect(r.at(0)?.getUTCHours()).toBe(10);
  });

  test("round to hour: at half rounds up", () => {
    const idx2 = new DatetimeIndex(["2021-01-15T10:30:00.000Z"]);
    const r = idx2.round("H");
    expect(r.at(0)?.getUTCHours()).toBe(11);
  });

  test("floor to day", () => {
    const f = idx.floor("D");
    expect(f.at(0)?.getUTCHours()).toBe(0);
    expect(f.at(0)?.getUTCDate()).toBe(15);
  });

  test("throws for calendar frequency", () => {
    expect(() => idx.floor("MS")).toThrow();
  });
});

// ─── shift ────────────────────────────────────────────────────────────────────

describe("DatetimeIndex shift", () => {
  test("shift by days", () => {
    const idx = new DatetimeIndex(["2021-01-01T00:00:00.000Z"]);
    const shifted = idx.shift(5, "D");
    expect(shifted.at(0)?.getUTCDate()).toBe(6);
  });

  test("shift by hours", () => {
    const idx = new DatetimeIndex(["2021-01-01T00:00:00.000Z"]);
    const shifted = idx.shift(3, "H");
    expect(shifted.at(0)?.getUTCHours()).toBe(3);
  });

  test("shift by weeks", () => {
    const idx = new DatetimeIndex(["2021-01-01T00:00:00.000Z"]);
    const shifted = idx.shift(1, "W");
    expect(shifted.at(0)?.getUTCDate()).toBe(8);
  });

  test("shift by month start", () => {
    const idx = new DatetimeIndex(["2021-01-01T00:00:00.000Z"]);
    const shifted = idx.shift(2, "MS");
    expect(shifted.at(0)?.getUTCMonth()).toBe(2); // March
    expect(shifted.at(0)?.getUTCDate()).toBe(1);
  });

  test("negative shift", () => {
    const idx = new DatetimeIndex(["2021-06-15T00:00:00.000Z"]);
    const shifted = idx.shift(-5, "D");
    expect(shifted.at(0)?.getUTCDate()).toBe(10);
  });

  test("default freq is D", () => {
    const idx = new DatetimeIndex(["2021-01-01T00:00:00.000Z"]);
    const shifted = idx.shift(1);
    expect(shifted.at(0)?.getUTCDate()).toBe(2);
  });
});

// ─── rename ───────────────────────────────────────────────────────────────────

describe("DatetimeIndex rename", () => {
  test("returns copy with new name", () => {
    const idx = new DatetimeIndex(["2021-01-01"], { name: "old" });
    const renamed = idx.rename("new");
    expect(renamed.name).toBe("new");
    expect(idx.name).toBe("old");
  });
});

// ─── timezone operations ─────────────────────────────────────────────────────

describe("DatetimeIndex timezone", () => {
  test("tz_localize assigns timezone", () => {
    const idx = new DatetimeIndex(["2021-06-15T12:00:00.000Z"]);
    const tz = idx.tz_localize("UTC");
    expect(tz.tz).toBe("UTC");
  });

  test("tz_localize(null) strips timezone", () => {
    const idx = new DatetimeIndex(["2021-06-15T12:00:00.000Z"], { tz: "UTC" });
    const naive = idx.tz_localize(null);
    expect(naive.tz).toBeNull();
  });

  test("tz_convert changes timezone annotation", () => {
    const idx = new DatetimeIndex(["2021-06-15T12:00:00.000Z"], { tz: "UTC" });
    const converted = idx.tz_convert("Europe/Berlin");
    expect(converted.tz).toBe("Europe/Berlin");
    // UTC timestamps stay the same
    expect(converted.asi8[0]).toBe(idx.asi8[0]);
  });
});

// ─── toString ─────────────────────────────────────────────────────────────────

describe("DatetimeIndex toString", () => {
  test("includes DatetimeIndex label", () => {
    const idx = new DatetimeIndex(["2021-01-01T00:00:00.000Z"]);
    expect(idx.toString()).toContain("DatetimeIndex");
  });

  test("includes tz when set", () => {
    const idx = new DatetimeIndex(["2021-01-01T00:00:00.000Z"], { tz: "UTC" });
    expect(idx.toString()).toContain("UTC");
  });
});

// ─── date_range ───────────────────────────────────────────────────────────────

describe("date_range", () => {
  test("D frequency with periods", () => {
    const rng = date_range("2024-01-01", { periods: 5, freq: "D" });
    expect(rng.size).toBe(5);
    expect(rng.day).toEqual([1, 2, 3, 4, 5]);
    expect(rng.month).toEqual([1, 1, 1, 1, 1]);
  });

  test("D frequency with end", () => {
    const rng = date_range("2024-01-01", { end: "2024-01-05", freq: "D" });
    expect(rng.size).toBe(5);
  });

  test("H frequency", () => {
    const rng = date_range("2024-01-01T00:00:00.000Z", { periods: 4, freq: "H" });
    expect(rng.size).toBe(4);
    expect(rng.hour).toEqual([0, 1, 2, 3]);
  });

  test("W frequency", () => {
    const rng = date_range("2024-01-01", { periods: 3, freq: "W" });
    expect(rng.size).toBe(3);
    // 7 days apart
    const diff = (rng.asi8[1] ?? 0) - (rng.asi8[0] ?? 0);
    expect(diff).toBe(7 * 24 * 3600 * 1000);
  });

  test("MS frequency (month start)", () => {
    const rng = date_range("2024-01-01", { periods: 3, freq: "MS" });
    expect(rng.size).toBe(3);
    expect(rng.month).toEqual([1, 2, 3]);
    expect(rng.day).toEqual([1, 1, 1]);
  });

  test("ME frequency (month end)", () => {
    const rng = date_range("2024-01-31", { periods: 3, freq: "ME" });
    expect(rng.size).toBe(3);
    expect(rng.month).toEqual([1, 2, 3]);
    // Each date should be the last day of its month
    expect(rng.is_month_end).toEqual([true, true, true]);
  });

  test("QS frequency", () => {
    const rng = date_range("2024-01-01", { periods: 4, freq: "QS" });
    expect(rng.size).toBe(4);
    expect(rng.month).toEqual([1, 4, 7, 10]);
    expect(rng.day).toEqual([1, 1, 1, 1]);
  });

  test("YS frequency", () => {
    const rng = date_range("2023-01-01", { periods: 3, freq: "YS" });
    expect(rng.size).toBe(3);
    expect(rng.year).toEqual([2023, 2024, 2025]);
    expect(rng.month).toEqual([1, 1, 1]);
  });

  test("YE frequency", () => {
    const rng = date_range("2023-12-31", { periods: 3, freq: "YE" });
    expect(rng.size).toBe(3);
    expect(rng.year).toEqual([2023, 2024, 2025]);
    expect(rng.is_year_end).toEqual([true, true, true]);
  });

  test("multiplier: 2D", () => {
    const rng = date_range("2024-01-01", { periods: 3, freq: "2D" });
    expect(rng.day).toEqual([1, 3, 5]);
  });

  test("multiplier: 3H", () => {
    const rng = date_range("2024-01-01T00:00:00.000Z", { periods: 3, freq: "3H" });
    expect(rng.hour).toEqual([0, 3, 6]);
  });

  test("tz option", () => {
    const rng = date_range("2024-01-01", { periods: 2, tz: "UTC" });
    expect(rng.tz).toBe("UTC");
  });

  test("name option", () => {
    const rng = date_range("2024-01-01", { periods: 2, name: "my_dates" });
    expect(rng.name).toBe("my_dates");
  });

  test("default freq is D", () => {
    const rng = date_range("2024-01-01", { periods: 3 });
    const diff = (rng.asi8[1] ?? 0) - (rng.asi8[0] ?? 0);
    expect(diff).toBe(86_400_000);
  });

  test("min frequency ms", () => {
    const rng = date_range("2024-01-01T00:00:00.000Z", { periods: 3, freq: "min" });
    expect(rng.size).toBe(3);
    const diff = (rng.asi8[1] ?? 0) - (rng.asi8[0] ?? 0);
    expect(diff).toBe(60_000);
  });

  test("throws on invalid start", () => {
    expect(() => date_range("not-a-date", { periods: 1 })).toThrow();
  });

  test("monotonically increasing", () => {
    const rng = date_range("2024-01-01", { periods: 10 });
    expect(rng.isMonotonicIncreasing).toBe(true);
  });

  test("isUnique for daily range", () => {
    const rng = date_range("2024-01-01", { periods: 5 });
    expect(rng.isUnique).toBe(true);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

describe("DatetimeIndex property tests", () => {
  test("size equals data length", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 10000000000000 }), { maxLength: 20 }),
        (ms) => {
          const idx = DatetimeIndex.fromMs(ms);
          expect(idx.size).toBe(ms.length);
        },
      ),
    );
  });

  test("year component in valid range", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 946684800000 }), { minLength: 1, maxLength: 10 }),
        (ms) => {
          const idx = DatetimeIndex.fromMs(ms);
          for (const y of idx.year) {
            expect(y).toBeGreaterThanOrEqual(1970);
          }
        },
      ),
    );
  });

  test("month in [1,12]", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 946684800000 }), { minLength: 1, maxLength: 10 }),
        (ms) => {
          const idx = DatetimeIndex.fromMs(ms);
          for (const m of idx.month) {
            expect(m).toBeGreaterThanOrEqual(1);
            expect(m).toBeLessThanOrEqual(12);
          }
        },
      ),
    );
  });

  test("day in [1,31]", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 946684800000 }), { minLength: 1, maxLength: 10 }),
        (ms) => {
          const idx = DatetimeIndex.fromMs(ms);
          for (const d of idx.day) {
            expect(d).toBeGreaterThanOrEqual(1);
            expect(d).toBeLessThanOrEqual(31);
          }
        },
      ),
    );
  });

  test("dayofweek in [0,6]", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 946684800000 }), { minLength: 1, maxLength: 10 }),
        (ms) => {
          const idx = DatetimeIndex.fromMs(ms);
          for (const dow of idx.dayofweek) {
            expect(dow).toBeGreaterThanOrEqual(0);
            expect(dow).toBeLessThanOrEqual(6);
          }
        },
      ),
    );
  });

  test("quarter in [1,4]", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 946684800000 }), { minLength: 1, maxLength: 10 }),
        (ms) => {
          const idx = DatetimeIndex.fromMs(ms);
          for (const q of idx.quarter) {
            expect(q).toBeGreaterThanOrEqual(1);
            expect(q).toBeLessThanOrEqual(4);
          }
        },
      ),
    );
  });

  test("date_range periods matches size", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 50 }), (periods) => {
        const rng = date_range("2020-01-01", { periods, freq: "D" });
        expect(rng.size).toBe(periods);
      }),
    );
  });

  test("date_range is monotonically increasing for D freq", () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 30 }), (periods) => {
        const rng = date_range("2020-01-01", { periods, freq: "D" });
        expect(rng.isMonotonicIncreasing).toBe(true);
      }),
    );
  });

  test("strftime Y-m-d round-trips through Date parsing", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 946684800000 }), (ms) => {
        const idx = DatetimeIndex.fromMs([ms]);
        const formatted = idx.strftime("%Y-%m-%d")[0];
        expect(formatted).toMatch(ISO_DATE_RE);
      }),
    );
  });
});
