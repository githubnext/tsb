/**
 * Benchmark: firstValidIndex / lastValidIndex
 * Outputs JSON: {"function": "first_last_valid_index", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, firstValidIndex, lastValidIndex } from "../../src/index.ts";

const N = 100_000;

// Series where first valid is near the start (a few NaN/null at beginning)
const dataStart = Float64Array.from({ length: N }, (_, i) =>
  i < 10 ? NaN : i,
);
const seriesStart = new Series({ data: dataStart });

// Series where last valid is near the end (a few NaN/null at the end)
const dataEnd = Float64Array.from({ length: N }, (_, i) =>
  i >= N - 10 ? NaN : i,
);
const seriesEnd = new Series({ data: dataEnd });

// Series with NaN scattered throughout (worst-case scan)
const dataMixed = Float64Array.from({ length: N }, (_, i) =>
  i % 7 === 0 ? NaN : i,
);
const seriesMixed = new Series({ data: dataMixed });

// Warm-up
for (let w = 0; w < 20; w++) {
  firstValidIndex(seriesStart);
  lastValidIndex(seriesEnd);
  firstValidIndex(seriesMixed);
  lastValidIndex(seriesMixed);
}

const iterations = 500;
const start = performance.now();
for (let i = 0; i < iterations; i++) {
  firstValidIndex(seriesStart);
  lastValidIndex(seriesEnd);
  firstValidIndex(seriesMixed);
  lastValidIndex(seriesMixed);
}
const total_ms = performance.now() - start;

console.log(
  JSON.stringify({
    function: "first_last_valid_index",
    mean_ms: total_ms / iterations,
    iterations,
    total_ms,
  }),
);
