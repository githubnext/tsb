/**
 * Benchmark: seriesAt, seriesIat, dataFrameAt, dataFrameIat — fast scalar access
 * Outputs JSON: {"function": "at_iat", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, DataFrame, seriesAt, seriesIat, dataFrameAt, dataFrameIat } from "../../src/index.ts";

const N = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const labels = Array.from({ length: N }, (_, i) => `r${i}`);
const values = Array.from({ length: N }, (_, i) => i * 1.5);

const s = new Series<number>({ data: values, index: labels });
const df = DataFrame.fromColumns(
  { a: values, b: values.map((v) => v * 2) },
  { index: labels },
);

const midLabel = `r${Math.floor(N / 2)}`;

for (let i = 0; i < WARMUP; i++) {
  seriesAt(s, midLabel);
  seriesIat(s, N / 2);
  dataFrameAt(df, midLabel, "a");
  dataFrameIat(df, N / 2, 0);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  seriesAt(s, midLabel);
  seriesIat(s, N / 2);
  dataFrameAt(df, midLabel, "a");
  dataFrameIat(df, N / 2, 0);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "at_iat",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
