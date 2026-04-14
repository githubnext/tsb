import { dataFrameWhere } from "tsb";
import { DataFrame } from "tsb";
const N = 100_000;
const cols = 4;
const data: Record<string, number[]> = {};
for (let c = 0; c < cols; c++) {
  data[`col${c}`] = Array.from({ length: N }, (_, i) => (i % 200) - 100);
}
const df = new DataFrame(data);
const mask = Array.from({ length: N }, (_, i) => i % 2 === 0);
const WARMUP = 3;
const ITERS = 20;
for (let i = 0; i < WARMUP; i++) dataFrameWhere(df, mask, { other: 0 });
const t0 = performance.now();
for (let i = 0; i < ITERS; i++) dataFrameWhere(df, mask, { other: 0 });
const total = performance.now() - t0;
console.log(JSON.stringify({ function: "dataframe_where", mean_ms: total / ITERS, iterations: ITERS, total_ms: total }));
