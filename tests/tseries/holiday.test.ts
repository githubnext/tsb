/**
 * Tests for tseries/holiday — pandas-compatible holiday calendar system.
 *
 * Covers:
 * - Observance functions (nearestWorkday, sundayToMonday, nextMonday, etc.)
 * - WeekdayOffset helpers (MO, TH, …)
 * - Holiday.dates() — fixed, floating, with startDate/endDate/year
 * - USFederalHolidayCalendar known dates
 * - AbstractHolidayCalendar.holidays() deduplication and sorting
 * - Calendar registry (get_calendar / register_calendar)
 */

import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import {
  AbstractHolidayCalendar,
  FR,
  Holiday,
  MO,
  TH,
  USChristmasDay,
  USColumbusDay,
  USFederalHolidayCalendar,
  USIndependenceDay,
  USJuneteenth,
  USLaborDay,
  USMartinLutherKingJrDay,
  USMemorialDay,
  USNewYearsDay,
  USPresidentsDay,
  USThanksgivingDay,
  USVeteransDay,
  get_calendar,
  nearestWorkday,
  nextMonday,
  nextMondayOrTuesday,
  previousFriday,
  previousWorkday,
  register_calendar,
  sundayToMonday,
} from "tsb";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a UTC midnight Date from (year, month, day). month is 1-based. */
function utc(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

/** Return "YYYY-MM-DD" string for a UTC Date. */
function fmt(d: Date): string {
  const y = d.getUTCFullYear().toString().padStart(4, "0");
  const m = (d.getUTCMonth() + 1).toString().padStart(2, "0");
  const dd = d.getUTCDate().toString().padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

// ─── Observance Functions ─────────────────────────────────────────────────────

describe("nearestWorkday", () => {
  // 2024-01-06 = Saturday
  test("Saturday → previous Friday", () => {
    const sat = utc(2024, 1, 6);
    expect(fmt(nearestWorkday(sat))).toBe("2024-01-05");
  });

  // 2024-01-07 = Sunday
  test("Sunday → next Monday", () => {
    const sun = utc(2024, 1, 7);
    expect(fmt(nearestWorkday(sun))).toBe("2024-01-08");
  });

  test("Monday unchanged", () => {
    const mon = utc(2024, 1, 8);
    expect(fmt(nearestWorkday(mon))).toBe("2024-01-08");
  });

  test("Friday unchanged", () => {
    const fri = utc(2024, 1, 5);
    expect(fmt(nearestWorkday(fri))).toBe("2024-01-05");
  });
});

describe("sundayToMonday", () => {
  test("Sunday → Monday", () => {
    const sun = utc(2024, 1, 7);
    expect(fmt(sundayToMonday(sun))).toBe("2024-01-08");
  });

  test("Saturday unchanged", () => {
    const sat = utc(2024, 1, 6);
    expect(fmt(sundayToMonday(sat))).toBe("2024-01-06");
  });

  test("Monday unchanged", () => {
    expect(fmt(sundayToMonday(utc(2024, 1, 8)))).toBe("2024-01-08");
  });
});

describe("nextMonday", () => {
  test("Monday stays", () => {
    expect(fmt(nextMonday(utc(2024, 1, 8)))).toBe("2024-01-08");
  });

  test("Tuesday → next Monday", () => {
    expect(fmt(nextMonday(utc(2024, 1, 9)))).toBe("2024-01-15");
  });

  test("Sunday → next Monday", () => {
    expect(fmt(nextMonday(utc(2024, 1, 7)))).toBe("2024-01-08");
  });

  test("Saturday → next Monday", () => {
    expect(fmt(nextMonday(utc(2024, 1, 6)))).toBe("2024-01-08");
  });
});

describe("nextMondayOrTuesday", () => {
  test("Saturday → Tuesday", () => {
    const sat = utc(2024, 1, 6);
    expect(fmt(nextMondayOrTuesday(sat))).toBe("2024-01-09");
  });

  test("Sunday → Monday", () => {
    expect(fmt(nextMondayOrTuesday(utc(2024, 1, 7)))).toBe("2024-01-08");
  });

  test("Monday unchanged", () => {
    expect(fmt(nextMondayOrTuesday(utc(2024, 1, 8)))).toBe("2024-01-08");
  });
});

describe("previousFriday", () => {
  test("Friday stays", () => {
    expect(fmt(previousFriday(utc(2024, 1, 5)))).toBe("2024-01-05");
  });

  test("Saturday → Friday", () => {
    expect(fmt(previousFriday(utc(2024, 1, 6)))).toBe("2024-01-05");
  });

  test("Thursday → previous Friday", () => {
    expect(fmt(previousFriday(utc(2024, 1, 4)))).toBe("2023-12-29");
  });
});

describe("previousWorkday", () => {
  test("Friday unchanged", () => {
    expect(fmt(previousWorkday(utc(2024, 1, 5)))).toBe("2024-01-05");
  });

  test("Saturday → Friday", () => {
    expect(fmt(previousWorkday(utc(2024, 1, 6)))).toBe("2024-01-05");
  });

  test("Sunday → Friday", () => {
    expect(fmt(previousWorkday(utc(2024, 1, 7)))).toBe("2024-01-05");
  });

  test("Monday unchanged", () => {
    expect(fmt(previousWorkday(utc(2024, 1, 8)))).toBe("2024-01-08");
  });
});

// ─── WeekdayOffset Constructors ───────────────────────────────────────────────

describe("MO / TH / FR constructors", () => {
  test("MO(3) yields weekday=0, n=3", () => {
    const off = MO(3);
    expect(off.weekday).toBe(0);
    expect(off.n).toBe(3);
  });

  test("TH(4) yields weekday=3, n=4", () => {
    const off = TH(4);
    expect(off.weekday).toBe(3);
    expect(off.n).toBe(4);
  });

  test("FR(-1) yields weekday=4, n=-1", () => {
    const off = FR(-1);
    expect(off.weekday).toBe(4);
    expect(off.n).toBe(-1);
  });
});

// ─── Holiday.dates() ─────────────────────────────────────────────────────────

describe("Holiday.dates() — fixed holiday", () => {
  test("Dec 25 lands inside range", () => {
    const xmas = new Holiday("Christmas", { month: 12, day: 25, observance: nearestWorkday });
    const dates = xmas.dates(utc(2024, 12, 1), utc(2024, 12, 31));
    expect(dates.length).toBe(1);
    // 2024-12-25 = Wednesday → stays Wednesday
    expect(fmt(dates[0]!)).toBe("2024-12-25");
  });

  test("New Year's Day 2022: Jan 1 is Saturday → observed Dec 31 2021 (cross-year)", () => {
    const ny = new Holiday("New Year's Day", { month: 1, day: 1, observance: nearestWorkday });
    // 2022-01-01 = Saturday → observed 2021-12-31
    const dec = ny.dates(utc(2021, 12, 1), utc(2021, 12, 31));
    expect(dec.some((d) => fmt(d) === "2021-12-31")).toBe(true);
  });

  test("New Year's Day 2023: Jan 1 is Sunday → observed Jan 2", () => {
    const ny = new Holiday("New Year's Day", { month: 1, day: 1, observance: nearestWorkday });
    const jan = ny.dates(utc(2023, 1, 1), utc(2023, 1, 31));
    expect(jan.some((d) => fmt(d) === "2023-01-02")).toBe(true);
  });

  test("specific year rule only generates one date", () => {
    const oneOff = new Holiday("One-off", { month: 6, day: 15, year: 2024 });
    const d2024 = oneOff.dates(utc(2024, 1, 1), utc(2024, 12, 31));
    const d2025 = oneOff.dates(utc(2025, 1, 1), utc(2025, 12, 31));
    expect(d2024.length).toBe(1);
    expect(d2025.length).toBe(0);
  });

  test("startDate filter excludes earlier years", () => {
    const h = new Holiday("Juneteenth", {
      month: 6,
      day: 19,
      observance: nearestWorkday,
      startDate: utc(2021, 6, 19),
    });
    const d2020 = h.dates(utc(2020, 1, 1), utc(2020, 12, 31));
    const d2021 = h.dates(utc(2021, 1, 1), utc(2021, 12, 31));
    expect(d2020.length).toBe(0);
    expect(d2021.length).toBe(1);
  });
});

describe("Holiday.dates() — floating holiday (offset)", () => {
  test("MLK Day 2024 = Jan 15 (3rd Monday of January)", () => {
    const mlk = new Holiday("MLK Day", { month: 1, day: 1, offset: MO(3) });
    const dates = mlk.dates(utc(2024, 1, 1), utc(2024, 1, 31));
    expect(dates.length).toBe(1);
    expect(fmt(dates[0]!)).toBe("2024-01-15");
  });

  test("Thanksgiving 2024 = Nov 28 (4th Thursday of November)", () => {
    const tg = new Holiday("Thanksgiving", { month: 11, day: 1, offset: TH(4) });
    const dates = tg.dates(utc(2024, 11, 1), utc(2024, 11, 30));
    expect(dates.length).toBe(1);
    expect(fmt(dates[0]!)).toBe("2024-11-28");
  });

  test("Memorial Day 2024 = May 27 (last Monday of May)", () => {
    const mem = new Holiday("Memorial Day", { month: 5, day: 25, offset: MO(1) });
    const dates = mem.dates(utc(2024, 5, 1), utc(2024, 5, 31));
    expect(dates.length).toBe(1);
    expect(fmt(dates[0]!)).toBe("2024-05-27");
  });

  test("Labor Day 2024 = Sep 2 (1st Monday of September)", () => {
    const ld = new Holiday("Labor Day", { month: 9, day: 1, offset: MO(1) });
    const dates = ld.dates(utc(2024, 9, 1), utc(2024, 9, 30));
    expect(dates.length).toBe(1);
    expect(fmt(dates[0]!)).toBe("2024-09-02");
  });

  test("Columbus Day 2024 = Oct 14 (2nd Monday of October)", () => {
    const col = new Holiday("Columbus Day", { month: 10, day: 1, offset: MO(2) });
    const dates = col.dates(utc(2024, 10, 1), utc(2024, 10, 31));
    expect(dates.length).toBe(1);
    expect(fmt(dates[0]!)).toBe("2024-10-14");
  });
});

// ─── USFederalHolidayCalendar ─────────────────────────────────────────────────

describe("USFederalHolidayCalendar", () => {
  const cal = new USFederalHolidayCalendar();

  test("name is 'USFederalHolidayCalendar'", () => {
    expect(cal.name).toBe("USFederalHolidayCalendar");
  });

  test("has 11 rules", () => {
    expect(cal.rules.length).toBe(11);
  });

  // Verify each 2024 holiday's observed date
  const expected2024: [string, string][] = [
    ["New Year's Day", "2024-01-01"], // Monday
    ["Martin Luther King Jr. Day", "2024-01-15"], // 3rd Monday
    ["Presidents' Day", "2024-02-19"], // 3rd Monday
    ["Memorial Day", "2024-05-27"], // last Monday
    ["Juneteenth National Independence Day", "2024-06-19"], // Wednesday
    ["Independence Day", "2024-07-04"], // Thursday
    ["Labor Day", "2024-09-02"], // 1st Monday
    ["Columbus Day", "2024-10-14"], // 2nd Monday
    ["Veterans Day", "2024-11-11"], // Monday
    ["Thanksgiving Day", "2024-11-28"], // 4th Thursday
    ["Christmas Day", "2024-12-25"], // Wednesday
  ];

  for (const [name, date] of expected2024) {
    test(`2024 ${name} = ${date}`, () => {
      const idx = cal.holidays(utc(2024, 1, 1), utc(2024, 12, 31));
      const found = idx.values.some((d) => fmt(d) === date);
      expect(found).toBe(true);
    });
  }

  test("returns DatetimeIndex sorted ascending", () => {
    const idx = cal.holidays("2024-01-01", "2024-12-31");
    const vals = idx.values;
    for (let i = 1; i < vals.length; i++) {
      const prev = vals[i - 1];
      const curr = vals[i];
      if (prev != null && curr != null) {
        expect(prev.getTime()).toBeLessThan(curr.getTime());
      }
    }
  });

  test("accepts string dates", () => {
    const idx = cal.holidays("2024-01-01", "2024-12-31");
    expect(idx.size).toBeGreaterThan(0);
  });

  test("Juneteenth not present before 2021", () => {
    const idx = cal.holidays("2020-01-01", "2020-12-31");
    const juneteenth = idx.values.some((d) => d.getUTCMonth() === 5 && d.getUTCDate() === 19);
    expect(juneteenth).toBe(false);
  });

  test("Juneteenth present in 2024", () => {
    const idx = cal.holidays("2024-01-01", "2024-12-31");
    const juneteenth = idx.values.some((d) => fmt(d) === "2024-06-19");
    expect(juneteenth).toBe(true);
  });

  // Multi-year query
  test("multi-year range returns dates from all years", () => {
    const idx = cal.holidays("2022-01-01", "2024-12-31");
    const years = new Set(idx.values.map((d) => d.getUTCFullYear()));
    expect(years.has(2022)).toBe(true);
    expect(years.has(2023)).toBe(true);
    expect(years.has(2024)).toBe(true);
  });

  // New Year's Day 2022: Jan 1 = Saturday → observed Dec 31, 2021 (Friday)
  // So querying 2022 range should NOT include it (it falls in 2021)
  test("New Year's Day 2022: observed Dec 31 2021 not in 2022 range", () => {
    const idx = cal.holidays("2022-01-01", "2022-12-31");
    const ny = idx.values.some((d) => fmt(d) === "2021-12-31");
    expect(ny).toBe(false);
  });
});

// ─── Calendar Registry ────────────────────────────────────────────────────────

describe("get_calendar / register_calendar", () => {
  test("get_calendar returns USFederalHolidayCalendar by name", () => {
    const cal = get_calendar("USFederalHolidayCalendar");
    expect(cal).not.toBeNull();
    expect(cal?.name).toBe("USFederalHolidayCalendar");
  });

  test("get_calendar returns null for unknown name", () => {
    expect(get_calendar("__unknown_calendar__")).toBeNull();
  });

  test("register_calendar then get_calendar retrieves it", () => {
    class MinimalCalendar extends AbstractHolidayCalendar {
      readonly name = "TestHolidayCalendar_holiday_test";
      readonly rules: readonly Holiday[] = [new Holiday("Test Holiday", { month: 7, day: 4 })];
    }

    register_calendar("TestHolidayCalendar_holiday_test", () => new MinimalCalendar());
    const cal = get_calendar("TestHolidayCalendar_holiday_test");
    expect(cal).not.toBeNull();
    expect(cal?.name).toBe("TestHolidayCalendar_holiday_test");
  });
});

// ─── holidayNames ─────────────────────────────────────────────────────────────

describe("AbstractHolidayCalendar.holidayNames()", () => {
  test("returns map of name → Date for each holiday", () => {
    const cal = new USFederalHolidayCalendar();
    const names = cal.holidayNames("2024-01-01", "2024-12-31");
    expect(names.get("Labor Day")).toBeDefined();
    expect(fmt(names.get("Labor Day")!)).toBe("2024-09-02");
  });
});

// ─── Individual Rule Exports ──────────────────────────────────────────────────

describe("Individual holiday rule exports", () => {
  test("USNewYearsDay is a Holiday", () => {
    expect(USNewYearsDay).toBeInstanceOf(Holiday);
  });

  test("USThanksgivingDay is a Holiday", () => {
    expect(USThanksgivingDay).toBeInstanceOf(Holiday);
  });

  test("USJuneteenth has startDate set", () => {
    expect(USJuneteenth.startDate).not.toBeNull();
  });

  const allRules = [
    USNewYearsDay,
    USMartinLutherKingJrDay,
    USPresidentsDay,
    USMemorialDay,
    USJuneteenth,
    USIndependenceDay,
    USLaborDay,
    USColumbusDay,
    USVeteransDay,
    USThanksgivingDay,
    USChristmasDay,
  ];

  test("all 11 holiday constants are Holiday instances", () => {
    for (const rule of allRules) {
      expect(rule).toBeInstanceOf(Holiday);
    }
  });
});

// ─── Property-Based Tests ──────────────────────────────────────────────────────

describe("Property-based: nearestWorkday never returns Saturday or Sunday", () => {
  test("random dates", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2000, max: 2050 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 1, max: 28 }),
        (year, month, day) => {
          const d = utc(year, month, day);
          const result = nearestWorkday(d);
          const jsDay = result.getUTCDay(); // 0=Sun, 6=Sat
          return jsDay !== 0 && jsDay !== 6;
        },
      ),
    );
  });
});

describe("Property-based: nextMonday always returns a Monday", () => {
  test("random dates", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2000, max: 2050 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 1, max: 28 }),
        (year, month, day) => {
          const d = utc(year, month, day);
          const result = nextMonday(d);
          // Monday in JS = 1
          return result.getUTCDay() === 1;
        },
      ),
    );
  });
});

describe("Property-based: USFederalHolidayCalendar results sorted", () => {
  test("random date ranges", () => {
    const cal = new USFederalHolidayCalendar();
    fc.assert(
      fc.property(
        fc.integer({ min: 2000, max: 2040 }),
        fc.integer({ min: 1, max: 5 }),
        (startYear, span) => {
          const start = utc(startYear, 1, 1);
          const end = utc(startYear + span, 12, 31);
          const idx = cal.holidays(start, end);
          const vals = idx.values;
          for (let i = 1; i < vals.length; i++) {
            const a = vals[i - 1];
            const b = vals[i];
            if (a != null && b != null && a.getTime() > b.getTime()) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });
});
