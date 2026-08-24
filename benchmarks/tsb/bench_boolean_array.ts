/**
 * Benchmark: BooleanArray — nullable boolean extension array operations.
 * N=100_000 elements with ~10% nulls. Tests from/any/all/sum/and/or/not/fillna.
 */
import { arrays } from "../../src/index.js";

const N = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

// Build input with ~10% nulls (same pattern across TS and Python)
const raw: (boolean | null)[] = Array.from({ length: N }, (_, i) =>
  i % 10 === 0 ? null : i % 3 !== 0,
);

// Build a second array for bitwise ops
const raw2: (boolean | null)[] = Array.from({ length: N }, (_, i) =>
  i % 7 === 0 ? null : i % 2 === 0,
);

function run(): void {
  const a = arrays.BooleanArray.from(raw);
  const b = arrays.BooleanArray.from(raw2);
  a.any();
  a.all();
  a.sum();
  a.and(b);
  a.or(b);
  a.not();
  a.fillna(false);
}

for (let i = 0; i < WARMUP; i++) run();

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) run();
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "boolean_array",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
