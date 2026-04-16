import { makeFloatFormatter, makePercentFormatter, makeCurrencyFormatter } from "tsb";
const WARMUP = 3;
const ITERS = 10_000;
for (let i = 0; i < WARMUP; i++) {
  makeFloatFormatter(2);
  makePercentFormatter(1);
  makeCurrencyFormatter("$", 2);
}
const t0 = performance.now();
for (let i = 0; i < ITERS; i++) {
  makeFloatFormatter(2);
  makePercentFormatter(1);
  makeCurrencyFormatter("$", 2);
}
const total = performance.now() - t0;
console.log(JSON.stringify({ function: "make_formatter", mean_ms: total / ITERS, iterations: ITERS, total_ms: total }));
