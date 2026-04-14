import { DataFrame, DataFrameGroupBy } from "tsb";
const N = 100_000;
const keys = ["A", "B", "C", "D", "E"];
const df = new DataFrame({
  key: Array.from({ length: N }, (_, i) => keys[i % keys.length]),
  val: Array.from({ length: N }, (_, i) => i * 0.5),
  val2: Array.from({ length: N }, (_, i) => i % 100),
});
const gbObj = new DataFrameGroupBy(df, ["key"]);
const WARMUP = 3;
const ITERS = 20;
for (let i = 0; i < WARMUP; i++) gbObj.first();
const t0 = performance.now();
for (let i = 0; i < ITERS; i++) gbObj.first();
const total = performance.now() - t0;
console.log(JSON.stringify({ function: "groupby_first", mean_ms: total / ITERS, iterations: ITERS, total_ms: total }));
