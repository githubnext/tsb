/**
 * Benchmark: normalizedMI with all four normalization methods
 * — arithmetic, geometric, min, max —
 * on 1000 paired categorical observations (10 categories each).
 */
import { normalizedMI } from "../../src/index.js";

const N = 1000;
const WARMUP = 5;
const ITERS = 50;
const CATS = 10;

const pairs: [number, number][] = Array.from({ length: N }, (_, i) => [
  i % CATS,
  (i % CATS + Math.floor(i / CATS) % 3) % CATS,
]);

let t0 = performance.now();
for (let i = 0; i < WARMUP; i++) {
  normalizedMI(pairs, "arithmetic");
  normalizedMI(pairs, "geometric");
  normalizedMI(pairs, "min");
  normalizedMI(pairs, "max");
}
t0 = performance.now();

for (let i = 0; i < ITERS; i++) {
  normalizedMI(pairs, "arithmetic");
  normalizedMI(pairs, "geometric");
  normalizedMI(pairs, "min");
  normalizedMI(pairs, "max");
}
const total_ms = performance.now() - t0;

console.log(
  JSON.stringify({
    function: "normalized_mi",
    mean_ms: total_ms / ITERS,
    iterations: ITERS,
    total_ms,
  }),
);
