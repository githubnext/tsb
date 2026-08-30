/**
 * Benchmark: DatetimeIndex — min(), max(), at(), toArray(), toTimestamps() on a 10k-element DatetimeIndex.
 *
 * Mirrors pandas:
 *   - `DatetimeIndex.min()`           → pandas `idx.min()`
 *   - `DatetimeIndex.max()`           → pandas `idx.max()`
 *   - `DatetimeIndex.at(i)`           → pandas `idx[i]`
 *   - `DatetimeIndex.toArray()`       → pandas `idx.to_pydatetime()`
 *   - `DatetimeIndex.toTimestamps()`  → pandas `idx.asi8` (millisecond epoch integers)
 *
 * Outputs JSON: {"function": "datetime_index_min_max", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { date_range } from "../../src/index.js";

const SIZE = 10_000;
const WARMUP = 5;
const ITERATIONS = 50;

const idx = date_range({ start: "2000-01-01", periods: SIZE, freq: "h" });
const mid = Math.floor(SIZE / 2);

for (let i = 0; i < WARMUP; i++) {
  idx.min();
  idx.max();
  idx.at(mid);
  idx.toArray();
  idx.toTimestamps();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  idx.min();
  idx.max();
  idx.at(mid);
  idx.toArray();
  idx.toTimestamps();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "datetime_index_min_max",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
