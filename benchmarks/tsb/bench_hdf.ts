/**
 * Benchmark: readHdf / toHdf — HDF5 round-trip on 5k rows.
 * DataFrame with int, float, and string columns.
 */
import { DataFrame, toHdf, readHdf } from "../../src/index.js";

const ROWS = 5_000;
const WARMUP = 3;
const ITERATIONS = 20;

const ids = Array.from({ length: ROWS }, (_, i) => i);
const values = Array.from({ length: ROWS }, (_, i) => i * 1.1);
const labels = Array.from({ length: ROWS }, (_, i) => `cat_${i % 50}`);

const df = new DataFrame({ id: ids, value: values, label: labels });

for (let i = 0; i < WARMUP; i++) {
  const buf = toHdf(df);
  readHdf(buf);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  const buf = toHdf(df);
  readHdf(buf);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "hdf",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
