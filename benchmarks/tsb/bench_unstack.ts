import { Series } from "tsb";

const rng = (seed: number) => { let s = seed; return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return ((s >>> 0) / 0xffffffff) * 2 - 1; }; };
const rand = rng(42);
const data = Array.from({ length: 20_000 }, () => rand() * 3);
const index = Array.from({ length: 20_000 }, (_, i) => [Math.floor(i / 20), i % 20] as [number, number]);
const s = new Series(data, { index });
for (let i = 0; i < 3; i++) s.unstack();
const N = 100;
const t0 = performance.now();
for (let i = 0; i < N; i++) s.unstack();
const elapsed = performance.now() - t0;
console.log(JSON.stringify({ function: "unstack", mean_ms: elapsed / N, iterations: N, total_ms: elapsed }));
