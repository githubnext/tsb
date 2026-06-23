/**
 * Benchmark: xsSeries — cross-section lookup on Series.
 *
 * Mirrors pandas `Series.xs()`.
 * Tests flat-index lookup (returns scalar) and MultiIndex lookup (returns sub-Series).
 * Outputs JSON: {"function": "xs_series", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, MultiIndex, xsSeries } from "../../src/index.ts";

const N = 1_000;
const WARMUP = 10;
const ITERATIONS = 5_000;

// Flat-index Series: each key appears once → xsSeries returns a scalar.
const flatData = Array.from({ length: N }, (_, i) => i * 1.5);
const flatIdx = Array.from({ length: N }, (_, i) => `k${i}`);
const flatSeries = new Series<number>({ data: flatData, index: flatIdx, name: "flat" });

// MultiIndex Series: 10 outer keys × 100 inner keys → xsSeries returns a sub-Series (100 rows).
const outerKeys = Array.from({ length: N }, (_, i) => `g${Math.floor(i / 100)}`);
const innerKeys = Array.from({ length: N }, (_, i) => i % 100);
const multiIdx = MultiIndex.fromArrays([outerKeys, innerKeys], { names: ["outer", "inner"] });
const multiData = Array.from({ length: N }, (_, i) => i * 2.0);
const multiSeries = new Series<number>({ data: multiData, index: multiIdx, name: "multi" });

// Warm-up
for (let i = 0; i < WARMUP; i++) {
  xsSeries(flatSeries, `k${i % N}`);
  xsSeries(multiSeries, `g${i % 10}`);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  xsSeries(flatSeries, `k${i % N}`);
  xsSeries(multiSeries, `g${i % 10}`);
}
const total_ms = performance.now() - start;

console.log(
  JSON.stringify({
    function: "xs_series",
    mean_ms: total_ms / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total_ms,
  }),
);
