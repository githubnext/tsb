import { fillna, dropna } from "tsb";
import { Series } from "tsb";
const N = 100_000;
const data: (number | null)[] = Array.from({ length: N }, (_, i) => (i % 7 === 0 ? null : i * 1.5));
const s = new Series(data);
const WARMUP = 3;
const ITERS = 20;
for (let i = 0; i < WARMUP; i++) {
  fillna(s, { value: 0 });
  dropna(s);
}
const t0 = performance.now();
for (let i = 0; i < ITERS; i++) {
  fillna(s, { value: 0 });
  dropna(s);
}
const total = performance.now() - t0;
console.log(JSON.stringify({ function: "fillna_dropna", mean_ms: total / ITERS, iterations: ITERS, total_ms: total }));
