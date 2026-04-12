import { Series } from "tsb";

const rng = (seed: number) => { let s = seed; return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; }; };
const rand = rng(42);
const data = Array.from({ length: 100_000 }, () => Math.floor(rand() * 1_000));
const s = new Series(data);
const mapping = new Map(Array.from({ length: 1_000 }, (_, i) => [i, i * 2] as [number, number]));
for (let i = 0; i < 3; i++) s.map(mapping);
const N = 30;
const t0 = performance.now();
for (let i = 0; i < N; i++) s.map(mapping);
const elapsed = performance.now() - t0;
console.log(JSON.stringify({ function: "series_map", mean_ms: elapsed / N, iterations: N, total_ms: elapsed }));
