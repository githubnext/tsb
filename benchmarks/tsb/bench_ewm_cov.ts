/**
 * Benchmark: EWM.cov between two 100k-element Series
 */
import { Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data1 = Array.from({ length: ROWS }, (_, i) => Math.sin(i * 0.05));
const data2 = Array.from({ length: ROWS }, (_, i) => Math.cos(i * 0.05));
const s1 = new Series({ data: data1 });
const s2 = new Series({ data: data2 });

for (let i = 0; i < WARMUP; i++) {
  s1.ewm({ span: 20 }).cov(s2);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s1.ewm({ span: 20 }).cov(s2);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "ewm_cov",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
