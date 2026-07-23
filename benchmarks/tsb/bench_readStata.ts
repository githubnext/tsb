/**
 * Benchmark: readStata / toStata round-trip on a 10k-row DataFrame
 */
import { DataFrame, Series, readStata, toStata } from "../../src/index.js";

const ROWS = 10_000;
const WARMUP = 3;
const ITERATIONS = 20;

// Build a DataFrame with numeric and string columns
const ids = Int32Array.from({ length: ROWS }, (_, i) => i);
const values = Float64Array.from({ length: ROWS }, (_, i) => Math.sin(i * 0.01) * 1000);
const categories = Array.from({ length: ROWS }, (_, i) => `cat_${i % 5}`);

const df = new DataFrame({
  id: new Series(ids),
  value: new Series(values),
  category: new Series(categories),
});

// Serialize once so readStata benchmarks read from a pre-built buffer
const buf = toStata(df);

// Warm up
for (let i = 0; i < WARMUP; i++) {
  readStata(buf);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  readStata(buf);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "readStata",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
