/**
 * Benchmark: window_extended — rollingSem / rollingSkew / rollingKurt / rollingQuantile on 100k rows.
 * Outputs JSON: {"function": "window_extended", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, rollingSem, rollingSkew, rollingKurt, rollingQuantile } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 3;
const ITERATIONS = 20;
const WINDOW = 10;

const s = new Series({ data: Array.from({ length: SIZE }, (_, i) => Math.sin(i / 100) * 100 + i * 0.001) });

for (let i = 0; i < WARMUP; i++) {
  rollingSem(s, WINDOW);
  rollingSkew(s, WINDOW);
  rollingKurt(s, WINDOW);
  rollingQuantile(s, WINDOW, 0.5);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  rollingSem(s, WINDOW);
  rollingSkew(s, WINDOW);
  rollingKurt(s, WINDOW);
  rollingQuantile(s, WINDOW, 0.5);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "window_extended",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
