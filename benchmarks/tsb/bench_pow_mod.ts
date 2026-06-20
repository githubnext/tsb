/**
 * Benchmark: seriesPow, seriesMod, dataFramePow on 100k rows
 */
import { Series, DataFrame, seriesPow, seriesMod, dataFramePow } from "../../src/index.ts";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Array.from({ length: ROWS }, (_, i) => (i % 100) + 1);
const s = new Series({ data });

const dfData = {
  a: Array.from({ length: ROWS }, (_, i) => (i % 100) + 1),
  b: Array.from({ length: ROWS }, (_, i) => (i % 50) + 1),
};
const df = new DataFrame(dfData);

for (let i = 0; i < WARMUP; i++) {
  seriesPow(s, 2);
  seriesMod(s, 7);
  dataFramePow(df, 2);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  seriesPow(s, 2);
  seriesMod(s, 7);
  dataFramePow(df, 2);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "pow_mod",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
