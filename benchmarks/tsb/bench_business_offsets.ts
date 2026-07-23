/**
 * Benchmark: Business and Quarter date offsets — QuarterEnd, QuarterBegin,
 * BMonthEnd, BMonthBegin, BYearEnd, BYearBegin.
 * Mirrors pandas.tseries.offsets quarter/business-month/business-year classes.
 * Dataset: 5,000 dates; 50 measured iterations.
 * Outputs JSON: {"function": "business_offsets", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import {
  QuarterEnd,
  QuarterBegin,
  BMonthEnd,
  BMonthBegin,
  BYearEnd,
  BYearBegin,
} from "../../src/index.ts";

const SIZE = 5_000;
const WARMUP = 5;
const ITERATIONS = 50;

const qEnd = new QuarterEnd(1);
const qBegin = new QuarterBegin(1);
const bmEnd = new BMonthEnd(1);
const bmBegin = new BMonthBegin(1);
const byEnd = new BYearEnd(1);
const byBegin = new BYearBegin(1);

const base = new Date(Date.UTC(2020, 0, 15));
const dates = Array.from({ length: SIZE }, (_, i) => new Date(base.getTime() + i * 86_400_000));

for (let i = 0; i < WARMUP; i++) {
  for (const d of dates.slice(0, 100)) {
    qEnd.apply(d);
    qBegin.apply(d);
    bmEnd.apply(d);
    bmBegin.apply(d);
    byEnd.apply(d);
    byBegin.apply(d);
  }
}

const t0 = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  for (const d of dates) {
    qEnd.apply(d);
    qBegin.apply(d);
    bmEnd.apply(d);
    bmBegin.apply(d);
    byEnd.apply(d);
    byBegin.apply(d);
  }
}
const total_ms = performance.now() - t0;
const mean_ms = total_ms / ITERATIONS;

console.log(JSON.stringify({ function: "business_offsets", mean_ms, iterations: ITERATIONS, total_ms }));
