/**
 * Benchmark: melt — unpivot a 10k-row DataFrame with 4 value columns
 */
import { DataFrame, melt } from "../../src/index.js";

const ROWS = 10_000;
const WARMUP = 3;
const ITERATIONS = 10;

const id = Array.from({ length: ROWS }, (_, i) => i);
const a = Float64Array.from({ length: ROWS }, (_, i) => i * 1.1);
const b = Float64Array.from({ length: ROWS }, (_, i) => i * 2.2);
const c = Float64Array.from({ length: ROWS }, (_, i) => i * 3.3);
const df = new DataFrame({ id, a, b, c });

for (let i = 0; i < WARMUP; i++) {
  melt(df, { idVars: ["id"], valueVars: ["a", "b", "c"] });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  melt(df, { idVars: ["id"], valueVars: ["a", "b", "c"] });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "melt",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
