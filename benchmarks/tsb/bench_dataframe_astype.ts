import { DataFrame } from "tsb";

const rng = (seed: number) => { let s = seed; return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; }; };
const rand = rng(42);
const df = new DataFrame({
  a: Array.from({ length: 100_000 }, () => (rand() * 2 - 1) * 3),
  b: Array.from({ length: 100_000 }, () => Math.floor(rand() * 1000)),
});
for (let i = 0; i < 3; i++) df.astype({ a: "float32", b: "int32" });
const N = 100;
const t0 = performance.now();
for (let i = 0; i < N; i++) df.astype({ a: "float32", b: "int32" });
const elapsed = performance.now() - t0;
console.log(JSON.stringify({ function: "dataframe_astype", mean_ms: elapsed / N, iterations: N, total_ms: elapsed }));
