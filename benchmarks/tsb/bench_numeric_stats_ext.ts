/**
 * Benchmark: percentileOfScore, minMaxNormalize, coefficientOfVariation on 100k elements.
 * Outputs JSON: {"function": "numeric_stats_ext", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, percentileOfScore, minMaxNormalize, coefficientOfVariation } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 20;

const data = Array.from({ length: SIZE }, (_, i) => Math.sin(i * 0.001) * 100 + 50);
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  percentileOfScore(data, 50, "rank");
  minMaxNormalize(s);
  coefficientOfVariation(s);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  percentileOfScore(data, 50, "rank");
  minMaxNormalize(s);
  coefficientOfVariation(s);
  times.push(performance.now() - t0);
}

const total = times.reduce((a, b) => a + b, 0);
console.log(
  JSON.stringify({
    function: "numeric_stats_ext",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
