/**
 * Benchmark: varSeries / semSeries — variance and standard error of mean on a 100k-element Series.
 * Outputs JSON: {"function": "sem_var", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, varSeries, semSeries } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const data = Float64Array.from({ length: SIZE }, (_, i) => Math.sin(i * 0.01) * 100);
const s = new Series(data);

for (let i = 0; i < WARMUP; i++) {
  varSeries(s);
  semSeries(s);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  varSeries(s);
  semSeries(s);
}
const total = performance.now() - start;

console.log(JSON.stringify({ function: "sem_var", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
