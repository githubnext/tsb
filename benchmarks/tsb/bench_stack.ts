import { DataFrame } from "tsb";

const rng = (seed: number) => { let s = seed; return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return ((s >>> 0) / 0xffffffff) * 2 - 1; }; };
const rand = rng(42);
const cols: Record<string, number[]> = {};
for (let i = 0; i < 20; i++) cols["c" + i] = Array.from({ length: 1000 }, () => rand() * 3);
const df = new DataFrame(cols);
for (let i = 0; i < 3; i++) df.stack();
const N = 100;
const t0 = performance.now();
for (let i = 0; i < N; i++) df.stack();
const elapsed = performance.now() - t0;
console.log(JSON.stringify({ function: "stack", mean_ms: elapsed / N, iterations: N, total_ms: elapsed }));
