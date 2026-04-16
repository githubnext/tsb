import { dataFrameClip } from "tsb";
import { DataFrame } from "tsb";
const N = 100_000;
const cols = 5;
const data: Record<string, number[]> = {};
for (let c = 0; c < cols; c++) {
  data[`col${c}`] = Array.from({ length: N }, (_, i) => (i % 200) - 100);
}
const df = new DataFrame(data);
const WARMUP = 3;
const ITERS = 20;
for (let i = 0; i < WARMUP; i++) dataFrameClip(df, { lower: -50, upper: 50 });
const t0 = performance.now();
for (let i = 0; i < ITERS; i++) dataFrameClip(df, { lower: -50, upper: 50 });
const total = performance.now() - t0;
console.log(JSON.stringify({ function: "dataframe_clip", mean_ms: total / ITERS, iterations: ITERS, total_ms: total }));
