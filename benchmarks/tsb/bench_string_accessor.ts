/**
 * Benchmark: string_accessor — Series.str.split / replace / extract / join on 100k strings
 */
import { Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 15;

const words = ["apple", "banana", "cherry", "date", "elderberry"];
const data = Array.from({ length: ROWS }, (_, i) => `${words[i % 5]}-${i % 100}-suffix`);
const s = new Series({ data });

// pre-split series for join benchmark
const split = s.str.split("-");

for (let i = 0; i < WARMUP; i++) {
  s.str.split("-");
  s.str.replace("suffix", "end");
  s.str.extract("([a-z]+)-");
  split.str.join("_");
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.str.split("-");
  s.str.replace("suffix", "end");
  s.str.extract("([a-z]+)-");
  split.str.join("_");
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "string_accessor",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
