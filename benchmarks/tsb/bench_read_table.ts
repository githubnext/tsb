/**
 * Benchmark: readTable — parse a 100k-row tab-separated string
 */
import { readTable } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 2;
const ITERATIONS = 5;

// Build TSV string (tab-separated)
const lines = ["id\tvalue\tlabel"];
for (let i = 0; i < ROWS; i++) {
  lines.push(`${i}\t${(i * 1.1).toFixed(4)}\tcat_${i % 50}`);
}
const tsvContent = lines.join("\n");

for (let i = 0; i < WARMUP; i++) {
  readTable(tsvContent);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  readTable(tsvContent);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "read_table",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
