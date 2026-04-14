import { dataFrameValueCounts } from "tsb";
import { DataFrame } from "tsb";
const N = 100_000;
const cats = ["apple", "banana", "cherry", "date", "elderberry"];
const df = new DataFrame({
  fruit: Array.from({ length: N }, (_, i) => cats[i % cats.length]),
  color: Array.from({ length: N }, (_, i) => (i % 3 === 0 ? "red" : i % 3 === 1 ? "yellow" : "purple")),
});
const WARMUP = 3;
const ITERS = 20;
for (let i = 0; i < WARMUP; i++) dataFrameValueCounts(df, { subset: ["fruit", "color"] });
const t0 = performance.now();
for (let i = 0; i < ITERS; i++) dataFrameValueCounts(df, { subset: ["fruit", "color"] });
const total = performance.now() - t0;
console.log(JSON.stringify({ function: "dataframe_value_counts", mean_ms: total / ITERS, iterations: ITERS, total_ms: total }));
