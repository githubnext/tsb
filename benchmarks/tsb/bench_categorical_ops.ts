/**
 * Benchmark: categorical operations on 100k-element Series
 *
 * Covers catFromCodes, catSortByFreq, catFreqTable, and catCrossTab.
 */
import { Series, catFromCodes, catSortByFreq, catFreqTable, catCrossTab } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

// Build a categorical Series from codes + categories
const CATEGORIES = ["alpha", "beta", "gamma", "delta", "epsilon"];
const codes = Int32Array.from({ length: ROWS }, (_, i) => i % CATEGORIES.length);

const catSeries = catFromCodes(Array.from(codes), CATEGORIES);

// Build a second categorical for crossTab
const CATEGORIES2 = ["x", "y", "z"];
const codes2 = Int32Array.from({ length: ROWS }, (_, i) => i % CATEGORIES2.length);
const catSeries2 = catFromCodes(Array.from(codes2), CATEGORIES2);

// Warm up
for (let i = 0; i < WARMUP; i++) {
  catSortByFreq(catSeries);
  catFreqTable(catSeries);
  catCrossTab(catSeries, catSeries2);
}

// Measure catSortByFreq
let start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  catSortByFreq(catSeries);
}
const sortByFreqMs = (performance.now() - start) / ITERATIONS;

// Measure catFreqTable
start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  catFreqTable(catSeries);
}
const freqTableMs = (performance.now() - start) / ITERATIONS;

// Measure catCrossTab
start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  catCrossTab(catSeries, catSeries2);
}
const crossTabMs = (performance.now() - start) / ITERATIONS;

const mean_ms = (sortByFreqMs + freqTableMs + crossTabMs) / 3;

console.log(
  JSON.stringify({
    function: "categorical_ops",
    mean_ms,
    iterations: ITERATIONS,
    total_ms: mean_ms * ITERATIONS,
    details: { sortByFreqMs, freqTableMs, crossTabMs },
  }),
);
