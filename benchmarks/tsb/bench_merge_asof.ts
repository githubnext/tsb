/**
 * Benchmark: mergeAsof — backward asof join of two 10k-row sorted DataFrames.
 * Outputs JSON: {"function": "merge_asof", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, mergeAsof } from "../../src/index.ts";

const N = 10_000;
const WARMUP = 3;
const ITERATIONS = 10;

// Trades sorted by time: 0, 2, 4, ...
const tradeTimes = Array.from({ length: N }, (_, i) => i * 2);
const prices = Array.from({ length: N }, (_, i) => 100.0 + i * 0.5);

// Quotes sorted by time, sparser: 0, 3, 6, ...
const quoteTimes = Array.from({ length: N }, (_, i) => i * 3);
const bids = Array.from({ length: N }, (_, i) => 99.0 + i * 0.5);

const trades = DataFrame.fromColumns({ time: tradeTimes, price: prices });
const quotes = DataFrame.fromColumns({ time: quoteTimes, bid: bids });

for (let i = 0; i < WARMUP; i++) {
  mergeAsof(trades, quotes, { on: "time" });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  mergeAsof(trades, quotes, { on: "time" });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "merge_asof",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
