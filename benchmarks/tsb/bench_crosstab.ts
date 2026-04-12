import { crosstab } from "tsb";
import { Series } from "tsb";

const rng = (seed: number) => { let s = seed; return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; }; };
const rand = rng(42);
const choices = ["A","B","C","D"];
const choicesB = ["X","Y","Z"];
const a = new Series(Array.from({ length: 10_000 }, () => choices[Math.floor(rand() * 4)]));
const b = new Series(Array.from({ length: 10_000 }, () => choicesB[Math.floor(rand() * 3)]));
for (let i = 0; i < 3; i++) crosstab(a, b);
const N = 30;
const t0 = performance.now();
for (let i = 0; i < N; i++) crosstab(a, b);
const elapsed = performance.now() - t0;
console.log(JSON.stringify({ function: "crosstab", mean_ms: elapsed / N, iterations: N, total_ms: elapsed }));
