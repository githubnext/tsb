/**
 * Benchmark: resample_label_closed — SeriesResampler with explicit label options.
 *
 * Mirrors pandas: pd.Series.resample("H", label="right").sum() and
 *                 pd.Series.resample("H", label="left").mean()
 *
 * Uses a 50k-row minute-resolution dataset.  Benchmarks the non-default label
 * path where keyToLabel must convert group keys (e.g. label="right" on an
 * hourly series whose default label is "left").
 *
 * Outputs JSON: {"function": "resample_label_closed", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, resampleSeries } from "../../src/index.ts";

const SIZE = 50_000;
const WARMUP = 3;
const ITERATIONS = 30;

const base = new Date("2020-01-01T00:00:00Z").getTime();
const idx = Array.from({ length: SIZE }, (_, i) => new Date(base + i * 60_000));
const data = Array.from({ length: SIZE }, (_, i) => (i % 200) * 0.5 + Math.sin(i * 0.02) * 20);

const s = new Series({ data, index: idx });

// Warm up
for (let i = 0; i < WARMUP; i++) {
  resampleSeries(s, "H", { label: "right" }).sum();
  resampleSeries(s, "H", { label: "left" }).mean();
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  resampleSeries(s, "H", { label: "right" }).sum();
  resampleSeries(s, "H", { label: "left" }).mean();
  times.push(performance.now() - t0);
}
const total = times.reduce((a, b) => a + b, 0);
console.log(
  JSON.stringify({
    function: "resample_label_closed",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
