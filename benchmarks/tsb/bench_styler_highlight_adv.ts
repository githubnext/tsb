/**
 * Benchmark: Styler advanced highlighting — highlightNull / highlightBetween /
 * textGradient / barChart / setCaption / toLatex.
 *
 * Covers Styler methods not included in bench_styler:
 *   - highlightNull()         → pandas `df.style.highlight_null()`
 *   - highlightBetween()      → pandas `df.style.highlight_between()`
 *   - textGradient()          → pandas `df.style.text_gradient()`
 *   - barChart()              → pandas `df.style.bar()`
 *   - setCaption(caption)     → pandas `df.style.set_caption(caption)`
 *   - toLatex()               → pandas `df.style.to_latex()`
 *
 * Outputs JSON: {"function": "styler_highlight_adv", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, dataFrameStyle } from "../../src/index.ts";

const ROWS = 100;
const WARMUP = 3;
const ITERATIONS = 20;

const df = DataFrame.fromColumns({
  a: Float64Array.from({ length: ROWS }, (_, i) => i * 1.0),
  b: Array.from({ length: ROWS }, (_, i): number | null => (i % 10 === 0 ? null : i * 2.0)),
  c: Float64Array.from({ length: ROWS }, (_, i) => Math.sin(i / 10) * 50 + 50),
});

for (let i = 0; i < WARMUP; i++) {
  dataFrameStyle(df)
    .highlightNull("red")
    .highlightBetween({ left: 20, right: 80, color: "lightyellow" })
    .textGradient({ cmap: "Blues" })
    .barChart({ align: "mid", color: "#aec6cf" })
    .setCaption("Benchmark Table")
    .toLatex();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  dataFrameStyle(df)
    .highlightNull("red")
    .highlightBetween({ left: 20, right: 80, color: "lightyellow" })
    .textGradient({ cmap: "Blues" })
    .barChart({ align: "mid", color: "#aec6cf" })
    .setCaption("Benchmark Table")
    .toLatex();
}
const total_ms = performance.now() - start;

console.log(
  JSON.stringify({
    function: "styler_highlight_adv",
    mean_ms: total_ms / ITERATIONS,
    iterations: ITERATIONS,
    total_ms,
  }),
);
