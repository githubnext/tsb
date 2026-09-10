/**
 * Benchmark: seriesDigitize and coefficientOfVariation on 100k-element Series.
 *
 * seriesDigitize mirrors pandas Series.digitize (numpy.digitize wrapper on a Series).
 * coefficientOfVariation mirrors scipy.stats.variation (std/mean).
 *
 * Outputs JSON: {"function": "series_digitize_cv", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, seriesDigitize, coefficientOfVariation } from "../../src/index.js";

const N = 100_000;
const WARMUP = 3;
const ITERATIONS = 20;

const data = Array.from({ length: N }, (_, i) => ((i * 2654435761) % 1_000_000) / 10_000);
const s = new Series({ data });
const bins = Array.from({ length: 21 }, (_, i) => i * 5);

for (let i = 0; i < WARMUP; i++) {
  seriesDigitize(s, bins);
  coefficientOfVariation(s);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  seriesDigitize(s, bins);
  coefficientOfVariation(s);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "series_digitize_cv",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
