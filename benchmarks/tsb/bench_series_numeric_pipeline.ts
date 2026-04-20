/**
 * Benchmark: Series numeric pipeline — chain abs → round → clip on a 100k-element Series.
 * Tests a realistic sequence of standalone numeric operations.
 * Outputs JSON: {"function": "series_numeric_pipeline", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, seriesAbs, seriesRound, clipSeriesWithBounds } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 30;

const s = new Series({
  data: Array.from({ length: SIZE }, (_, i) => Math.sin(i * 0.01) * 150 - 20),
});

for (let i = 0; i < WARMUP; i++) {
  const a = seriesAbs(s);
  const b = seriesRound(a, { decimals: 2 });
  clipSeriesWithBounds(b, { lower: 0, upper: 100 });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  const a = seriesAbs(s);
  const b = seriesRound(a, { decimals: 2 });
  clipSeriesWithBounds(b, { lower: 0, upper: 100 });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "series_numeric_pipeline",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
