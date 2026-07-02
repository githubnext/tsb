/**
 * Benchmark: seriesAdd / seriesSub / seriesMul / seriesDiv — element-wise arithmetic.
 * Outputs JSON: {"function": "add_sub_mul_div", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, seriesAdd, seriesSub, seriesMul, seriesDiv } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const data = Array.from({ length: SIZE }, (_, i) => i * 1.0);
const s = new Series({ data });
const s2 = new Series({ data: data.map((v) => v * 2) });

for (let i = 0; i < WARMUP; i++) {
  seriesAdd(s, 10);
  seriesSub(s, 5);
  seriesMul(s, 3);
  seriesDiv(s, 2);
  seriesAdd(s, s2);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  seriesAdd(s, 10);
  seriesSub(s, 5);
  seriesMul(s, 3);
  seriesDiv(s, 2);
  seriesAdd(s, s2);
  times.push(performance.now() - start);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "add_sub_mul_div",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
