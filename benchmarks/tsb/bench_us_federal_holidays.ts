/**
 * Benchmark: USFederalHolidayCalendar.holidays() over a 10-year range
 */
import { USFederalHolidayCalendar } from "../../src/index.js";

const WARMUP = 5;
const ITERATIONS = 20;

const start_date = new Date("2000-01-01");
const end_date = new Date("2009-12-31");

for (let i = 0; i < WARMUP; i++) {
  const cal = new USFederalHolidayCalendar();
  cal.holidays(start_date, end_date);
}

const t0 = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  const cal = new USFederalHolidayCalendar();
  cal.holidays(start_date, end_date);
}
const total = performance.now() - t0;

console.log(
  JSON.stringify({
    function: "us_federal_holidays",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
