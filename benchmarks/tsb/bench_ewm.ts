/**
 * Benchmark: EWM (Exponentially Weighted Moving) aggregations on 100k-element Series
 */
import { Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;
const data = Array.from({ length: ROWS }, (_, i) => Math.sin(i * 0.01) * 100 + 50);
const s = new Series({ data });

// Warm-up: ewm mean, std, var with span=20
for (let i = 0; i < WARMUP; i++) {
  s.ewm({ span: 20 }).mean();
  s.ewm({ span: 20 }).std();
  s.ewm({ span: 20 }).var();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.ewm({ span: 20 }).mean();
  s.ewm({ span: 20 }).std();
  s.ewm({ span: 20 }).var();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "ewm",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
