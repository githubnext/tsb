/**
 * Benchmark: jsDivergence, jsDistance, crossEntropy, conditionalEntropy
 * from src/stats/information.ts — 1000-element probability distributions,
 * 50 iterations after 5 warm-up rounds.
 */
import {
  jsDivergence,
  jsDistance,
  crossEntropy,
  conditionalEntropy,
} from "../../src/index.js";

const N = 1000;
const WARMUP = 5;
const ITERS = 50;

// Two probability mass functions (unnormalized; the functions normalise internally)
const p: number[] = Array.from({ length: N }, (_, i) => i + 1);
const q: number[] = Array.from({ length: N }, (_, i) => N - i);

// Paired observations for conditionalEntropy: 20 categories each
const CATS = 20;
const pairs: [number, number][] = Array.from({ length: N }, (_, i) => [
  i % CATS,
  (i + 3) % CATS,
]);

for (let i = 0; i < WARMUP; i++) {
  jsDivergence(p, q);
  jsDistance(p, q);
  crossEntropy(p, q);
  conditionalEntropy(pairs);
}

const t0 = performance.now();
for (let i = 0; i < ITERS; i++) {
  jsDivergence(p, q);
  jsDistance(p, q);
  crossEntropy(p, q);
  conditionalEntropy(pairs);
}
const total_ms = performance.now() - t0;

console.log(
  JSON.stringify({
    function: "js_divergence",
    mean_ms: total_ms / ITERS,
    iterations: ITERS,
    total_ms,
  }),
);
