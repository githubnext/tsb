/**
 * Benchmark: SeriesGroupBy getGroup — retrieve a specific group by key.
 * Outputs JSON: {"function": "series_groupby_getgroup_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, SeriesGroupBy } from "../../src/index.ts";

const ROWS = 100_000;
const N_GROUPS = 50;
const WARMUP = 5;
const ITERATIONS = 100;

const keys = Array.from({ length: ROWS }, (_, i) => `group_${i % N_GROUPS}`);
const values = Array.from({ length: ROWS }, (_, i) => i * 1.5);
const ser = new Series(values);
const sgb = new SeriesGroupBy(ser, keys);

const groupKeys = Array.from({ length: N_GROUPS }, (_, i) => `group_${i}`);

for (let i = 0; i < WARMUP; i++) {
  for (const k of groupKeys) {
    sgb.getGroup(k);
  }
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  for (const k of groupKeys) {
    sgb.getGroup(k);
  }
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "series_groupby_getgroup_fn",
    mean_ms: Math.round((total / ITERATIONS) * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(total * 1000) / 1000,
  }),
);
