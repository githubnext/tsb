/**
 * Benchmark: getOption / setOption / resetOption — pandas options API.
 *
 * Mirrors pandas `pd.get_option`, `pd.set_option`, `pd.reset_option`.
 * Outputs JSON: {"function": "get_set_option", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { getOption, setOption, resetOption } from "../../src/index.ts";

const WARMUP = 10;
const ITERATIONS = 10_000;

// Warm-up
for (let i = 0; i < WARMUP; i++) {
  getOption("display.max_rows");
  setOption("display.max_rows", 50);
  resetOption("display.max_rows");
  getOption("display.precision");
  setOption("display.precision", 3);
  resetOption("display.precision");
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  getOption("display.max_rows");
  setOption("display.max_rows", (i % 90) + 10);
  resetOption("display.max_rows");
  getOption("display.precision");
  setOption("display.precision", (i % 8) + 2);
  resetOption("display.precision");
}
const total_ms = performance.now() - start;

console.log(
  JSON.stringify({
    function: "get_set_option",
    mean_ms: total_ms / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total_ms,
  }),
);
