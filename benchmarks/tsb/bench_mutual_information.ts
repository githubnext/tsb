import { mutualInformation, normalizedMI } from "../../src/index.js";

const N = 1000;
const WARMUP = 5;
const ITERS = 50;

// Build paired observations: two correlated categorical variables (10 categories each)
const CATS = 10;
const pairs: [number, number][] = Array.from({ length: N }, (_, i) => [
  i % CATS,
  (i % CATS) + Math.floor(i / CATS) % 3,
]);

let t0 = performance.now();
for (let i = 0; i < WARMUP; i++) {
  mutualInformation(pairs);
  normalizedMI(pairs, "arithmetic");
}
t0 = performance.now();

for (let i = 0; i < ITERS; i++) {
  mutualInformation(pairs);
  normalizedMI(pairs, "arithmetic");
}
const total_ms = performance.now() - t0;

console.log(
  JSON.stringify({
    function: "mutual_information",
    mean_ms: total_ms / ITERS,
    iterations: ITERS,
    total_ms,
  }),
);
