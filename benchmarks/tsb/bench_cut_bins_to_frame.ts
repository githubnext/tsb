/**
 * Benchmark: cut_bins_to_frame — cutBinsToFrame / cutBinCounts / binEdges on 100k data points.
 * Outputs JSON: {"function": "cut_bins_to_frame", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { cut, cutBinsToFrame, cutBinCounts, binEdges } from "../../src/index.ts";

const SIZE = 100_000;
const NUM_BINS = 20;
const WARMUP = 5;
const ITERATIONS = 50;

const data = Array.from({ length: SIZE }, (_, i) => (i % 1000) * 0.1);
const binResult = cut(data, NUM_BINS);

for (let i = 0; i < WARMUP; i++) {
  cutBinsToFrame(binResult, { data });
  cutBinCounts(binResult);
  binEdges(binResult);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  cutBinsToFrame(binResult, { data });
  cutBinCounts(binResult);
  binEdges(binResult);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "cut_bins_to_frame",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
