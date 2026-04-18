/**
 * Benchmark: toNumeric (generic dispatcher) — coerce scalars, arrays, and Series.
 * Outputs JSON: {"function": "to_numeric_generic", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { toNumeric, Series } from "../../src/index.ts";

const SIZE = 10_000;
const WARMUP = 5;
const ITERATIONS = 50;

const strNums = Array.from({ length: SIZE }, (_, i) => String(i * 0.1));
const series = new Series({ data: strNums });

for (let i = 0; i < WARMUP; i++) {
  toNumeric("3.14");
  toNumeric(strNums.slice(0, 100), { errors: "coerce" });
  toNumeric(series, { errors: "coerce" });
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  toNumeric("3.14");
  toNumeric(strNums, { errors: "coerce" });
  toNumeric(series, { errors: "coerce" });
  times.push(performance.now() - start);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "to_numeric_generic",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
