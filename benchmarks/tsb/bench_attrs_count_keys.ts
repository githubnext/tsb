import { attrsCount, attrsKeys } from "tsb";
import { Series } from "tsb";
const N = 100_000;
const s = new Series(Array.from({ length: N }, (_, i) => i));
const attrs = { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8 };
import { setAttrs } from "tsb";
setAttrs(s, attrs);
const WARMUP = 3;
const ITERS = 10_000;
for (let i = 0; i < WARMUP; i++) {
  attrsCount(s);
  attrsKeys(s);
}
const t0 = performance.now();
for (let i = 0; i < ITERS; i++) {
  attrsCount(s);
  attrsKeys(s);
}
const total = performance.now() - t0;
console.log(JSON.stringify({ function: "attrs_count_keys", mean_ms: total / ITERS, iterations: ITERS, total_ms: total }));
