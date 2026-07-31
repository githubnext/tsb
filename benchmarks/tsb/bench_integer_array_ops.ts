/**
 * Benchmark: IntegerArray arithmetic extensions — sub, floordiv, mod, pow, astype, count.
 *
 * Covers IntegerArray operations not in bench_integer_array:
 *   - sub(scalar)      → pandas IntegerArray subtraction
 *   - floordiv(scalar) → pandas IntegerArray floor division
 *   - mod(scalar)      → pandas IntegerArray modulo
 *   - pow(scalar)      → pandas IntegerArray power
 *   - astype(dtype)    → pandas IntegerArray.astype("Int64")
 *   - count()          → pandas IntegerArray count (non-null elements)
 *
 * Dataset: 100,000 Int32 elements with ~10% nulls (same as bench_integer_array).
 * Outputs JSON: {"function": "integer_array_ops", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { arrays } from "../../src/index.js";

const N = 100_000;
const WARMUP = 3;
const ITERATIONS = 20;

const raw: (number | null)[] = Array.from({ length: N }, (_, i) =>
  i % 10 === 0 ? null : (i % 1000) - 500,
);

const a = arrays.IntegerArray.from(raw, "Int32");

function run(): void {
  a.sub(10);
  a.floordiv(7);
  a.mod(13);
  a.pow(2);
  a.astype("Int64");
  a.count();
}

for (let i = 0; i < WARMUP; i++) run();

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) run();
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "integer_array_ops",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
