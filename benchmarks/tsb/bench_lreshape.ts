/**
 * Benchmark: lreshape — wide-to-long reshape using named column groups.
 * Dataset: 10,000 rows with 4 value columns (v1..v4), 50 iterations.
 */
import { DataFrame, lreshape } from "../../src/index.js";

const N = 10_000;
const WARMUP = 3;
const ITERATIONS = 50;

const ids = Array.from({ length: N }, (_, i) => i);
const v1 = Array.from({ length: N }, (_, i) => i * 1.0);
const v2 = Array.from({ length: N }, (_, i) => i * 2.0);
const v3 = Array.from({ length: N }, (_, i) => i * 3.0);
const v4 = Array.from({ length: N }, (_, i) => i * 4.0);

const df = DataFrame.fromColumns({ id: ids, v1, v2, v3, v4 });
const groups = { value: ["v1", "v2", "v3", "v4"] };

for (let i = 0; i < WARMUP; i++) {
  lreshape(df, groups);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  lreshape(df, groups);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "lreshape",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
