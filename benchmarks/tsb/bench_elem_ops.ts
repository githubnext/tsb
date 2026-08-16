/**
 * Benchmark: elem_ops — seriesAbs, dataFrameAbs, seriesRound, dataFrameRound
 *
 * Matches bench_elem_ops.py: 100k-row Series/DataFrame, abs() and round() ops.
 */
import { DataFrame, Series, seriesAbs, dataFrameAbs, seriesRound, dataFrameRound } from "../../src/index.js";

const N = 100_000;
const WARMUP = 3;
const ITERS = 20;

// Build dataset: floats in range [-500, 500]
const data: number[] = [];
for (let i = 0; i < N; i++) {
  data.push((i % 1001) - 500 + (i % 7) * 0.1234);
}

const series = new Series({ data });
const df = DataFrame.fromColumns({
  a: data,
  b: data.map((v) => -v),
  c: data.map((v) => v * 1.5),
});

function bench(fn: () => unknown): number {
  for (let i = 0; i < WARMUP; i++) fn();
  const t0 = performance.now();
  for (let i = 0; i < ITERS; i++) fn();
  return (performance.now() - t0) / ITERS;
}

const seriesAbsMs = bench(() => seriesAbs(series));
const dfAbsMs = bench(() => dataFrameAbs(df));
const seriesRoundMs = bench(() => seriesRound(series, { decimals: 2 }));
const dfRoundMs = bench(() => dataFrameRound(df, {}));

const meanMs = (seriesAbsMs + dfAbsMs + seriesRoundMs + dfRoundMs) / 4;

console.log(
  JSON.stringify({
    function: "elem_ops",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERS,
    total_ms: Math.round(meanMs * ITERS * 1000) / 1000,
    details: {
      series_abs_ms: Math.round(seriesAbsMs * 1000) / 1000,
      df_abs_ms: Math.round(dfAbsMs * 1000) / 1000,
      series_round_ms: Math.round(seriesRoundMs * 1000) / 1000,
      df_round_ms: Math.round(dfRoundMs * 1000) / 1000,
    },
  }),
);
