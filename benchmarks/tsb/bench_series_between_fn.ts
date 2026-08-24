/**
 * Benchmark: seriesBetween — standalone function with all inclusive options.
 *
 * Benchmarks the four inclusive modes: "both", "left", "right", "neither"
 * on a 100k-element numeric Series.
 *
 * Mirrors pandas Series.between(inclusive=...) with all four modes.
 */
import { Series, seriesBetween } from "../../src/index.js";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 20;

const s = new Series({ data: Float64Array.from({ length: SIZE }, (_, i) => i * 1.0) });

for (let i = 0; i < WARMUP; i++) {
  seriesBetween(s, 25000.0, 75000.0, { inclusive: "both" });
  seriesBetween(s, 25000.0, 75000.0, { inclusive: "left" });
  seriesBetween(s, 25000.0, 75000.0, { inclusive: "right" });
  seriesBetween(s, 25000.0, 75000.0, { inclusive: "neither" });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  seriesBetween(s, 25000.0, 75000.0, { inclusive: "both" });
  seriesBetween(s, 25000.0, 75000.0, { inclusive: "left" });
  seriesBetween(s, 25000.0, 75000.0, { inclusive: "right" });
  seriesBetween(s, 25000.0, 75000.0, { inclusive: "neither" });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "series_between_fn",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
