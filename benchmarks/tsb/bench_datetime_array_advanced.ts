/**
 * Benchmark: DatetimeArray advanced accessors — hour, minute, second, millisecond,
 * dayofweek, dayofyear, quarter, min, max on N=100_000 elements with ~10% nulls.
 */
import { arrays, Timestamp } from "../../src/index.js";

const N = 100_000;
const WARMUP = 3;
const ITERATIONS = 50;

const BASE_MS = new Date("2020-01-01T12:30:45.123Z").getTime();
const raw: (string | null)[] = Array.from({ length: N }, (_, i) => {
  if (i % 10 === 0) return null;
  const ms = BASE_MS + i * 60_000; // 1 minute per element
  return new Date(ms).toISOString();
});

function run(): void {
  const a = arrays.DatetimeArray.from(raw);
  a.hour;
  a.minute;
  a.second;
  a.millisecond;
  a.dayofweek;
  a.dayofyear;
  a.quarter;
  a.min();
  a.max();
}

for (let i = 0; i < WARMUP; i++) run();

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) run();
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "datetime_array_advanced",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
