/**
 * Benchmark: nunique — Series.nunique() and DataFrame.nunique()
 *
 * Compares tsb nuniqueSeries / nuniqueDataFrame against
 * pandas Series.nunique() / DataFrame.nunique() on a 100 000-row dataset
 * with ~1 000 distinct values so that the deduplication step is meaningful.
 */

import { nuniqueSeries, nuniqueDataFrame } from "../../src/stats/index.js";
import { Series, DataFrame } from "../../src/index.js";

const N = 100_000;
const DISTINCT = 1_000; // cardinality
const WARMUP = 5;
const ITERS = 50;

// Build datasets once
const numData: number[] = Array.from({ length: N }, (_, i) => i % DISTINCT);
const strData: string[] = numData.map((v) => `cat_${v}`);

const numSeries = new Series(numData);
const strSeries = new Series(strData);

const dfData: Record<string, number[]> = {
  a: numData,
  b: numData.map((v) => (v * 7) % DISTINCT),
  c: numData.map((v) => (v * 13) % DISTINCT),
  d: numData.map((v) => (v * 17) % DISTINCT),
};
const df = new DataFrame(dfData);

function bench(fn: () => void, warmup: number, iters: number): number {
  for (let i = 0; i < warmup; i++) fn();
  const t0 = performance.now();
  for (let i = 0; i < iters; i++) fn();
  return (performance.now() - t0) / iters;
}

const meanNum = bench(() => nuniqueSeries(numSeries), WARMUP, ITERS);
const meanStr = bench(() => nuniqueSeries(strSeries), WARMUP, ITERS);
const meanDf = bench(() => nuniqueDataFrame(df), WARMUP, ITERS);

const meanMs = (meanNum + meanStr + meanDf) / 3;

console.log(
  JSON.stringify({
    function: "nunique",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERS,
    total_ms: Math.round((meanNum + meanStr + meanDf) * ITERS * 1000) / 1000,
    details: {
      series_numeric_ms: Math.round(meanNum * 1000) / 1000,
      series_string_ms: Math.round(meanStr * 1000) / 1000,
      dataframe_ms: Math.round(meanDf * 1000) / 1000,
    },
  }),
);
