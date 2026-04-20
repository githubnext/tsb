/**
 * Benchmark: ffillSeries / bfillSeries — standalone forward/backward fill for Series.
 * Mirrors pandas Series.ffill() / Series.bfill().
 * Outputs JSON: {"function": "series_ffill_bfill_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, ffillSeries, bfillSeries } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const s = new Series({
  data: Array.from({ length: SIZE }, (_, i) => (i % 5 === 0 ? null : i * 1.0)),
});

for (let i = 0; i < WARMUP; i++) {
  ffillSeries(s);
  bfillSeries(s);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  ffillSeries(s);
  bfillSeries(s);
  times.push(performance.now() - t0);
}

const total = times.reduce((a, b) => a + b, 0);
console.log(
  JSON.stringify({
    function: "series_ffill_bfill_fn",
    mean_ms: round3(total / ITERATIONS),
    iterations: ITERATIONS,
    total_ms: round3(total),
  }),
);

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}
