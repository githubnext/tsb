/**
 * Benchmark: toDatetime — parse scalar/array values to Date.
 * Outputs JSON: {"function": "to_datetime", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { toDatetime } from "../../src/index.ts";

const SIZE = 10_000;
const WARMUP = 5;
const ITERATIONS = 50;

const base = new Date("2020-01-01").getTime();
const msPerDay = 86_400_000;
const dateStrings = Array.from({ length: SIZE }, (_, i) => {
  const d = new Date(base + i * msPerDay);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
});
const timestamps = Array.from({ length: SIZE }, (_, i) => base + i * msPerDay);

for (let i = 0; i < WARMUP; i++) {
  toDatetime(dateStrings);
  toDatetime(timestamps);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  toDatetime(dateStrings);
  toDatetime(timestamps);
  times.push(performance.now() - start);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "to_datetime",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
