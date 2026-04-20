/**
 * Benchmark: fillnaDataFrame with ColumnFillMap — per-column fill values.
 * Outputs JSON: {"function": "fillna_col_map", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, Series, fillnaDataFrame } from "../../src/index.ts";

const ROWS = 50_000;
const WARMUP = 5;
const ITERATIONS = 30;

function seededRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

const rand = seededRand(42);

// Build a DataFrame with ~20% NaN in each column
const colA = Array.from({ length: ROWS }, () => (rand() < 0.2 ? null : rand() * 100));
const colB = Array.from({ length: ROWS }, () => (rand() < 0.2 ? null : rand() * 50));
const colC = Array.from({ length: ROWS }, () => (rand() < 0.2 ? null : rand() * 200));

const df = new DataFrame({ a: colA, b: colB, c: colC });

// Per-column fill values
const fillMap: Record<string, number> = { a: 0, b: -1, c: 99 };

for (let i = 0; i < WARMUP; i++) {
  fillnaDataFrame(df, { value: fillMap });
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  fillnaDataFrame(df, { value: fillMap });
  times.push(performance.now() - t0);
}

const total_ms = times.reduce((a, b) => a + b, 0);
console.log(
  JSON.stringify({
    function: "fillna_col_map",
    mean_ms: Math.round((total_ms / ITERATIONS) * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(total_ms * 1000) / 1000,
  }),
);
