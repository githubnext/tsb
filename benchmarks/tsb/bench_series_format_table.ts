/**
 * Benchmark: seriesToMarkdown and seriesToLaTeX on a 500-element Series.
 *
 * Mirrors pandas Series.to_markdown() and Series.to_latex().
 * Exercises table-rendering of both numeric and mixed-type series.
 */
import { Series, seriesToMarkdown, seriesToLaTeX } from "../../src/index.ts";
import type { Scalar } from "../../src/types.ts";

const N = 500;
const WARMUP = 3;
const ITERATIONS = 30;

const numData: number[] = Array.from({ length: N }, (_, i) => Math.sin(i * 0.05) * 100);
const strData: Scalar[] = Array.from({ length: N }, (_, i) => (i % 10 === 0 ? null : `item_${i}`));

const numSeries = new Series({ data: numData });
const strSeries = new Series<Scalar>({ data: strData });

// Warm-up
for (let i = 0; i < WARMUP; i++) {
  seriesToMarkdown(numSeries);
  seriesToLaTeX(numSeries);
  seriesToMarkdown(strSeries);
  seriesToLaTeX(strSeries);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  seriesToMarkdown(numSeries);
  seriesToLaTeX(numSeries);
  seriesToMarkdown(strSeries);
  seriesToLaTeX(strSeries);
}
const total_ms = performance.now() - start;

console.log(
  JSON.stringify({
    function: "series_format_table",
    mean_ms: total_ms / ITERATIONS,
    iterations: ITERATIONS,
    total_ms,
  }),
);
