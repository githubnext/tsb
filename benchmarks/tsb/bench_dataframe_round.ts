import { DataFrame } from "tsb";
const N = 100_000;
const cols = 5;
const data: Record<string, number[]> = {};
for (let c = 0; c < cols; c++) {
  data[`col${c}`] = Array.from({ length: N }, (_, i) => (i % 100) * 1.5);
}
const df = new DataFrame(data);
const WARMUP = 3;
const ITERS = 20;
for (let i = 0; i < WARMUP; i++) df.round(2);
const t0 = performance.now();
for (let i = 0; i < ITERS; i++) df.round(2);
const total = performance.now() - t0;
console.log(JSON.stringify({ function: "dataframe_round", mean_ms: total / ITERS, iterations: ITERS, total_ms: total }));
