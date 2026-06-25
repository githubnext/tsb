/**
 * Benchmark: toLaTeX / seriesToLaTeX — render DataFrame/Series to LaTeX tabular format.
 *
 * Mirrors pandas:
 *   - `DataFrame.to_latex()` → tsb `toLaTeX(df)`
 *   - `Series.to_latex()`    → tsb `seriesToLaTeX(s)`
 *
 * Outputs JSON: {"function": "to_latex", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, Series, toLaTeX, seriesToLaTeX } from "../../src/index.ts";

const ROWS = 500;
const WARMUP = 5;
const ITERATIONS = 100;

const df = DataFrame.fromColumns({
  name: Array.from({ length: ROWS }, (_, i) => `item_${i}`),
  value: Float64Array.from({ length: ROWS }, (_, i) => i * 1.23),
  count: Float64Array.from({ length: ROWS }, (_, i) => i),
});

const s = new Series({ data: Float64Array.from({ length: ROWS }, (_, i) => i * 0.5) });

for (let i = 0; i < WARMUP; i++) {
  toLaTeX(df);
  toLaTeX(df, { index: false, booktabs: true });
  seriesToLaTeX(s);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  toLaTeX(df);
  toLaTeX(df, { index: false, booktabs: true });
  seriesToLaTeX(s);
}
const total_ms = performance.now() - start;

console.log(
  JSON.stringify({
    function: "to_latex",
    mean_ms: total_ms / ITERATIONS,
    iterations: ITERATIONS,
    total_ms,
  }),
);
