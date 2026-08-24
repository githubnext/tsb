import { renyiEntropy, tsallisEntropy, jsDivergence, jsDistance, crossEntropy } from "../../src/index.js";

const N = 200;
const WARMUP = 5;
const ITERS = 50;

// Two probability distributions of length N
const p: number[] = Array.from({ length: N }, (_, i) => i + 1);
const q: number[] = Array.from({ length: N }, (_, i) => N - i);

for (let i = 0; i < WARMUP; i++) {
  renyiEntropy(p, 2);
  tsallisEntropy(p, 2);
  jsDivergence(p, q);
  jsDistance(p, q);
  crossEntropy(p, q);
}

const t0 = performance.now();
for (let i = 0; i < ITERS; i++) {
  renyiEntropy(p, 2);
  tsallisEntropy(p, 2);
  jsDivergence(p, q);
  jsDistance(p, q);
  crossEntropy(p, q);
}
const total_ms = performance.now() - t0;

console.log(
  JSON.stringify({
    function: "renyi_tsallis_entropy",
    mean_ms: total_ms / ITERS,
    iterations: ITERS,
    total_ms,
  }),
);
