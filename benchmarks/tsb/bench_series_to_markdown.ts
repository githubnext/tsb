/**
 * Benchmark: seriesToMarkdown and seriesToLaTeX on a 500-element numeric Series.
 *
 * The existing `to_markdown` benchmark covers DataFrames only.
 * This benchmark exercises the Series variants: seriesToMarkdown / seriesToLaTeX.
 * Mirrors pandas Series.to_markdown() and Series.to_latex().
 *
 * Outputs JSON: {"function": "series_to_markdown", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, seriesToMarkdown, seriesToLaTeX } from "../../src/index.ts";

const SIZE = 500;
const WARMUP = 5;
const ITERATIONS = 50;

const s = new Series({
  data: Array.from({ length: SIZE }, (_, i) => (i * 1.7) % 100),
  name: "values",
});

for (let i = 0; i < WARMUP; i++) {
  seriesToMarkdown(s);
  seriesToLaTeX(s);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  seriesToMarkdown(s);
  seriesToLaTeX(s);
}
const total_ms = performance.now() - start;

console.log(
  JSON.stringify({
    function: "series_to_markdown",
    mean_ms: total_ms / ITERATIONS,
    iterations: ITERATIONS,
    total_ms,
  }),
);
