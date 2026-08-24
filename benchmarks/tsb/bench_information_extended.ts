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

const N = 1000;
const WARMUP = 5;
const ITERS = 50;

// Build a simple probability mass function (PMF) of length 100
const BINS = 100;
const pk: number[] = Array.from({ length: BINS }, (_, i) => i + 1);
const total = pk.reduce((a, b) => a + b, 0);
const pkNorm = pk.map((v) => v / total);
const qkNorm = pk
  .slice()
  .reverse()
  .map((v) => v / total);

// Paired observations for joint/conditional entropy
const CATS = 10;
const pairs: [number, number][] = Array.from({ length: N }, (_, i) => [
  i % CATS,
  (i % CATS + Math.floor(i / CATS)) % CATS,
]);

// Warm up
for (let i = 0; i < WARMUP; i++) {
  jsDivergence(pkNorm, qkNorm);
  jsDistance(pkNorm, qkNorm);
  crossEntropy(pkNorm, qkNorm);
  renyiEntropy(pkNorm, 2);
  tsallisEntropy(pkNorm, 2);
  jointEntropy(pairs);
  conditionalEntropy(pairs);
  variationOfInformation(pairs);
}

const t0 = performance.now();
for (let i = 0; i < ITERS; i++) {
  jsDivergence(pkNorm, qkNorm);
  jsDistance(pkNorm, qkNorm);
  crossEntropy(pkNorm, qkNorm);
  renyiEntropy(pkNorm, 2);
  tsallisEntropy(pkNorm, 2);
  jointEntropy(pairs);
  conditionalEntropy(pairs);
  variationOfInformation(pairs);
}
const total_ms = performance.now() - t0;

console.log(
  JSON.stringify({
    function: "information_extended",
    mean_ms: total_ms / ITERS,
    iterations: ITERS,
    total_ms,
  }),
);
