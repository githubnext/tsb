/**
 * Benchmark: readFwf — parse a fixed-width formatted text file into a DataFrame.
 * Dataset: 10,000 rows × 4 columns (id, name, value, flag).
 */
import { readFwf } from "../../src/index.js";

const ROWS = 10_000;
const WARMUP = 3;
const ITERATIONS = 10;

// Build a fixed-width text: id(6), name(10), value(10), flag(4)
const lines: string[] = ["id    name      value     flag"];
for (let i = 0; i < ROWS; i++) {
  const id = String(i).padStart(6);
  const name = ("item" + (i % 500)).padEnd(10);
  const value = (Math.sin(i * 0.01) * 1000).toFixed(3).padStart(10);
  const flag = (i % 2 === 0 ? "Y" : "N").padEnd(4);
  lines.push(id + name + value + flag);
}
const text = lines.join("\n");

for (let i = 0; i < WARMUP; i++) {
  readFwf(text, { colspecs: [[0, 6], [6, 16], [16, 26], [26, 30]] });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  readFwf(text, { colspecs: [[0, 6], [6, 16], [16, 26], [26, 30]] });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "readFwf",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
