/**
 * Benchmark: DateOffset — MonthEnd, BusinessDay, YearBegin apply.
 * Outputs JSON: {"function": "date_offset", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { MonthEnd, BusinessDay, YearBegin, Day } from "../../src/index.ts";

const SIZE = 10_000;
const WARMUP = 5;
const ITERATIONS = 50;

const monthEnd = new MonthEnd(1);
const bizDay = new BusinessDay(5);
const yearBegin = new YearBegin(1);
const dayOffset = new Day(30);
const base = new Date(Date.UTC(2020, 0, 15));
const dates = Array.from({ length: SIZE }, (_, i) => new Date(base.getTime() + i * 86_400_000));

for (let i = 0; i < WARMUP; i++) {
  for (const d of dates) {
    monthEnd.apply(d);
    bizDay.apply(d);
    yearBegin.apply(d);
    dayOffset.apply(d);
  }
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  for (const d of dates) {
    monthEnd.apply(d);
    bizDay.apply(d);
    yearBegin.apply(d);
    dayOffset.apply(d);
  }
  times.push(performance.now() - start);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "date_offset",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
