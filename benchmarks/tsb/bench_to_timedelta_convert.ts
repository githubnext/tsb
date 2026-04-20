/**
 * Benchmark: toTimedelta — convert strings, numbers, and arrays to Timedelta objects.
 * Mirrors pandas pd.to_timedelta().
 * Outputs JSON: {"function": "to_timedelta_convert", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { toTimedelta } from "../../src/index.ts";

const WARMUP = 5;
const ITERATIONS = 50;

const strings = [
  "1 days 02:03:04",
  "0 days 00:30:00",
  "5 days 12:00:00.500",
  "PT1H30M",
  "P7D",
  "-PT2H45M30S",
  "2h 30m 15s",
  "1 day 00:00:00",
];

const numbers = [86400, 3600, 1800, 7200, 0, -3600];

const SIZE = 1_000;
const strArray = Array.from({ length: SIZE }, (_, i) => `${i % 100} days ${(i % 24).toString().padStart(2, "0")}:00:00`);
const numArray = Array.from({ length: SIZE }, (_, i) => i * 3600);

for (let w = 0; w < WARMUP; w++) {
  for (const s of strings) toTimedelta(s);
  for (const n of numbers) toTimedelta(n, { unit: "s" });
  toTimedelta(strArray);
  toTimedelta(numArray, { unit: "s" });
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  for (let j = 0; j < 100; j++) {
    for (const s of strings) toTimedelta(s);
    for (const n of numbers) toTimedelta(n, { unit: "s" });
  }
  toTimedelta(strArray);
  toTimedelta(numArray, { unit: "s" });
  times.push(performance.now() - t0);
}

const total = times.reduce((a, b) => a + b, 0);
console.log(
  JSON.stringify({
    function: "to_timedelta_convert",
    mean_ms: round3(total / ITERATIONS),
    iterations: ITERATIONS,
    total_ms: round3(total),
  }),
);

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}
