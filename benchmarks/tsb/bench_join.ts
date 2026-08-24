/**
 * Benchmark: join — index-based left join of two 30k-row DataFrames
 */
import { DataFrame, join } from "../../src/index.js";

const ROWS = 30_000;
const WARMUP = 2;
const ITERATIONS = 5;

// Build two DataFrames with overlapping index labels
const idxLeft = Array.from({ length: ROWS }, (_, i) => `k${i}`);
const idxRight = Array.from({ length: ROWS }, (_, i) => `k${i % (ROWS / 2)}`);
const valA = Array.from({ length: ROWS }, (_, i) => i * 1.5);
const valB = Array.from({ length: ROWS / 2 }, (_, i) => i * 2.5);

const left = DataFrame.fromColumns({ A: valA }, { index: idxLeft });
const right = DataFrame.fromColumns({ B: valB }, { index: idxRight.slice(0, ROWS / 2) });

for (let i = 0; i < WARMUP; i++) {
  join(left, right, { how: "left" });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  join(left, right, { how: "left" });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "join",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
