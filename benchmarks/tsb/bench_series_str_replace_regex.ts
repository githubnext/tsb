/**
 * Benchmark: Series.str.replace() with a regex pattern on 50k strings.
 * Outputs JSON: {"function": "series_str_replace_regex", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series } from "../../src/index.ts";

const ROWS = 50_000;
const WARMUP = 5;
const ITERATIONS = 30;

const data = Array.from({ length: ROWS }, (_, i) => `item_${i % 1000}_val${i % 50}`);
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  s.str.replace(/[0-9]+/, "#");
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  s.str.replace(/[0-9]+/, "#");
  times.push(performance.now() - t0);
}
const total = times.reduce((a, b) => a + b, 0);

console.log(
  JSON.stringify({
    function: "series_str_replace_regex",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
