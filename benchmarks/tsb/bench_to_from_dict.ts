/**
 * Benchmark: toDictOriented / fromDictOriented — DataFrame ↔ dict conversions.
 * Tests all orient variants: "list", "records", "split", "index", "tight".
 * Outputs JSON: {"function": "to_from_dict", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, toDictOriented, fromDictOriented } from "../../src/index.js";

const SIZE = 10_000;
const WARMUP = 5;
const ITERATIONS = 50;

const df = new DataFrame({
  a: Array.from({ length: SIZE }, (_, i) => i),
  b: Array.from({ length: SIZE }, (_, i) => i * 1.5),
  c: Array.from({ length: SIZE }, (_, i) => `str_${i % 100}`),
});

for (let i = 0; i < WARMUP; i++) {
  toDictOriented(df, "list");
  toDictOriented(df, "records");
  toDictOriented(df, "split");
  toDictOriented(df, "index");
  toDictOriented(df, "tight");
  fromDictOriented({ a: [1, 2, 3], b: [4, 5, 6] });
  fromDictOriented({ 0: { a: 1, b: 4 }, 1: { a: 2, b: 5 } }, "index");
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  toDictOriented(df, "list");
  toDictOriented(df, "records");
  toDictOriented(df, "split");
  toDictOriented(df, "index");
  toDictOriented(df, "tight");
  fromDictOriented({ a: [1, 2, 3], b: [4, 5, 6] });
  fromDictOriented({ 0: { a: 1, b: 4 }, 1: { a: 2, b: 5 } }, "index");
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "to_from_dict",
    mean_ms: Math.round((total / ITERATIONS) * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(total * 1000) / 1000,
  }),
);
