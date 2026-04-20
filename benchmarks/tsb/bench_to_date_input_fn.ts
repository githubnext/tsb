/**
 * Benchmark: toDateInput — normalize various date input types to Date objects.
 * Outputs JSON: {"function": "to_date_input_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { toDateInput } from "../../src/index.ts";

const SIZE = 50_000;
const WARMUP = 5;
const ITERATIONS = 50;

const strings = Array.from({ length: SIZE }, (_, i) => `2020-${String(1 + (i % 12)).padStart(2, "0")}-01`);
const timestamps = Array.from({ length: SIZE }, (_, i) => Date.now() + i * 86_400_000);
const dates = Array.from({ length: SIZE }, (_, i) => new Date(2020, i % 12, 1 + (i % 28)));

for (let i = 0; i < WARMUP; i++) {
  for (const s of strings.slice(0, 100)) toDateInput(s);
  for (const t of timestamps.slice(0, 100)) toDateInput(t);
  for (const d of dates.slice(0, 100)) toDateInput(d);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  for (const s of strings) toDateInput(s);
  for (const t of timestamps) toDateInput(t);
  for (const d of dates) toDateInput(d);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "to_date_input_fn",
    mean_ms: Math.round((total / ITERATIONS) * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(total * 1000) / 1000,
  }),
);
