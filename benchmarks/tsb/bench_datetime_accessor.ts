import { Series } from "tsb";
const N = 100_000;
const base = new Date("2020-01-01").getTime();
const day = 24 * 60 * 60 * 1000;
const dates = Array.from({ length: N }, (_, i) => new Date(base + i * day));
const s = new Series(dates);
const WARMUP = 3;
const ITERS = 20;
for (let i = 0; i < WARMUP; i++) {
  s.dt.year();
  s.dt.month();
  s.dt.dayofweek();
}
const t0 = performance.now();
for (let i = 0; i < ITERS; i++) {
  s.dt.year();
  s.dt.month();
  s.dt.dayofweek();
}
const total = performance.now() - t0;
console.log(JSON.stringify({ function: "datetime_accessor", mean_ms: total / ITERS, iterations: ITERS, total_ms: total }));
