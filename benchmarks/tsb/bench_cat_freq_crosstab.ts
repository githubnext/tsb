/**
 * Benchmark: catFreqTable and catCrossTab on 100k elements.
 * Outputs JSON: {"function": "cat_freq_crosstab", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { catFromCodes, catFreqTable, catCrossTab } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 20;

const catsA = ["alpha", "beta", "gamma", "delta", "epsilon"];
const catsB = ["north", "south", "east", "west"];
const codesA = Array.from({ length: SIZE }, (_, i) => i % catsA.length);
const codesB = Array.from({ length: SIZE }, (_, i) => i % catsB.length);
const csA = catFromCodes(codesA, catsA);
const csB = catFromCodes(codesB, catsB);

for (let i = 0; i < WARMUP; i++) {
  catFreqTable(csA);
  catCrossTab(csA, csB);
  catCrossTab(csA, csB, { normalize: true });
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  catFreqTable(csA);
  catCrossTab(csA, csB);
  catCrossTab(csA, csB, { normalize: true });
  times.push(performance.now() - t0);
}

const total = times.reduce((a, b) => a + b, 0);
console.log(
  JSON.stringify({
    function: "cat_freq_crosstab",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
