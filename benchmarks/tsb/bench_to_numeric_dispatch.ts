/**
 * Benchmark: toNumeric generic dispatcher — exported toNumeric(value) dispatches to Series/array/scalar paths.
 * Mirrors pandas pd.to_numeric() with multiple input types.
 * Outputs JSON: {"function": "to_numeric_dispatch", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, toNumeric } from "../../src/index.ts";

const SIZE = 50_000;
const WARMUP = 5;
const ITERATIONS = 30;

const strNums = Array.from({ length: SIZE }, (_, i) => String(i * 1.5));
const s = new Series({ data: strNums });

for (let i = 0; i < WARMUP; i++) {
  toNumeric(strNums, { errors: "coerce" });
  toNumeric(s, { errors: "coerce" });
  toNumeric("42.7");
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  toNumeric(strNums, { errors: "coerce" });
  toNumeric(s, { errors: "coerce" });
  toNumeric("42.7");
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "to_numeric_dispatch",
    mean_ms: Math.round((total / ITERATIONS) * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(total * 1000) / 1000,
  }),
);
