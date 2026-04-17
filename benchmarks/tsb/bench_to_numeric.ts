/**
 * Benchmark: toNumericArray / toNumericSeries — coerce values to numeric.
 * Outputs JSON: {"function": "to_numeric", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { toNumericArray, toNumericSeries, Series } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const strNums = Array.from({ length: SIZE }, (_, i) => String(i * 1.5));
const s = new Series({ data: strNums });

for (let i = 0; i < WARMUP; i++) {
  toNumericArray(strNums, { errors: "coerce" });
  toNumericSeries(s, { errors: "coerce" });
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  toNumericArray(strNums, { errors: "coerce" });
  toNumericSeries(s, { errors: "coerce" });
  times.push(performance.now() - start);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "to_numeric",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
