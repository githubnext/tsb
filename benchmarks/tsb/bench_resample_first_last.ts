/**
 * Benchmark: resample_first_last — SeriesResampler.first() and .last() on hourly resampling.
 *
 * Mirrors pandas: pd.Series.resample("H").first() / .last()
 * first() returns the first non-null value per bin; last() returns the last.
 *
 * Outputs JSON: {"function": "resample_first_last", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, resampleSeries } from "../../src/index.ts";

const SIZE = 50_000;
const WARMUP = 3;
const ITERATIONS = 30;

const base = new Date("2020-01-01T00:00:00Z").getTime();
const idx = Array.from({ length: SIZE }, (_, i) => new Date(base + i * 60_000));
const data = Array.from({ length: SIZE }, (_, i) => (i % 100) * 2.5 + Math.cos(i * 0.01) * 10);

const s = new Series({ data, index: idx });

for (let i = 0; i < WARMUP; i++) {
  resampleSeries(s, "H").first();
  resampleSeries(s, "H").last();
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  resampleSeries(s, "H").first();
  resampleSeries(s, "H").last();
  times.push(performance.now() - t0);
}
const total = times.reduce((a, b) => a + b, 0);
console.log(
  JSON.stringify({
    function: "resample_first_last",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
