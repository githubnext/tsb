/**
 * Benchmark: TimedeltaArray arithmetic — add, sub, mul on 100k-element nullable
 * timedelta arrays, plus extended component accessors (minutes, milliseconds,
 * totalMilliseconds, totalHours, totalDays).
 *
 * Mirrors pandas TimedeltaArray arithmetic and component getters.
 * Outputs JSON: {"function": "timedelta_array_arithmetic", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Timedelta, TimedeltaArray } from "../../src/index.js";

const N = 100_000;
const WARMUP = 3;
const ITERATIONS = 20;

// Build two arrays with ~10% nulls; values in milliseconds
const raw1: (number | null)[] = Array.from({ length: N }, (_, i) =>
  i % 10 === 0 ? null : i * 60_000, // ~1 min per element
);
const raw2: (number | null)[] = Array.from({ length: N }, (_, i) =>
  i % 7 === 0 ? null : (N - i) * 1_000, // ~1 sec per element
);

const scalar = Timedelta.fromMilliseconds(5_000); // 5 seconds

function run(): void {
  const a = TimedeltaArray.from(raw1);
  const b = TimedeltaArray.from(raw2);

  // Extended component accessors (not covered by bench_timedelta_array)
  void a.minutes;
  void a.milliseconds;
  void a.totalMilliseconds;
  void a.totalHours;
  void a.totalDays;

  // Arithmetic with another array
  void a.add(b);
  void a.sub(b);

  // Arithmetic with a scalar
  void a.add(scalar);
  void a.sub(scalar);
  void a.mul(2.5);
}

for (let i = 0; i < WARMUP; i++) run();

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) run();
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "timedelta_array_arithmetic",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
