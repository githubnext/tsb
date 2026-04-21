/**
 * Benchmark: toDateInput — convert ISO strings, timestamps, and Date objects to Date.
 * Mirrors pandas pd.Timestamp() single-value date parsing.
 * Outputs JSON: {"function": "to_date_input", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { toDateInput } from "../../src/index.ts";

const WARMUP = 5;
const ITERATIONS = 50;

const isoStrings = [
  "2020-01-01",
  "2024-03-15T10:30:00Z",
  "2023-12-31T23:59:59.999Z",
  "2022-07-04",
  "2021-01-01T00:00:00",
];

const timestamps = [
  0,
  1_577_836_800_000, // 2020-01-01
  1_704_067_200_000, // 2024-01-01
  1_609_459_200_000, // 2021-01-01
  1_672_531_200_000, // 2023-01-01
];

const dateObjects = [
  new Date("2020-01-01"),
  new Date("2024-06-15"),
  new Date(1_000_000_000_000),
];

const SIZE = 10_000;
const strBatch = Array.from({ length: SIZE }, (_, i) => {
  const y = 2000 + (i % 25);
  const m = (i % 12) + 1;
  const d = (i % 28) + 1;
  return `${y}-${m.toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
});
const numBatch = Array.from({ length: SIZE }, (_, i) => i * 86_400_000);

for (let w = 0; w < WARMUP; w++) {
  for (const s of isoStrings) toDateInput(s);
  for (const t of timestamps) toDateInput(t);
  for (const d of dateObjects) toDateInput(d);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  for (let j = 0; j < 1000; j++) {
    for (const s of isoStrings) toDateInput(s);
    for (const t of timestamps) toDateInput(t);
    for (const d of dateObjects) toDateInput(d);
  }
  for (const s of strBatch) toDateInput(s);
  for (const t of numBatch) toDateInput(t);
  times.push(performance.now() - t0);
}

const total = times.reduce((a, b) => a + b, 0);
console.log(
  JSON.stringify({
    function: "to_date_input",
    mean_ms: round3(total / ITERATIONS),
    iterations: ITERATIONS,
    total_ms: round3(total),
  }),
);

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}
