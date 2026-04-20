/**
 * Benchmark: unstack standalone — pivot innermost MultiIndex level to columns using exported unstack().
 * Uses the standalone unstack(series) function (not the .unstack() method).
 * Outputs JSON: {"function": "unstack_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, unstack } from "../../src/index.ts";

const ROWS = 500;
const COLS = 10;
const WARMUP = 5;
const ITERATIONS = 50;

const data = Array.from({ length: ROWS * COLS }, (_, i) => i * 1.0);
const index = Array.from(
  { length: ROWS * COLS },
  (_, i) => [Math.floor(i / COLS), i % COLS] as [number, number],
);
const s = new Series({ data, index });

for (let i = 0; i < WARMUP; i++) {
  unstack(s);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  unstack(s);
  times.push(performance.now() - start);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / times.length;

console.log(
  JSON.stringify({
    function: "unstack_fn",
    mean_ms: meanMs,
    iterations: ITERATIONS,
    total_ms: totalMs,
  }),
);
