/**
 * Benchmark: jsonNormalize — flatten nested JSON to a flat DataFrame.
 * Outputs JSON: {"function": "json_normalize", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { jsonNormalize } from "../../src/index.ts";

const SIZE = 1_000;
const WARMUP = 5;
const ITERATIONS = 50;

const records = Array.from({ length: SIZE }, (_, i) => ({
  id: i,
  name: `user_${i}`,
  address: { city: `city_${i % 10}`, zip: `${10000 + i}` },
  scores: [i, i + 1, i + 2],
}));

for (let i = 0; i < WARMUP; i++) {
  jsonNormalize(records, { maxLevel: 2 });
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  jsonNormalize(records, { maxLevel: 2 });
  times.push(performance.now() - start);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "json_normalize",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
