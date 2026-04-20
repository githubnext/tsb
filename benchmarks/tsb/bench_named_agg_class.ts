/**
 * Benchmark: NamedAgg class, namedAgg factory, isNamedAggSpec — construct and validate 10k specs.
 * Outputs JSON: {"function": "named_agg_class", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { NamedAgg, namedAgg, isNamedAggSpec } from "../../src/index.ts";

const WARMUP = 5;
const ITERATIONS = 1_000;
const N = 100;

const sampleSpec = {
  total: namedAgg("salary", "sum"),
  avg: namedAgg("salary", "mean"),
  max: namedAgg("salary", "max"),
  cnt: namedAgg("headcount", "count"),
};

for (let i = 0; i < WARMUP; i++) {
  for (let j = 0; j < N; j++) {
    new NamedAgg("salary", "sum");
    namedAgg("score", "mean");
    isNamedAggSpec(sampleSpec);
    isNamedAggSpec({ x: "not-namedagg" });
  }
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  for (let j = 0; j < N; j++) {
    new NamedAgg("salary", "sum");
    namedAgg("score", "mean");
    isNamedAggSpec(sampleSpec);
    isNamedAggSpec({ x: "not-namedagg" });
  }
  times.push(performance.now() - start);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "named_agg_class",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
