/**
 * Benchmark: combineSeries / combineDataFrame — element-wise combine of two
 * Series (and column-by-column combine of two DataFrames) with a binary function.
 */
import { DataFrame, Series, combineDataFrame, combineSeries } from "../../src/index.js";

const N = 50_000;
const WARMUP = 2;
const ITERATIONS = 5;

const idx = Array.from({ length: N }, (_, i) => i);
const a = new Series({ data: Array.from({ length: N }, (_, i) => i * 1.0), index: idx });
const b = new Series({ data: Array.from({ length: N }, (_, i) => i * 2.0), index: idx });

const dfA = DataFrame.fromColumns({ x: a.values, y: b.values });
const dfB = DataFrame.fromColumns({ x: b.values, z: a.values });

const add = (p: number | null, q: number | null): number => (p ?? 0) + (q ?? 0);

for (let i = 0; i < WARMUP; i++) {
  combineSeries(a, b, add, 0);
  combineDataFrame(dfA, dfB, add, { fillValue: 0 });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  combineSeries(a, b, add, 0);
  combineDataFrame(dfA, dfB, add, { fillValue: 0 });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "combine_series_dataframe",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
