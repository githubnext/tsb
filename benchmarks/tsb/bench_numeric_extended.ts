/**
 * Benchmark: numeric_extended — digitize, histogram, linspace, arange, zscore,
 * minMaxNormalize, percentileOfScore on 100k-element arrays.
 */
import {
  digitize,
  histogram,
  linspace,
  arange,
  zscore,
  minMaxNormalize,
  percentileOfScore,
  Series,
} from "../../src/index.js";

const N = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

// Deterministic dataset in [0, 100)
const data: number[] = Array.from({ length: N }, (_, i) => ((i * 2654435761) % 1_000_000) / 10_000);
const bins20: number[] = Array.from({ length: 21 }, (_, i) => i * 5);
const series = new Series({ data });

function bench(fn: () => void): number {
  for (let i = 0; i < WARMUP; i++) fn();
  const t0 = performance.now();
  for (let i = 0; i < ITERATIONS; i++) fn();
  return (performance.now() - t0) / ITERATIONS;
}

const digitize_ms = bench(() => digitize(data, bins20));
const histogram_ms = bench(() => histogram(data, { bins: 20 }));
const linspace_ms = bench(() => linspace(0, 100, N));
const arange_ms = bench(() => arange(0, 100, 0.001));
const zscore_ms = bench(() => zscore(series));
const minmax_ms = bench(() => minMaxNormalize(series));
const percentile_ms = bench(() => percentileOfScore(data, 50.0));

const mean_ms =
  (digitize_ms + histogram_ms + linspace_ms + arange_ms + zscore_ms + minmax_ms + percentile_ms) / 7;

console.log(
  JSON.stringify({
    function: "numeric_extended",
    mean_ms: parseFloat(mean_ms.toFixed(4)),
    iterations: ITERATIONS,
    total_ms: parseFloat((mean_ms * ITERATIONS).toFixed(4)),
  }),
);
