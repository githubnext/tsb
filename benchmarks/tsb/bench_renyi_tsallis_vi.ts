import { renyiEntropy, tsallisEntropy, variationOfInformation } from "../../src/index.js";

const N = 1000;
const WARMUP = 5;
const ITERS = 50;

// Build a probability distribution of length N
const pk: number[] = Array.from({ length: N }, (_, i) => i + 1);

// Build joint distribution pairs for variationOfInformation
const xy: [number, number][] = Array.from({ length: N }, (_, i) => [i % 10, i % 7]);

// Warm up
for (let i = 0; i < WARMUP; i++) {
  renyiEntropy(pk, 2.0);
  tsallisEntropy(pk, 2.0);
  variationOfInformation(xy);
}

const start = performance.now();
for (let i = 0; i < ITERS; i++) {
  renyiEntropy(pk, 0.5);
  renyiEntropy(pk, 2.0);
  tsallisEntropy(pk, 0.5);
  tsallisEntropy(pk, 2.0);
  variationOfInformation(xy);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "renyi_tsallis_vi",
    mean_ms: total / ITERS,
    iterations: ITERS,
    total_ms: total,
  }),
);
