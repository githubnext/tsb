/**
 * Benchmark: describeOption / optionContext — pandas options describe and context manager.
 *
 * The existing bench_get_set_option covers getOption / setOption / resetOption.
 * This benchmark covers the remaining options API:
 *   - describeOption(key?) → string  — describe one or all option(s)
 *   - optionContext("key", value).enter() / .exit() — temporary option override
 *
 * Mirrors pandas:
 *   - pd.describe_option("display.max_rows")  → describeOption
 *   - with pd.option_context(...)              → optionContext + enter/exit
 *
 * Outputs JSON: {"function": "option_context", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { describeOption, optionContext } from "../../src/index.ts";

const WARMUP = 20;
const ITERATIONS = 50_000;

// Warm-up
for (let i = 0; i < WARMUP; i++) {
  describeOption("display.max_rows");
  describeOption("display.precision");
  const ctx = optionContext("display.max_rows", 50, "display.precision", 3);
  ctx.enter();
  ctx.exit();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  describeOption("display.max_rows");
  describeOption("display.precision");
  const ctx = optionContext("display.max_rows", 50, "display.precision", 3);
  ctx.enter();
  ctx.exit();
}
const total_ms = performance.now() - start;

console.log(
  JSON.stringify({
    function: "option_context",
    mean_ms: total_ms / ITERATIONS,
    iterations: ITERATIONS,
    total_ms,
  }),
);
