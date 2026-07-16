/**
 * Benchmark: flags and options
 *
 * Measures:
 *  - getFlags / allowsDuplicateLabels get+set (Series & DataFrame)
 *  - getOption / setOption / resetOption for multiple keys
 *  - options proxy read
 *
 * Dataset: 10,000-row Series and DataFrame; 20 measured iterations.
 */

import {
  Series,
  DataFrame,
  getFlags,
  getOption,
  setOption,
  resetOption,
  options,
} from "../../src/index.js";

const N = 10_000;
const WARMUP = 5;
const ITERS = 20;

// Build test data once
const data = Float64Array.from({ length: N }, (_, i) => i);
const s = new Series(data);
const df = DataFrame.fromColumns({ a: Array.from(data), b: Array.from(data) });

function benchFlagsOptions(): number {
  let sink = 0;
  for (let i = 0; i < ITERS + WARMUP; i++) {
    // flags on Series
    const sf = getFlags(s);
    const prev = sf.allowsDuplicateLabels;
    sf.allowsDuplicateLabels = !prev;
    sf.allowsDuplicateLabels = prev;
    sink ^= sf.allowsDuplicateLabels ? 1 : 0;

    // flags on DataFrame
    const dff = getFlags(df);
    const prevDf = dff.allowsDuplicateLabels;
    dff.allowsDuplicateLabels = !prevDf;
    dff.allowsDuplicateLabels = prevDf;
    sink ^= dff.allowsDuplicateLabels ? 1 : 0;

    // options get/set/reset
    const v = getOption("display.max_rows") as number;
    setOption("display.max_rows", v + 1);
    resetOption("display.max_rows");
    sink ^= (options.display as Record<string, unknown>).max_rows ? 1 : 0;

    setOption("display.max_columns", 20);
    resetOption("display.max_columns");
    sink ^= (options.display as Record<string, unknown>).max_columns ? 1 : 0;
  }
  return sink;
}

// Warm-up
benchFlagsOptions();

// Measure
const t0 = performance.now();
for (let i = 0; i < ITERS; i++) benchFlagsOptions();
const total = performance.now() - t0;

console.log(
  JSON.stringify({
    function: "flags_options",
    mean_ms: total / ITERS,
    iterations: ITERS,
    total_ms: total,
  }),
);
