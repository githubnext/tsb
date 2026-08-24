/**
 * Benchmark: AbstractHolidayCalendar — custom calendar definition, holiday
 * generation, and calendar registry (get_calendar / register_calendar).
 *
 * Creates a small custom calendar with 5 fixed-date rules and measures how
 * long it takes to compute the observed holiday dates for a 20-year range.
 * Also benchmarks the registry lookup overhead.
 *
 * Outputs JSON: {"function": "holiday_calendar", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import {
  AbstractHolidayCalendar,
  Holiday,
  register_calendar,
  get_calendar,
} from "../../src/index.js";

const WARMUP = 5;
const ITERATIONS = 50;

// ── Custom calendar with 5 fixed-date holidays ────────────────────────────────

class CustomCalendar extends AbstractHolidayCalendar {
  readonly name = "BenchCustomCalendar";
  readonly rules: readonly Holiday[] = [
    new Holiday("New Year's Day", { month: 1, day: 1 }),
    new Holiday("Valentine's Day", { month: 2, day: 14 }),
    new Holiday("May Day", { month: 5, day: 1 }),
    new Holiday("Midsummer", { month: 6, day: 24 }),
    new Holiday("Christmas Day", { month: 12, day: 25 }),
  ];
}

register_calendar("BenchCustomCalendar", () => new CustomCalendar());

const startDate = new Date("2000-01-01");
const endDate = new Date("2019-12-31");

// Warm up
for (let i = 0; i < WARMUP; i++) {
  const cal = new CustomCalendar();
  cal.holidays(startDate, endDate);
  get_calendar("BenchCustomCalendar");
}

const t0 = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  const cal = new CustomCalendar();
  cal.holidays(startDate, endDate);
  get_calendar("BenchCustomCalendar");
}
const total = performance.now() - t0;

console.log(
  JSON.stringify({
    function: "holiday_calendar",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
