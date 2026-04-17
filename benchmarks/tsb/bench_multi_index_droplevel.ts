/**
 * Benchmark: MultiIndex droplevel, reorderLevels, and setNames
 */
import { MultiIndex } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const a = Array.from({ length: ROWS }, (_, i) => `a${i % 100}`);
const b = Array.from({ length: ROWS }, (_, i) => i % 1000);
const c = Array.from({ length: ROWS }, (_, i) => i % 50);
const tuples: [string, number, number][] = a.map((v, i) => [v, b[i], c[i]]);
const mi = new MultiIndex({ tuples, names: ["x", "y", "z"] });

for (let i = 0; i < WARMUP; i++) {
  mi.droplevel(0);
  mi.reorderLevels([2, 1, 0]);
  mi.setNames(["a", "b", "c"]);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  mi.droplevel(0);
  mi.reorderLevels([2, 1, 0]);
  mi.setNames(["a", "b", "c"]);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "multi_index_droplevel",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
