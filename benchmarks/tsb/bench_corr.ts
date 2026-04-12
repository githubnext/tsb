import { DataFrame } from "tsb";

const rng = (seed: number) => { let s = seed; return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return ((s >>> 0) / 0xffffffff) * 2 - 1; }; };
const rand = rng(42);
const df = new DataFrame({
  A: Array.from({ length: 10_000 }, () => rand() * 3),
  B: Array.from({ length: 10_000 }, () => rand() * 3),
  C: Array.from({ length: 10_000 }, () => rand() * 3),
  D: Array.from({ length: 10_000 }, () => rand() * 3),
  E: Array.from({ length: 10_000 }, () => rand() * 3),
});
for (let i = 0; i < 3; i++) df.corr();
const N = 50;
const t0 = performance.now();
for (let i = 0; i < N; i++) df.corr();
const elapsed = performance.now() - t0;
console.log(JSON.stringify({ function: "corr", mean_ms: elapsed / N, iterations: N, total_ms: elapsed }));
