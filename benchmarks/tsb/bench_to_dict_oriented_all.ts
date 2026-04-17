/**
 * Benchmark: toDictOriented with records, list, split, dict orientations on 10k-row DataFrame
 */
import { DataFrame, toDictOriented } from "../../src/index.js";

const ROWS = 10_000;
const WARMUP = 3;
const ITERATIONS = 10;
const a = Array.from({ length: ROWS }, (_, i) => i);
const b = Array.from({ length: ROWS }, (_, i) => i * 1.5);
const c = Array.from({ length: ROWS }, (_, i) => `s${i}`);
const df = new DataFrame({ columns: { a, b, c } });

for (let i = 0; i < WARMUP; i++) {
  toDictOriented(df, "records");
  toDictOriented(df, "list");
  toDictOriented(df, "split");
}
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  toDictOriented(df, "records");
  toDictOriented(df, "list");
  toDictOriented(df, "split");
}
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "to_dict_oriented_all",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
