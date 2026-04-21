/**
 * Benchmark: IntervalIndex.indexOf / IntervalIndex.overlapping — interval lookup and overlap queries.
 * Mirrors pandas IntervalIndex.get_indexer and overlaps methods.
 * Outputs JSON: {"function": "interval_index_query", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Interval, IntervalIndex } from "../../src/index.ts";

const WARMUP = 5;
const ITERATIONS = 50;

const BREAKS = 501;
const breaks = Array.from({ length: BREAKS }, (_, i) => i * 2);
const idx = IntervalIndex.fromBreaks(breaks);

const queries = Array.from({ length: 1_000 }, (_, i) => i * 0.999);
const queryInterval = new Interval(200, 400);

for (let w = 0; w < WARMUP; w++) {
  for (const q of queries.slice(0, 50)) idx.indexOf(q);
  idx.overlapping(queryInterval);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  for (const q of queries) idx.indexOf(q);
  idx.overlapping(queryInterval);
  times.push(performance.now() - t0);
}

const total = times.reduce((a, b) => a + b, 0);
console.log(
  JSON.stringify({
    function: "interval_index_query",
    mean_ms: round3(total / ITERATIONS),
    iterations: ITERATIONS,
    total_ms: round3(total),
  }),
);

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}
