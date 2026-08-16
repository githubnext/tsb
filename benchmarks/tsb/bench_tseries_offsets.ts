/**
 * Benchmark: tseries offsets — QuarterEnd, QuarterBegin, BMonthEnd, BMonthBegin, BYearEnd, BYearBegin.
 * Tests apply / rollforward / rollback on 5,000 dates.
 * Outputs JSON: {"function": "tseries_offsets", "mean_ms": ..., "iterations": ..., "total_ms": ...}
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

function run(): void {
  for (const d of dates) {
    qEnd.apply(d);
    qEnd.rollforward(d);
    qEnd.rollback(d);
    qBegin.apply(d);
    bmEnd.apply(d);
    bmBegin.apply(d);
    byEnd.apply(d);
    byBegin.apply(d);
  }
}

for (let i = 0; i < WARMUP; i++) run();

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) run();
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "tseries_offsets",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
