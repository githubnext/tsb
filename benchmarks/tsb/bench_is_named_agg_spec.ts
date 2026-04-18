/**
 * Benchmark: isNamedAggSpec — type-guard that checks whether a spec object
 * consists entirely of NamedAgg instances.  Used by DataFrameGroupBy.agg()
 * to distinguish NamedAggSpec from plain AggSpec dicts.
 * Outputs JSON: {"function": "is_named_agg_spec", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { isNamedAggSpec, namedAgg } from "../../src/index.ts";

const WARMUP = 5;
const ITERATIONS = 100;

// A large spec dict that IS a NamedAggSpec — all values are NamedAgg instances.
const validSpec = Object.fromEntries(
  Array.from({ length: 200 }, (_, i) => [
    `col_${i}`,
    namedAgg(`src_${i % 10}`, "sum"),
  ]),
);

// A dict that is NOT a NamedAggSpec — plain string values.
const invalidSpec: Record<string, string> = Object.fromEntries(
  Array.from({ length: 200 }, (_, i) => [`col_${i}`, "sum"]),
);

for (let i = 0; i < WARMUP; i++) {
  isNamedAggSpec(validSpec);
  isNamedAggSpec(invalidSpec);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  for (let j = 0; j < 500; j++) {
    isNamedAggSpec(validSpec);
    isNamedAggSpec(invalidSpec);
  }
  times.push(performance.now() - t0);
}

const total = times.reduce((a, b) => a + b, 0);
console.log(
  JSON.stringify({
    function: "is_named_agg_spec",
    mean_ms: Math.round((total / ITERATIONS) * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(total * 1000) / 1000,
  }),
);
