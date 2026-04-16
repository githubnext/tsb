/**
 * Benchmark: Period / PeriodIndex — fixed-frequency time spans.
 * Outputs JSON: {"function": "period", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Period, PeriodIndex } from "../../src/index.ts";

const SIZE = 10_000;
const WARMUP = 5;
const ITERATIONS = 50;

const baseDate = new Date(Date.UTC(2020, 0, 1));
const periods = Array.from({ length: SIZE }, (_, i) => {
  const d = new Date(baseDate.getTime() + i * 86_400_000);
  return Period.fromDate(d, "D");
});

const startQ = Period.fromDate(new Date(Date.UTC(2000, 0, 1)), "Q");
const endQ = Period.fromDate(new Date(Date.UTC(2024, 11, 31)), "Q");

for (let i = 0; i < WARMUP; i++) {
  for (const p of periods.slice(0, 100)) {
    void p.toString();
    p.add(1);
  }
  PeriodIndex.fromRange(startQ, endQ);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  for (const p of periods) {
    void p.toString();
    p.add(1);
  }
  PeriodIndex.fromRange(startQ, endQ);
  times.push(performance.now() - start);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "period",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
