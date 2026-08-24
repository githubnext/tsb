/**
 * Benchmark: dataFrameStyle / Styler — DataFrame styling and HTML rendering.
 *
 * Mirrors pandas:
 *   - `df.style.highlight_max().to_html()` → tsb `dataFrameStyle(df).highlightMax().toHtml()`
 *   - Various Styler methods: format, applymap, backgroundGradient, barChart
 *
 * Outputs JSON: {"function": "style", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, dataFrameStyle } from "../../src/index.js";

const ROWS = 200;
const WARMUP = 3;
const ITERATIONS = 50;

const df = DataFrame.fromColumns({
  a: Float64Array.from({ length: ROWS }, (_, i) => i * 1.5),
  b: Float64Array.from({ length: ROWS }, (_, i) => Math.sin(i) * 100),
  c: Float64Array.from({ length: ROWS }, (_, i) => i % 50),
});

for (let i = 0; i < WARMUP; i++) {
  dataFrameStyle(df).highlightMax().toHtml();
  dataFrameStyle(df).highlightMin({ color: "lightblue" }).toHtml();
  dataFrameStyle(df)
    .format((v) => (v as number).toFixed(2))
    .toHtml();
  dataFrameStyle(df).backgroundGradient().toHtml();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  dataFrameStyle(df).highlightMax().toHtml();
  dataFrameStyle(df).highlightMin({ color: "lightblue" }).toHtml();
  dataFrameStyle(df)
    .format((v) => (v as number).toFixed(2))
    .toHtml();
  dataFrameStyle(df).backgroundGradient().toHtml();
}
const total_ms = performance.now() - start;

console.log(
  JSON.stringify({
    function: "style",
    mean_ms: total_ms / ITERATIONS,
    iterations: ITERATIONS,
    total_ms,
  }),
);
