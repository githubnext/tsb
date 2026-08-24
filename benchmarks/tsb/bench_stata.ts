/**
 * Benchmark: readStata / toStata — Stata .dta file I/O round-trip
 *
 * Creates a 500-row DataFrame with mixed columns (int, float, string),
 * then benchmarks:
 *   - toStata (DataFrame → Uint8Array .dta buffer)
 *   - readStata (Uint8Array .dta buffer → DataFrame)
 * Dataset: 500 rows × 4 columns; 3 warm-up + 20 measured iterations each.
 * Outputs JSON: {"function": "stata", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { readStata, toStata, DataFrame, Series } from "../../src/index.js";

const ROWS = 500;
const WARMUP = 3;
const ITERATIONS = 20;

const ids = Array.from({ length: ROWS }, (_, i) => i);
const values = Array.from({ length: ROWS }, (_, i) => i * 1.1);
const scores = Array.from({ length: ROWS }, (_, i) => (i % 100) * 0.5);
const labels = Array.from({ length: ROWS }, (_, i) => `cat_${i % 20}`);

const df = new DataFrame({
  id: new Series(ids),
  value: new Series(values),
  score: new Series(scores),
  label: new Series(labels),
});

// Warm up
for (let i = 0; i < WARMUP; i++) {
  const buf = toStata(df);
  readStata(buf);
}

// Benchmark toStata
const t0 = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  toStata(df);
}
const writeTotal = performance.now() - t0;

// Pre-generate buffer for readStata benchmark
const buf = toStata(df);

// Benchmark readStata
const t1 = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  readStata(buf);
}
const readTotal = performance.now() - t1;

const total = writeTotal + readTotal;

console.log(
  JSON.stringify({
    function: "stata",
    mean_ms: total / (ITERATIONS * 2),
    iterations: ITERATIONS * 2,
    total_ms: total,
    write_mean_ms: writeTotal / ITERATIONS,
    read_mean_ms: readTotal / ITERATIONS,
  }),
);
