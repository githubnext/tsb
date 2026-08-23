/**
 * Benchmark: toOffset / inferFreq — frequency string → DateOffset conversion and
 * inference of a regular date series frequency.
 *
 * toOffset mirrors pandas.tseries.frequencies.to_offset().
 * inferFreq mirrors pandas.tseries.frequencies.infer_freq().
 *
 * Outputs JSON: {"function": "to_offset_infer_freq", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { toOffset, inferFreq } from "../../src/index.js";

const WARMUP = 20;
const ITERATIONS = 10_000;

// A representative set of frequency alias strings
const ALIASES = ["D", "B", "h", "min", "s", "ME", "MS", "QE", "QS", "YE", "YS", "W-MON", "2D", "3B", "-1ME"];

// Build a 365-element daily date series for inferFreq
const dailyDates: Date[] = [];
const base = new Date("2020-01-01").getTime();
for (let i = 0; i < 365; i++) {
  dailyDates.push(new Date(base + i * 86_400_000));
}

// Build a 12-element month-end date series
const monthEndDates: Date[] = [
  new Date("2023-01-31"),
  new Date("2023-02-28"),
  new Date("2023-03-31"),
  new Date("2023-04-30"),
  new Date("2023-05-31"),
  new Date("2023-06-30"),
  new Date("2023-07-31"),
  new Date("2023-08-31"),
  new Date("2023-09-30"),
  new Date("2023-10-31"),
  new Date("2023-11-30"),
  new Date("2023-12-31"),
];

// Warm-up
for (let i = 0; i < WARMUP; i++) {
  for (const alias of ALIASES) {
    toOffset(alias);
  }
  inferFreq(dailyDates);
  inferFreq(monthEndDates);
}

// Measure
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  for (const alias of ALIASES) {
    toOffset(alias);
  }
  inferFreq(dailyDates);
  inferFreq(monthEndDates);
}
const total_ms = performance.now() - start;
const mean_ms = total_ms / ITERATIONS;

console.log(
  JSON.stringify({
    function: "to_offset_infer_freq",
    mean_ms: parseFloat(mean_ms.toFixed(6)),
    iterations: ITERATIONS,
    total_ms: parseFloat(total_ms.toFixed(4)),
  }),
);
