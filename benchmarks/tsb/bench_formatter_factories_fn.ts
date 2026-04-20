/**
 * Benchmark: makeFloatFormatter + makePercentFormatter + makeCurrencyFormatter — formatter factories.
 * Outputs JSON: {"function": "formatter_factories_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import {
  Series,
  makeFloatFormatter,
  makePercentFormatter,
  makeCurrencyFormatter,
  applySeriesFormatter,
  applyDataFrameFormatter,
  DataFrame,
} from "../../src/index.ts";

const SIZE = 10_000;
const WARMUP = 5;
const ITERATIONS = 50;

const ser = new Series(Array.from({ length: SIZE }, (_, i) => i * 1.23456));
const df = DataFrame.fromColumns({
  price: Array.from({ length: SIZE }, (_, i) => i * 9.99),
  pct: Array.from({ length: SIZE }, (_, i) => (i % 100) / 100),
});

const fmtFloat = makeFloatFormatter(2);
const fmtPct = makePercentFormatter(1);
const fmtCur = makeCurrencyFormatter("$", 2);

for (let i = 0; i < WARMUP; i++) {
  applySeriesFormatter(ser, fmtFloat);
  applyDataFrameFormatter(df, { price: fmtCur, pct: fmtPct });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  makeFloatFormatter(3);
  makePercentFormatter(2);
  makeCurrencyFormatter("€", 2);
  applySeriesFormatter(ser, fmtFloat);
  applyDataFrameFormatter(df, { price: fmtCur, pct: fmtPct });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "formatter_factories_fn",
    mean_ms: Math.round((total / ITERATIONS) * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(total * 1000) / 1000,
  }),
);
