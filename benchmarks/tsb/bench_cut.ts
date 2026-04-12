import { cut } from "tsb";
import { Series } from "tsb";

const rng = (seed: number) => { let s = seed; return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return ((s >>> 0) / 0xffffffff) * 2 - 1; }; };
const rand = rng(42);
const data = Array.from({ length: 100_000 }, () => rand() * 3);
const s = new Series(data);
const bins = [-4, -2, -1, 0, 1, 2, 4];
for (let i = 0; i < 3; i++) cut(s, bins);
const N = 50;
const t0 = performance.now();
for (let i = 0; i < N; i++) cut(s, bins);
const elapsed = performance.now() - t0;
console.log(JSON.stringify({ function: "cut", mean_ms: elapsed / N, iterations: N, total_ms: elapsed }));
