/**
 * Benchmark: isScalar, isListLike, isArrayLike, isDictLike, isIterator on mixed values
 */
import { isScalar, isListLike, isArrayLike, isDictLike, isIterator } from "../../src/index.js";

const ITERATIONS = 100_000;
const WARMUP = 3;
const MEASURED = 10;

const values = [42, "hello", null, [1, 2, 3], { a: 1 }, new Set([1, 2]), new Map()];

function runChecks(): void {
  for (const v of values) {
    isScalar(v);
    isListLike(v);
    isArrayLike(v);
    isDictLike(v);
    isIterator(v);
  }
}

for (let i = 0; i < WARMUP; i++) for (let j = 0; j < ITERATIONS; j++) runChecks();
const start = performance.now();
for (let i = 0; i < MEASURED; i++) for (let j = 0; j < ITERATIONS; j++) runChecks();
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "type_checks",
    mean_ms: total / MEASURED,
    iterations: MEASURED,
    total_ms: total,
  }),
);
