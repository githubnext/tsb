/**
 * Benchmark: reindexSeries / reindexDataFrame with fill methods (ffill, bfill, nearest).
 * Outputs JSON: {"function": "reindex_fill_methods", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, DataFrame, Index, reindexSeries, reindexDataFrame } from "../../src/index.ts";

const SIZE = 20_000;
const WARMUP = 3;
const ITERATIONS = 20;

// Original: even indices
const origLabels = Array.from({ length: SIZE }, (_, i) => i * 2);
const data = Array.from({ length: SIZE }, (_, i) => i * 1.5);
const s = new Series({ data, index: new Index(origLabels) });

// New index: 0..SIZE*2 (includes odd indices that need filling)
const newIndex = Array.from({ length: SIZE * 2 }, (_, i) => i);

const df = DataFrame.fromColumns(
  { a: data, b: data.map((v) => v * 2) },
  new Index(origLabels),
);

for (let i = 0; i < WARMUP; i++) {
  reindexSeries(s, newIndex, { method: "ffill" });
  reindexSeries(s, newIndex, { method: "bfill" });
  reindexSeries(s, newIndex, { method: "nearest" });
  reindexDataFrame(df, { index: newIndex, method: "ffill" });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  reindexSeries(s, newIndex, { method: "ffill" });
  reindexSeries(s, newIndex, { method: "bfill" });
  reindexSeries(s, newIndex, { method: "nearest" });
  reindexDataFrame(df, { index: newIndex, method: "ffill" });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "reindex_fill_methods",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
