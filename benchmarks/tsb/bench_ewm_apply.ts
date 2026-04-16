/**
 * Benchmark: EWM.apply with custom function on 100k-element Series
 */
import { Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Array.from({ length: ROWS }, (_, i) => Math.sin(i * 0.05));
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  s.ewm({ span: 20 }).apply((vals, weights) => {
    let sum = 0;
    let wsum = 0;
    for (let j = 0; j < vals.length; j++) {
      sum += (vals[j] as number) * (weights[j] as number);
      wsum += weights[j] as number;
    }
    return wsum === 0 ? 0 : sum / wsum;
  });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.ewm({ span: 20 }).apply((vals, weights) => {
    let sum = 0;
    let wsum = 0;
    for (let j = 0; j < vals.length; j++) {
      sum += (vals[j] as number) * (weights[j] as number);
      wsum += weights[j] as number;
    }
    return wsum === 0 ? 0 : sum / wsum;
  });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "ewm_apply",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
