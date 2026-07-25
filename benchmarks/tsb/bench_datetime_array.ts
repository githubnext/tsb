/**
 * Benchmark: DatetimeArray — nullable datetime extension array operations.
 * N=100_000 elements with ~10% nulls. Tests from/year/month/day/isna/notna/fillna.
 */
import { arrays, Timestamp } from "../../src/index.js";

const N = 100_000;
const WARMUP = 3;
const ITERATIONS = 50;

const BASE_MS = new Date("2020-01-01").getTime();
const raw: (string | null)[] = Array.from({ length: N }, (_, i) => {
  if (i % 10 === 0) return null;
  const ms = BASE_MS + i * 86_400_000; // 1 day per element
  return new Date(ms).toISOString().slice(0, 10);
});

function run(): void {
  const a = arrays.DatetimeArray.from(raw);
  a.year;
  a.month;
  a.day;
  a.isna();
  a.notna();
  a.fillna(new Timestamp("2000-01-01"));
}

for (let i = 0; i < WARMUP; i++) run();

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) run();
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "datetime_array",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
