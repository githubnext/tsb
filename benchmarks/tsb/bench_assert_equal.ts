/**
 * Benchmark: assertSeriesEqual / assertFrameEqual / assertIndexEqual — testing utilities.
 *
 * Mirrors pandas.testing:
 *   - pd.testing.assert_series_equal
 *   - pd.testing.assert_frame_equal
 *   - pd.testing.assert_index_equal
 *
 * Tests equality checks on 10k-row numeric and string data.
 * Outputs JSON: {"function": "assert_equal", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import {
  Series,
  DataFrame,
  Index,
  assertSeriesEqual,
  assertFrameEqual,
  assertIndexEqual,
} from "../../src/index.ts";

const SIZE = 10_000;
const WARMUP = 5;
const ITERATIONS = 100;

const numericData = Array.from({ length: SIZE }, (_, i) => i * 0.1);
const stringData = Array.from({ length: SIZE }, (_, i) => `item_${i % 200}`);
const boolData = Array.from({ length: SIZE }, (_, i) => i % 2 === 0);

const s1 = new Series({ data: numericData });
const s2 = new Series({ data: numericData });
const sStr1 = new Series({ data: stringData });
const sStr2 = new Series({ data: stringData });

const df1 = DataFrame.fromColumns({
  a: numericData,
  b: stringData,
  c: boolData,
});
const df2 = DataFrame.fromColumns({
  a: numericData,
  b: stringData,
  c: boolData,
});

const idx1 = new Index(Array.from({ length: SIZE }, (_, i) => i));
const idx2 = new Index(Array.from({ length: SIZE }, (_, i) => i));

for (let i = 0; i < WARMUP; i++) {
  assertSeriesEqual(s1, s2);
  assertSeriesEqual(sStr1, sStr2);
  assertFrameEqual(df1, df2);
  assertIndexEqual(idx1, idx2);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  assertSeriesEqual(s1, s2);
  assertSeriesEqual(sStr1, sStr2);
  assertFrameEqual(df1, df2);
  assertIndexEqual(idx1, idx2);
}
const total_ms = performance.now() - start;

console.log(
  JSON.stringify({
    function: "assert_equal",
    mean_ms: total_ms / ITERATIONS,
    iterations: ITERATIONS,
    total_ms,
  }),
);
