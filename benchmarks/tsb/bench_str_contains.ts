/**
 * Benchmark: str.contains() — regex and literal substring matching on 100k strings.
 * Outputs JSON: {"function": "str_contains", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series } from "../../src/index.ts";

const ROWS = 100_000;
const WARMUP = 5;
const ITERATIONS = 30;

const data = Array.from({ length: ROWS }, (_, i) => `item_${i % 500}_value_${i % 7}_end`);
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  s.str.contains("value", false);
  s.str.contains("_[0-9]+_", true);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  s.str.contains("value", false);
  s.str.contains("_[0-9]+_", true);
  times.push(performance.now() - t0);
}

const total_ms = times.reduce((a, b) => a + b, 0);
console.log(
  JSON.stringify({
    function: "str_contains",
    mean_ms: Math.round((total_ms / ITERATIONS) * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(total_ms * 1000) / 1000,
  }),
);
