/**
 * Benchmark: Styler.format / apply / applymap / toHtml — Styler formatting chain.
 *
 * Covers Styler methods not included in bench_styler:
 *   - format(fn)        → pandas `df.style.format(fn)`
 *   - formatIndex(fn)   → pandas `df.style.format_index(fn)` (pandas 1.4+)
 *   - apply(fn)         → pandas `df.style.apply(fn)`
 *   - applymap(fn)      → pandas `df.style.applymap(fn)` / `map(fn)` (pandas 2.1+)
 *   - toHtml()          → pandas `df.style.to_html()`
 *
 * Outputs JSON: {"function": "styler_format", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, dataFrameStyle } from "../../src/index.ts";

const ROWS = 100;
const WARMUP = 3;
const ITERATIONS = 20;

const df = DataFrame.fromColumns({
  a: Float64Array.from({ length: ROWS }, (_, i) => i * 1.5),
  b: Float64Array.from({ length: ROWS }, (_, i) => (ROWS - i) * 2.0),
  c: Float64Array.from({ length: ROWS }, (_, i) => Math.sin(i / 10) * 50 + 50),
});

for (let i = 0; i < WARMUP; i++) {
  dataFrameStyle(df)
    .format((v) => (typeof v === "number" ? v.toFixed(2) : String(v)))
    .formatIndex((v) => `r${String(v)}`)
    .apply((vals) => vals.map(() => "color: navy"))
    .applymap((v) => (typeof v === "number" && (v as number) > 50 ? "font-weight: bold" : ""))
    .toHtml();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  dataFrameStyle(df)
    .format((v) => (typeof v === "number" ? v.toFixed(2) : String(v)))
    .formatIndex((v) => `r${String(v)}`)
    .apply((vals) => vals.map(() => "color: navy"))
    .applymap((v) => (typeof v === "number" && (v as number) > 50 ? "font-weight: bold" : ""))
    .toHtml();
}
const total_ms = performance.now() - start;

console.log(
  JSON.stringify({
    function: "styler_format",
    mean_ms: total_ms / ITERATIONS,
    iterations: ITERATIONS,
    total_ms,
  }),
);
