import { Series } from "tsb";

const rng = (seed: number) => { let s = seed; return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return ((s >>> 0) / 0xffffffff) * 2 - 1; }; };
const rand = rng(42);
const data: (number | null)[] = Array.from({ length: 100_000 }, (_, i) => i % 10 === 0 ? null : rand() * 3);
const s = new Series(data);
for (let i = 0; i < 3; i++) s.interpolate();
const N = 30;
const t0 = performance.now();
for (let i = 0; i < N; i++) s.interpolate();
const elapsed = performance.now() - t0;
console.log(JSON.stringify({ function: "interpolate", mean_ms: elapsed / N, iterations: N, total_ms: elapsed }));
