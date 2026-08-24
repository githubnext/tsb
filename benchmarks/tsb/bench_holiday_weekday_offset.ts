/**
 * Benchmark: Holiday with weekday offsets — MO, TH, FR constructors.
 *
 * Creates a custom calendar with floating holidays that use weekday offsets
 * (e.g. "3rd Monday of January", "4th Thursday of November", "last Monday of May").
 * Benchmarks holiday generation across a 10-year range.
 *
 * Mirrors pandas.tseries.holiday.Holiday with offset parameter.
 *
 * Outputs JSON: {"function": "holiday_weekday_offset", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import {
  AbstractHolidayCalendar,
  Holiday,
  MO,
  TH,
  FR,
  nearestWorkday,
} from "../../src/index.js";

const WARMUP = 5;
const ITERATIONS = 30;

const startDate = new Date("2010-01-01");
const endDate = new Date("2019-12-31");

// Custom calendar using weekday offset rules (MO, TH, FR)
class WeekdayOffsetCalendar extends AbstractHolidayCalendar {
  readonly name = "WeekdayOffsetBench";
  readonly rules: readonly Holiday[] = [
    // 3rd Monday of January (like MLK Day)
    new Holiday("Third Monday Jan", { month: 1, day: 1, offset: MO(3) }),
    // 3rd Monday of February (like Presidents Day)
    new Holiday("Third Monday Feb", { month: 2, day: 1, offset: MO(3) }),
    // Last Monday of May (like Memorial Day)
    new Holiday("Last Monday May", { month: 5, day: 31, offset: MO(-1) }),
    // 1st Monday of September (like Labor Day)
    new Holiday("First Monday Sep", { month: 9, day: 1, offset: MO(1) }),
    // 2nd Monday of October (like Columbus Day)
    new Holiday("Second Monday Oct", { month: 10, day: 1, offset: MO(2) }),
    // 4th Thursday of November (like Thanksgiving)
    new Holiday("Fourth Thursday Nov", { month: 11, day: 1, offset: TH(4) }),
    // Last Friday of October (a fictional holiday for benchmarking)
    new Holiday("Last Friday Oct", { month: 10, day: 31, offset: FR(-1) }),
    // Fixed holiday with observance
    new Holiday("Christmas", { month: 12, day: 25, observance: nearestWorkday }),
  ];
}

// Warm up
for (let i = 0; i < WARMUP; i++) {
  const cal = new WeekdayOffsetCalendar();
  cal.holidays(startDate, endDate);
}

// Measure
const t0 = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  const cal = new WeekdayOffsetCalendar();
  cal.holidays(startDate, endDate);
}
const total_ms = performance.now() - t0;

console.log(
  JSON.stringify({
    function: "holiday_weekday_offset",
    mean_ms: total_ms / ITERATIONS,
    iterations: ITERATIONS,
    total_ms,
  }),
);
