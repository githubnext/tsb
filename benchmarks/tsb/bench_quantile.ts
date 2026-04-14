import { quantile } from "tsb";
const N = 100_000;
const sorted = Array.from({ length: N }, (_, i) => i * 0.001);
const WARMUP = 3;
const ITERS = 20;
for (let i = 0; i < WARMUP; i++) {
  quantile(sorted, 0.25);
  quantile(sorted, 0.5);
  quantile(sorted, 0.75);
}
const t0 = performance.now();
for (let i = 0; i < ITERS; i++) {
  quantile(sorted, 0.25);
  quantile(sorted, 0.5);
  quantile(sorted, 0.75);
}
const total = performance.now() - t0;
console.log(JSON.stringify({ function: "quantile", mean_ms: total / ITERS, iterations: ITERS, total_ms: total }));
