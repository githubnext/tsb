/**
 * Benchmark: idxminSeries / idxmaxSeries — index of min/max on a 100k-element Series.
 * Outputs JSON: {"function": "idxmin_idxmax", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, idxminSeries, idxmaxSeries } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const data = Float64Array.from({ length: SIZE }, (_, i) => Math.sin(i * 0.01) * 1000);
const s = new Series(data);

for (let i = 0; i < WARMUP; i++) {
  idxminSeries(s);
  idxmaxSeries(s);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  idxminSeries(s);
  idxmaxSeries(s);
}
const total = performance.now() - start;

console.log(JSON.stringify({ function: "idxmin_idxmax", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
