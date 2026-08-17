import {
  jsDivergence,
  jsDistance,
  crossEntropy,
  renyiEntropy,
  tsallisEntropy,
  jointEntropy,
  conditionalEntropy,
  variationOfInformation,
} from "../../src/index.js";

const N = 200;
const WARMUP = 5;
const ITERS = 50;

// Two probability distributions of length N
const p: number[] = Array.from({ length: N }, (_, i) => i + 1);
const q: number[] = Array.from({ length: N }, (_, i) => N - i);

// Paired observations for joint/conditional/variation metrics
const CATS = 20;
const pairs: [number, number][] = Array.from({ length: 2000 }, (_, i) => [
  i % CATS,
  (i % CATS) + (Math.floor(i / CATS) % 5),
]);

let t0 = performance.now();
for (let i = 0; i < WARMUP; i++) {
  jsDivergence(p, q);
  jsDistance(p, q);
  crossEntropy(p, q);
  renyiEntropy(p, 2);
  tsallisEntropy(p, 2);
  jointEntropy(pairs);
  conditionalEntropy(pairs);
  variationOfInformation(pairs);
}
t0 = performance.now();

for (let i = 0; i < ITERS; i++) {
  jsDivergence(p, q);
  jsDistance(p, q);
  crossEntropy(p, q);
  renyiEntropy(p, 2);
  tsallisEntropy(p, 2);
  jointEntropy(pairs);
  conditionalEntropy(pairs);
  variationOfInformation(pairs);
}
const total_ms = performance.now() - t0;

console.log(
  JSON.stringify({
    function: "information_divergence",
    mean_ms: total_ms / ITERS,
    iterations: ITERS,
    total_ms,
  }),
);
