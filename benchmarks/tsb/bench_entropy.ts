import { entropy, klDivergence } from "../../src/index.js";

const N = 100;
const WARMUP = 5;
const ITERS = 50;

// Build two probability distributions of length N
const p: number[] = Array.from({ length: N }, (_, i) => i + 1);
const q: number[] = Array.from({ length: N }, (_, i) => N - i);

let t0 = performance.now();
for (let i = 0; i < WARMUP; i++) {
  entropy(p);
  klDivergence(p, q);
}
t0 = performance.now();

for (let i = 0; i < ITERS; i++) {
  entropy(p);
  klDivergence(p, q);
}
const total_ms = performance.now() - t0;

console.log(
  JSON.stringify({
    function: "entropy_klDivergence",
    mean_ms: total_ms / ITERS,
    iterations: ITERS,
    total_ms,
  }),
);
