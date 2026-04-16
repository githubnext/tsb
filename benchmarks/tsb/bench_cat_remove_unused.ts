/**
 * Benchmark: cat_remove_unused — CategoricalAccessor.removeUnusedCategories() on 100k-element Series
 */
import { Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const cats = ["a", "b", "c"];
const base = new Series({ data: Array.from({ length: ROWS }, (_, i) => cats[i % cats.length]) });
// Add extra categories that are unused so removeUnusedCategories has work to do
const s = base.cat.addCategories(["x", "y", "z"]);

for (let i = 0; i < WARMUP; i++) {
  s.cat.removeUnusedCategories();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.cat.removeUnusedCategories();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "cat_remove_unused",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
