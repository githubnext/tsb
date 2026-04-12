/**
 * Benchmark: DataFrame.melt — unpivots wide-format DataFrame to long-format.
 * Outputs JSON: {"function": "melt", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame } from "../../src/index.ts";

const SIZE = 10_000;
const WARMUP = 5;
const ITERATIONS = 50;

const cols: Record<string, number[]> = {};
for (let i = 1; i <= 5; i++) {
  cols[`col${i}`] = Array.from({ length: SIZE }, (_, j) => j * i + 0.5);
}
const df = new DataFrame(cols);

for (let i = 0; i < WARMUP; i++) {
  df.melt({ idVars: ["col1"], valueVars: ["col2", "col3", "col4", "col5"] });
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  df.melt({ idVars: ["col1"], valueVars: ["col2", "col3", "col4", "col5"] });
  times.push(performance.now() - start);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "melt",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
