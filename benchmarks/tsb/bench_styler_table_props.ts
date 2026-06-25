/**
 * Benchmark: Styler table-level configuration — setProperties / setTableStyles /
 * setTableAttributes / hide / setPrecision / setNaRep / clearStyles / toHtml.
 *
 * Covers Styler configuration methods not included in other styler benchmarks:
 *   - setPrecision(n)             → pandas `df.style.set_precision(n)`
 *   - setNaRep(s)                 → pandas `df.style.set_na_rep(s)`
 *   - setProperties(props,subset) → pandas `df.style.set_properties(subset=…)`
 *   - setTableStyles(styles)      → pandas `df.style.set_table_styles()`
 *   - setTableAttributes(attrs)   → pandas `df.style.set_table_attributes()`
 *   - hide(0)                     → pandas `df.style.hide(axis="index")`
 *   - hide(1, subset)             → pandas `df.style.hide(subset=…, axis="columns")`
 *   - clearStyles()               → pandas `df.style.clear()`
 *   - toHtml()                    → pandas `df.style.to_html()`
 *
 * Outputs JSON: {"function": "styler_table_props", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, dataFrameStyle } from "../../src/index.ts";

const ROWS = 100;
const WARMUP = 3;
const ITERATIONS = 20;

const df = DataFrame.fromColumns({
  a: Float64Array.from({ length: ROWS }, (_, i) => i * 1.5),
  b: Array.from({ length: ROWS }, (_, i): number | null => (i % 10 === 0 ? null : i * 2.0)),
  c: Float64Array.from({ length: ROWS }, (_, i) => Math.sin(i / 10) * 50 + 50),
});

function run(): void {
  dataFrameStyle(df)
    .setPrecision(3)
    .setNaRep("—")
    .setProperties({ "font-size": "12px", color: "navy" }, ["a", "b"])
    .setTableStyles([
      { selector: "th", props: { "background-color": "#4a90d9", color: "white" } },
      { selector: "tr:nth-child(even) td", props: { "background-color": "#f5f5f5" } },
    ])
    .setTableAttributes('class="data-table" id="bench-table"')
    .hide(0)
    .hide(1, ["c"])
    .clearStyles()
    .toHtml();
}

for (let i = 0; i < WARMUP; i++) run();

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) run();
const total_ms = performance.now() - start;

console.log(
  JSON.stringify({
    function: "styler_table_props",
    mean_ms: total_ms / ITERATIONS,
    iterations: ITERATIONS,
    total_ms,
  }),
);
