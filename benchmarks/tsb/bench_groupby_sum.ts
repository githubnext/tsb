import { DataFrame, DataFrameGroupBy } from "tsb";
const N = 100_000;
const keys = ["A", "B", "C", "D", "E"];
const df = new DataFrame({
  key: Array.from({ length: N }, (_, i) => keys[i % keys.length]),
  val: Array.from({ length: N }, (_, i) => i * 1.0),
  val2: Array.from({ length: N }, (_, i) => i % 200),
});
const gbObj = new DataFrameGroupBy(df, ["key"]);
const WARMUP = 3;
const ITERS = 20;
for (let i = 0; i < WARMUP; i++) gbObj.sum();
const t0 = performance.now();
for (let i = 0; i < ITERS; i++) gbObj.sum();
const total = performance.now() - t0;
console.log(JSON.stringify({ function: "groupby_sum", mean_ms: total / ITERS, iterations: ITERS, total_ms: total }));
