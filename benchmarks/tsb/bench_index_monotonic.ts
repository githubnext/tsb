/**
 * Benchmark: Index.isMonotonicIncreasing, isMonotonicDecreasing, isUnique on 100k-element Index
 */
import { Index } from "../../src/index.js";

const N = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;
const incData = Array.from({ length: N }, (_, i) => i);
const decData = Array.from({ length: N }, (_, i) => N - i);
const idxInc = new Index(incData);
const idxDec = new Index(decData);

for (let i = 0; i < WARMUP; i++) {
  idxInc.isMonotonicIncreasing;
  idxDec.isMonotonicDecreasing;
  idxInc.isUnique;
}
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  idxInc.isMonotonicIncreasing;
  idxDec.isMonotonicDecreasing;
  idxInc.isUnique;
}
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "index_monotonic",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
