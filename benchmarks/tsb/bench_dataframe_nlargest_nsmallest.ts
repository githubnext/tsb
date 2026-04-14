import { nlargestDataFrame, nsmallestDataFrame } from "tsb";
import { DataFrame } from "tsb";
const N = 100_000;
const df = new DataFrame({
  a: Array.from({ length: N }, (_, i) => (i * 1337) % 100_007),
  b: Array.from({ length: N }, (_, i) => (i * 7919) % 100_003),
  c: Array.from({ length: N }, (_, i) => (i * 3571) % 99_991),
});
const WARMUP = 3;
const ITERS = 20;
for (let i = 0; i < WARMUP; i++) {
  nlargestDataFrame(df, 100, "a");
  nsmallestDataFrame(df, 100, "a");
}
const t0 = performance.now();
for (let i = 0; i < ITERS; i++) {
  nlargestDataFrame(df, 100, "a");
  nsmallestDataFrame(df, 100, "a");
}
const total = performance.now() - t0;
console.log(JSON.stringify({ function: "dataframe_nlargest_nsmallest", mean_ms: total / ITERS, iterations: ITERS, total_ms: total }));
