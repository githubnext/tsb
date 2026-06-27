/**
 * Benchmark: resample_ohlc — SeriesResampler.ohlc() — OHLC aggregation on daily resampling.
 *
 * Mirrors pandas: pd.Series.resample("D").ohlc()
 * ohlc() returns a DataFrame with open/high/low/close columns, one row per time bin.
 *
 * Outputs JSON: {"function": "resample_ohlc", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, resampleSeries } from "../../src/index.ts";

const SIZE = 50_000;
const WARMUP = 3;
const ITERATIONS = 30;

const base = new Date("2020-01-01T00:00:00Z").getTime();
const idx = Array.from({ length: SIZE }, (_, i) => new Date(base + i * 60_000));
const data = Array.from({ length: SIZE }, (_, i) => Math.sin(i * 0.03) * 100 + 200);

const s = new Series({ data, index: idx });

for (let i = 0; i < WARMUP; i++) {
  resampleSeries(s, "H").ohlc();
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  resampleSeries(s, "H").ohlc();
  times.push(performance.now() - t0);
}
const total = times.reduce((a, b) => a + b, 0);
console.log(
  JSON.stringify({
    function: "resample_ohlc",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
