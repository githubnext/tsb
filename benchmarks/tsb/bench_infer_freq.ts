/**
 * Benchmark: inferFreq — infer frequency from an array of regularly-spaced dates.
 * Outputs JSON: {"function": "infer_freq", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { inferFreq } from "../../src/index.js";

const WARMUP = 5;
const ITERATIONS = 500;

// Build date arrays for various frequencies
function makeDates(start: Date, stepMs: number, count: number): Date[] {
  const out: Date[] = [];
  let t = start.getTime();
  for (let i = 0; i < count; i++) {
    out.push(new Date(t));
    t += stepMs;
  }
  return out;
}

const MS_DAY = 86_400_000;
const MS_HOUR = 3_600_000;
const MS_MIN = 60_000;

const base = new Date("2020-01-01T00:00:00Z");
const dateSets = [
  makeDates(base, 1, 200),            // 1ms
  makeDates(base, 1000, 200),         // 1s
  makeDates(base, MS_MIN, 200),       // 1min
  makeDates(base, MS_HOUR, 200),      // 1h
  makeDates(base, MS_DAY, 200),       // daily
  makeDates(base, 7 * MS_DAY, 200),   // weekly
];

for (let i = 0; i < WARMUP; i++) {
  for (const ds of dateSets) {
    inferFreq(ds);
  }
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  for (const ds of dateSets) {
    inferFreq(ds);
  }
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "infer_freq",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
