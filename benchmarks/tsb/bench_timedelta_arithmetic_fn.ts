/**
 * Benchmark: Timedelta arithmetic — add / subtract / abs / scale / comparisons.
 * Tests Timedelta construction via new Timedelta(ms) and its methods.
 * Outputs JSON: {"function": "timedelta_arithmetic_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Timedelta } from "../../src/index.ts";

const WARMUP = 5;
const ITERATIONS = 100;

const SIZE = 1_000;
const td1 = new Timedelta(5_400_000); // 1.5 hours
const td2 = new Timedelta(1_800_000); // 30 minutes

const deltas = Array.from({ length: SIZE }, (_, i) =>
  new Timedelta((i - SIZE / 2) * 60_000),
);

for (let w = 0; w < WARMUP; w++) {
  for (const td of deltas.slice(0, 50)) {
    td.add(td1);
    td.subtract(td2);
    td.abs();
    td.scale(2);
    td.lt(td1);
    td.gt(td2);
  }
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  for (const td of deltas) {
    td.add(td1);
    td.subtract(td2);
    td.abs();
    td.scale(2);
    td.lt(td1);
    td.gt(td2);
  }
  times.push(performance.now() - t0);
}

const total = times.reduce((a, b) => a + b, 0);
console.log(
  JSON.stringify({
    function: "timedelta_arithmetic_fn",
    mean_ms: round3(total / ITERATIONS),
    iterations: ITERATIONS,
    total_ms: round3(total),
  }),
);

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}
