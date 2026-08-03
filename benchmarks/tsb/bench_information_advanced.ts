/**
 * Benchmark: advanced information theory functions.
 * Covers: jsDivergence, jsDistance, crossEntropy, renyiEntropy, tsallisEntropy,
 *         jointEntropy, conditionalEntropy, normalizedMI, variationOfInformation.
 * Mirrors the corresponding scipy.stats / custom-numpy Python benchmarks.
 * Outputs JSON: {"function": "...", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import {
  jsDivergence,
  jsDistance,
  crossEntropy,
  renyiEntropy,
  tsallisEntropy,
  jointEntropy,
  conditionalEntropy,
  normalizedMI,
  variationOfInformation,
} from "../../src/index.js";

const N = 200;
const WARMUP = 5;
const ITERS = 50;

// Two probability distributions of length N
const p: number[] = Array.from({ length: N }, (_, i) => i + 1);
const q: number[] = Array.from({ length: N }, (_, i) => N - i);

// Paired observations for joint/conditional entropy functions
const obs: [string, string][] = Array.from({ length: 1000 }, (_, i) => [
  `c${i % 5}`,
  `d${i % 4}`,
]);

for (let i = 0; i < WARMUP; i++) {
  jsDivergence(p, q);
  jsDistance(p, q);
  crossEntropy(p, q);
  renyiEntropy(p, 0.5);
  tsallisEntropy(p, 2);
  jointEntropy(obs);
  conditionalEntropy(obs);
  normalizedMI(obs);
  variationOfInformation(obs);
}

const t0 = performance.now();
for (let i = 0; i < ITERS; i++) {
  jsDivergence(p, q);
  jsDistance(p, q);
  crossEntropy(p, q);
  renyiEntropy(p, 0.5);
  tsallisEntropy(p, 2);
  jointEntropy(obs);
  conditionalEntropy(obs);
  normalizedMI(obs);
  variationOfInformation(obs);
}
const total_ms = performance.now() - t0;

console.log(
  JSON.stringify({
    function: "information_advanced",
    mean_ms: total_ms / ITERS,
    iterations: ITERS,
    total_ms,
  }),
);
