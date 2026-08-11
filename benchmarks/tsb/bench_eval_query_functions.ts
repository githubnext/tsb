/**
 * Benchmark: queryDataFrame and evalDataFrame with built-in functions.
 * Tests abs(), round(), lower(), upper(), isnull(), len(), and `in` membership.
 * Dataset: 50k-row DataFrame with numeric and string columns.
 * Outputs JSON: {"function": "eval_query_functions", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, queryDataFrame, evalDataFrame } from "../../src/index.js";

const ROWS = 50_000;
const WARMUP = 3;
const ITERATIONS = 20;

const categories = ["alpha", "beta", "gamma", "delta", "epsilon"];

const df = DataFrame.fromColumns({
  val: Array.from({ length: ROWS }, (_, i) => (i % 2 === 0 ? -(i * 0.5) : i * 0.5)),
  score: Array.from({ length: ROWS }, (_, i) => Math.sin(i * 0.01) * 100),
  label: Array.from({ length: ROWS }, (_, i) => categories[i % categories.length]),
  flag: Array.from({ length: ROWS }, (_, i) => (i % 3 === 0 ? null : i * 1.0)),
});

function run(): void {
  // abs() on a column with negative values
  evalDataFrame(df, "abs(val)");
  // round() on a floating-point column
  evalDataFrame(df, "round(score, 1)");
  // lower() on a string column
  evalDataFrame(df, "lower(label)");
  // isnull() to detect nulls
  evalDataFrame(df, "isnull(flag)");
  // `in` membership operator
  queryDataFrame(df, "label in ['alpha', 'beta']");
  // combined: abs + comparison
  queryDataFrame(df, "abs(val) > 10000 and isnull(flag) == False");
}

for (let i = 0; i < WARMUP; i++) run();

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) run();
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "eval_query_functions",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
