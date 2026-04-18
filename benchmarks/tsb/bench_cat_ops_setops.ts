/**
 * Benchmark: catUnionCategories, catIntersectCategories, catDiffCategories on 100k elements.
 * Outputs JSON: {"function": "cat_ops_setops", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { catFromCodes, catUnionCategories, catIntersectCategories, catDiffCategories } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 20;

const catsA = ["alpha", "beta", "gamma", "delta"];
const catsB = ["gamma", "delta", "epsilon", "zeta"];
const codesA = Array.from({ length: SIZE }, (_, i) => i % catsA.length);
const codesB = Array.from({ length: SIZE }, (_, i) => i % catsB.length);
const csA = catFromCodes(codesA, catsA);
const csB = catFromCodes(codesB, catsB);

for (let i = 0; i < WARMUP; i++) {
  catUnionCategories(csA, csB);
  catIntersectCategories(csA, csB);
  catDiffCategories(csA, csB);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  catUnionCategories(csA, csB);
  catIntersectCategories(csA, csB);
  catDiffCategories(csA, csB);
  times.push(performance.now() - t0);
}

const total = times.reduce((a, b) => a + b, 0);
console.log(
  JSON.stringify({
    function: "cat_ops_setops",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
