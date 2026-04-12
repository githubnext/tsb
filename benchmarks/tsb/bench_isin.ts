import { Series } from "tsb";

const rng = (seed: number) => { let s = seed; return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; }; };
const rand = rng(42);
const data = Array.from({ length: 100_000 }, () => Math.floor(rand() * 10_000));
const s = new Series(data);
const testSet = Array.from({ length: 2500 }, (_, i) => i * 4);
for (let i = 0; i < 3; i++) s.isin(testSet);
const N = 50;
const t0 = performance.now();
for (let i = 0; i < N; i++) s.isin(testSet);
const elapsed = performance.now() - t0;
console.log(JSON.stringify({ function: "isin", mean_ms: elapsed / N, iterations: N, total_ms: elapsed }));
