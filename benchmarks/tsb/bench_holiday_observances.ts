/**
 * Benchmark: Holiday observance functions (nearestWorkday, nextMonday, previousFriday, etc.)
 *
 * Mirrors pandas.tseries.holiday observance helpers:
 * nearest_workday, next_monday, previous_friday, sunday_to_monday, etc.
 */
import {
  nearestWorkday,
  nextMonday,
  nextMondayOrTuesday,
  previousFriday,
  previousWorkday,
  sundayToMonday,
} from "../../src/index.js";

const N = 1_000;
const WARMUP = 5;
const ITERS = 50;

// Create N dates spread across multiple years
const BASE = new Date("2000-01-01").getTime();
const MS_PER_DAY = 86_400_000;
const dates: Date[] = Array.from({ length: N }, (_, i) => new Date(BASE + i * MS_PER_DAY));

let t0 = performance.now();
for (let i = 0; i < WARMUP; i++) {
  for (const d of dates) {
    nearestWorkday(d);
    nextMonday(d);
    nextMondayOrTuesday(d);
    previousFriday(d);
    previousWorkday(d);
    sundayToMonday(d);
  }
}
t0 = performance.now();

for (let i = 0; i < ITERS; i++) {
  for (const d of dates) {
    nearestWorkday(d);
    nextMonday(d);
    nextMondayOrTuesday(d);
    previousFriday(d);
    previousWorkday(d);
    sundayToMonday(d);
  }
}
const total_ms = performance.now() - t0;

console.log(
  JSON.stringify({
    function: "holiday_observances",
    mean_ms: total_ms / ITERS,
    iterations: ITERS,
    total_ms,
  }),
);
