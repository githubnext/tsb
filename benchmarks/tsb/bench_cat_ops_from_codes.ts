/**
 * Benchmark: catFromCodes, catSortByFreq, catToOrdinal on 100k elements.
 * Outputs JSON: {"function": "cat_ops_from_codes", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { catFromCodes, catSortByFreq, catToOrdinal } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 20;

const categories = ["alpha", "beta", "gamma", "delta", "epsilon"];
const codes = Array.from({ length: SIZE }, (_, i) => i % categories.length);
const order = ["epsilon", "delta", "gamma", "beta", "alpha"];

for (let i = 0; i < WARMUP; i++) {
  const cs = catFromCodes(codes, categories);
  catSortByFreq(cs);
  catToOrdinal(cs, order);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  const cs = catFromCodes(codes, categories);
  catSortByFreq(cs);
  catToOrdinal(cs, order);
  times.push(performance.now() - t0);
}

const total = times.reduce((a, b) => a + b, 0);
console.log(
  JSON.stringify({
    function: "cat_ops_from_codes",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
