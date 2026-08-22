import { crossEntropy, jointEntropy, conditionalEntropy } from "../../src/index.js";

const N = 100;
const WARMUP = 5;
const ITERS = 50;

// Two probability distributions of length N
const p: number[] = Array.from({ length: N }, (_, i) => i + 1);
const q: number[] = Array.from({ length: N }, (_, i) => N - i);

// Paired observations for joint/conditional entropy
type Pair = readonly [string, string];
const labels = ["a", "b", "c", "d"] as const;
const obs: Pair[] = Array.from({ length: 1000 }, (_, i) => [
  labels[i % 4],
  labels[(i * 3) % 4],
] as Pair);

for (let i = 0; i < WARMUP; i++) {
  crossEntropy(p, q);
  jointEntropy(obs);
  conditionalEntropy(obs);
}

const t0 = performance.now();
for (let i = 0; i < ITERS; i++) {
  crossEntropy(p, q);
  jointEntropy(obs);
  conditionalEntropy(obs);
}
const total_ms = performance.now() - t0;

console.log(
  JSON.stringify({
    function: "cross_joint_conditional_entropy",
    mean_ms: total_ms / ITERS,
    iterations: ITERS,
    total_ms,
  }),
);
