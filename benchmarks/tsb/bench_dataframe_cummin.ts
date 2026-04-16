import { dataFrameCummin } from "tsb";
import { DataFrame } from "tsb";
const N = 100_000;
const cols = 4;
const data: Record<string, number[]> = {};
for (let c = 0; c < cols; c++) {
  data[`col${c}`] = Array.from({ length: N }, (_, i) => (i % 100) * 1.0);
}
const df = new DataFrame(data);
const WARMUP = 3;
const ITERS = 20;
for (let i = 0; i < WARMUP; i++) dataFrameCummin(df);
const t0 = performance.now();
for (let i = 0; i < ITERS; i++) dataFrameCummin(df);
const total = performance.now() - t0;
console.log(JSON.stringify({ function: "dataframe_cummin", mean_ms: total / ITERS, iterations: ITERS, total_ms: total }));
