/**
 * Benchmark: MaskedArray — base nullable array operations via IntegerArray.
 * N=100_000 elements with ~10% nulls. Tests isna/notna/hasNa/at/toArray/dropna/fillna.
 */
import { arrays } from "../../src/index.js";

const N = 100_000;
const WARMUP = 3;
const ITERATIONS = 20;

const raw: (number | null)[] = Array.from({ length: N }, (_, i) =>
  i % 10 === 0 ? null : (i % 1000) - 500,
);

function run() {
  const a = arrays.IntegerArray.from(raw, "Int32");
  a.isna();
  a.notna();
  a.hasNa();
  a.at(42);
  a.toArray();
  a.dropna();
  a.fillna(0);
}

for (let i = 0; i < WARMUP; i++) {
  run();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  run();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "masked_array",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
