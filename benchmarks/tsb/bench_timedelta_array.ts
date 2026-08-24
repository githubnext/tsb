/**
 * Benchmark: TimedeltaArray — create and operate on nullable timedelta arrays.
 * Outputs JSON: {"function": "timedelta_array", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { TimedeltaArray, Timedelta } from "../../src/index.js";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

// Build raw values: ~10% null
const values: (number | null)[] = Array.from({ length: SIZE }, (_, i) =>
  i % 10 === 0 ? null : i * 60_000,
);

const fillValue = Timedelta.fromMilliseconds(0);

function run(): void {
  const arr = TimedeltaArray.from(values);

  // Component access
  void arr.days;
  void arr.hours;
  void arr.totalSeconds;

  // Null checks
  void arr.isna();
  void arr.notna();

  // Aggregation
  void arr.sum();
  void arr.min();
  void arr.max();

  // Fill
  void arr.fillna(fillValue);
}

for (let i = 0; i < WARMUP; i++) run();

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) run();
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "timedelta_array",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
