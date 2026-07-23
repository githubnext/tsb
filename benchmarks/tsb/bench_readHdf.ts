/**
 * Benchmark: readHdf / toHdf — HDF5 round-trip on a 10k-row DataFrame
 */
import { DataFrame } from "../../src/index.js";
import { readHdf, toHdf } from "../../src/index.js";

const ROWS = 10_000;
const WARMUP = 3;
const ITERATIONS = 20;

// Build a DataFrame with mixed numeric and string columns
const ids = new Array<number>(ROWS).fill(0).map((_, i) => i);
const values = new Array<number>(ROWS).fill(0).map((_, i) => i * 1.23456);
const flags = new Array<number>(ROWS).fill(0).map((_, i) => i % 2);

const df = DataFrame.fromColumns({
  id: ids,
  value: values,
  flag: flags,
});

// Pre-serialise once so both readHdf and toHdf are benchmarked together
const buf = toHdf(df);

for (let i = 0; i < WARMUP; i++) {
  const out = toHdf(df);
  readHdf(out);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  const out = toHdf(df);
  readHdf(out);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "readHdf",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
