/**
 * Benchmark: USFederalHolidayCalendar — the built-in US federal holiday
 * calendar (11 rules, several with nth-weekday-of-month and observance
 * adjustment logic) applied over a 50-year date range.
 *
 * Outputs JSON: {"function": "us_federal_holiday_calendar", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { USFederalHolidayCalendar } from "../../src/index.ts";

const WARMUP = 5;
const ITERATIONS = 50;

const startDate = new Date("1980-01-01");
const endDate = new Date("2029-12-31");

for (let i = 0; i < WARMUP; i++) {
  const cal = new USFederalHolidayCalendar();
  cal.holidays(startDate, endDate);
}

const t0 = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  const cal = new USFederalHolidayCalendar();
  cal.holidays(startDate, endDate);
}
const total = performance.now() - t0;

console.log(
  JSON.stringify({
    function: "us_federal_holiday_calendar",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
