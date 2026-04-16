import { getAttrs, setAttrs, updateAttrs, withAttrs } from "tsb";
import { Series } from "tsb";
const N = 10_000;
const s = new Series(Array.from({ length: N }, (_, i) => i));
const attrs = { unit: "meters", created: "2024-01-01", source: "sensor-1", version: 2 };
const WARMUP = 3;
const ITERS = 100;
for (let i = 0; i < WARMUP; i++) {
  setAttrs(s, attrs);
  getAttrs(s);
  updateAttrs(s, { version: i });
  withAttrs(s, { extra: "x" });
}
const t0 = performance.now();
for (let i = 0; i < ITERS; i++) {
  setAttrs(s, attrs);
  getAttrs(s);
  updateAttrs(s, { version: i });
  withAttrs(s, { extra: "x" });
}
const total = performance.now() - t0;
console.log(JSON.stringify({ function: "attrs_ops", mean_ms: total / ITERS, iterations: ITERS, total_ms: total }));
