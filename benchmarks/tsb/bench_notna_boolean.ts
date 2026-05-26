/**
 * Benchmark: notna_boolean — keepTrue / keepFalse / filterBy on 100k rows.
 * Outputs JSON: {"function": "notna_boolean", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, DataFrame, keepTrue, keepFalse, filterBy } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const s = new Series({ data: Array.from({ length: SIZE }, (_, i) => i) });
const mask = new Series({ data: Array.from({ length: SIZE }, (_, i) => i % 2 === 0) });
const boolArr = Array.from({ length: SIZE }, (_, i) => i % 3 !== 0);

const df = DataFrame.fromColumns({
  a: Array.from({ length: SIZE }, (_, i) => i),
  b: Array.from({ length: SIZE }, (_, i) => i * 2),
});

for (let i = 0; i < WARMUP; i++) {
  keepTrue(s, mask);
  keepFalse(s, mask);
  filterBy(df, boolArr);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  keepTrue(s, mask);
  keepFalse(s, mask);
  filterBy(df, boolArr);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "notna_boolean",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
